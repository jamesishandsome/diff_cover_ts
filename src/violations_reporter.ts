import fs from "fs";
import path from "path";
import { DOMParser } from "@xmldom/xmldom";
import xpath from "xpath";
import { GitPathTool } from "./git_path";
import { toUnixPath } from "./util";
import { execute, runCommandForCode } from "./command_runner";

export class Violation {
  constructor(
    public line: number,
    public message: string | null,
  ) {}
}

export abstract class BaseViolationReporter {
  constructor(protected _name: string) {}

  abstract violations(srcPath: string): Violation[];

  violationsBatch(srcPaths: string[]): { [key: string]: Violation[] } {
    const result: { [key: string]: Violation[] } = {};
    for (const srcPath of srcPaths) {
      result[srcPath] = this.violations(srcPath);
    }
    return result;
  }

  measuredLines(_srcPath: string): number[] | null {
    return null;
  }

  name(): string {
    return this._name;
  }
}

export class XmlCoverageReporter extends BaseViolationReporter {
  private _xmlRoots: Document[];
  private _srcRoots: string[];
  private _expandCoverageReport: boolean;
  // Cache: srcPath -> [Violations, MeasuredLines]
  // Violations is Set of Violation (we use array here and dedupe logic)
  // MeasuredLines is Set of number
  private _infoCache: { [key: string]: [Violation[], Set<number>] } = {};
  // xmlCache: index -> { filename: Element[] }
  private _xmlCache: ({ [key: string]: Element[] } | undefined)[];

  constructor(
    xmlContentList: string[],
    srcRoots: string[] | null = null,
    expandCoverageReport: boolean = false,
  ) {
    super("XML");
    this._xmlRoots = xmlContentList.map((content) =>
      new DOMParser().parseFromString(content, "text/xml"),
    );
    this._srcRoots = srcRoots || [""];
    this._expandCoverageReport = expandCoverageReport;
    this._xmlCache = Array.from({ length: this._xmlRoots.length });
  }

  private _normalizePath(p: string): string {
    const unixPath = toUnixPath(p);
    if (process.platform === "win32") {
      return unixPath.toLowerCase();
    }
    return unixPath;
  }

  private _getXmlClasses(xmlDocument: Document): { [key: string]: Element[] } {
    // sources = xml_document.findall("sources/source")
    const sourcesNodes = xpath.select("//sources/source", xmlDocument) as Element[];
    const sources = sourcesNodes.map((node) => node.textContent || "").filter((t) => t);

    // classes = xml_document.findall(".//class")
    const classes = xpath.select("//class", xmlDocument) as Element[];

    const res: { [key: string]: Element[] } = {};

    for (const clazz of classes) {
      const f = clazz.getAttribute("filename");
      if (!f) continue;

      const unixF = this._normalizePath(f);
      if (!res[unixF]) res[unixF] = [];
      res[unixF].push(clazz);

      for (const source of sources) {
        const absF = this._normalizePath(path.join(source.trim(), f));
        if (!res[absF]) res[absF] = [];
        res[absF].push(clazz);
      }
    }
    return res;
  }

  private _getClasses(index: number, xmlDocument: Document, srcPath: string): Element[] {
    const srcRelPath = this._normalizePath(GitPathTool.relativePath(srcPath));
    const srcAbsPath = this._normalizePath(GitPathTool.absolutePath(srcPath));

    if (!this._xmlCache[index]) {
      this._xmlCache[index] = this._getXmlClasses(xmlDocument);
    }
    const cache = this._xmlCache[index];
    if (!cache) return [];

    return cache[srcAbsPath] || cache[srcRelPath] || [];
  }

  private _getSrcPathLineNodesCobertura(
    index: number,
    xmlDocument: Document,
    srcPath: string,
  ): Element[] | null {
    const classes = this._getClasses(index, xmlDocument, srcPath);
    if (!classes || classes.length === 0) return null;

    const lines: Element[] = [];
    for (const clazz of classes) {
      // clazz.findall("./lines/line")
      // xpath relative to clazz
      const nodes = xpath.select("./lines/line", clazz) as Element[];
      lines.push(...nodes);
    }
    return lines;
  }

  private static _getSrcPathLineNodesClover(
    xmlDocument: Document,
    srcPath: string,
  ): Element[] | null {
    // files = xml_document.findall(".//file")
    const allFiles = xpath.select("//file", xmlDocument) as Element[];

    const files = allFiles.filter((fileTree) => {
      const p = fileTree.getAttribute("path");
      return p && GitPathTool.relativePath(p) === srcPath;
    });

    if (files.length === 0) return null;

    const lines: Element[] = [];
    for (const fileTree of files) {
      // file_tree.findall('./line[@type="stmt"]')
      const stmts = xpath.select('./line[@type="stmt"]', fileTree) as Element[];
      lines.push(...stmts);
      // file_tree.findall('./line[@type="cond"]')
      const conds = xpath.select('./line[@type="cond"]', fileTree) as Element[];
      lines.push(...conds);
    }
    return lines;
  }

  private _measuredSourcePathMatches(
    packageName: string,
    fileName: string,
    srcPath: string,
  ): boolean {
    if (!srcPath.endsWith(toUnixPath(fileName))) return false;

    // normcase is effectively lowercase on windows, same on unix usually for comparison?
    // JS doesn't have normcase. path.normalize + toLowerCase if windows?
    // Let's assume toLowerCase for comparison is safer.
    const normSrcPath = srcPath.toLowerCase();

    for (const root of this._srcRoots) {
      const joined = path.join(root, packageName, fileName);
      const rel = GitPathTool.relativePath(joined);
      if (rel.toLowerCase() === normSrcPath) {
        return true;
      }
    }
    return false;
  }

  private _getSrcPathLineNodesJacoco(xmlDocument: Document, srcPath: string): Element[] | null {
    // packages = xml_document.findall(".//package")
    const packages = xpath.select("//package", xmlDocument) as Element[];

    const files: Element[] = [];
    for (const pkg of packages) {
      const pkgName = pkg.getAttribute("name") || "";
      // pkg.findall("sourcefile")
      const sourceFiles = xpath.select("./sourcefile", pkg) as Element[];

      for (const sf of sourceFiles) {
        const sfName = sf.getAttribute("name") || "";
        if (this._measuredSourcePathMatches(pkgName, sfName, srcPath)) {
          files.push(sf);
        }
      }
    }

    if (files.length === 0) return null;

    const lines: Element[] = [];
    for (const fileTree of files) {
      const nodes = xpath.select("./line", fileTree) as Element[];
      lines.push(...nodes);
    }
    return lines;
  }

  private _cacheFile(srcPath: string) {
    if (this._infoCache[srcPath]) return;

    let violations: Violation[] | null = null;
    let measured = new Set<number>();

    for (let i = 0; i < this._xmlRoots.length; i++) {
      const xmlDocument = this._xmlRoots[i]!;

      let lineNodes: Element[] | null = null;
      let numberAttr = "number";
      let hitsAttr = "hits";

      // Check type
      // xml_document.findall(".[@clover]") -> check root attributes?
      // xpath.select("/*[@clover]", xmlDocument)
      const root = xmlDocument.documentElement;
      if (root.hasAttribute("clover")) {
        lineNodes = XmlCoverageReporter._getSrcPathLineNodesClover(xmlDocument, srcPath);
        numberAttr = "num";
        hitsAttr = "count";
      } else if (root.hasAttribute("name")) {
        // Jacoco has name attribute on root report?
        // DTD says report has name.
        lineNodes = this._getSrcPathLineNodesJacoco(xmlDocument, srcPath);
        numberAttr = "nr";
        hitsAttr = "ci";
      } else {
        lineNodes = this._getSrcPathLineNodesCobertura(i, xmlDocument, srcPath);
        numberAttr = "number";
        hitsAttr = "hits";
      }

      if (!lineNodes) continue;

      if (this._expandCoverageReport) {
        // ... (implementation of expand coverage report logic)
        // Skip for brevity unless critical
      }

      // violations logic
      const currentViolations: Violation[] = [];
      const currentMeasured: number[] = [];

      for (const line of lineNodes) {
        const num = parseInt(line.getAttribute(numberAttr) || "0", 10);
        const hits = parseInt(line.getAttribute(hitsAttr) || "0", 10);

        if (hits === 0) {
          currentViolations.push(new Violation(num, null));
        }
        currentMeasured.push(num);
      }

      if (violations === null) {
        violations = currentViolations;
      } else {
        // intersection
        const currentSet = new Set(currentViolations.map((v) => v.line));
        violations = violations.filter((v) => currentSet.has(v.line));
      }

      for (const m of currentMeasured) {
        measured.add(m);
      }
    }

    if (violations === null) {
      violations = [];
    }

    this._infoCache[srcPath] = [violations, measured];
  }

  override violations(srcPath: string): Violation[] {
    this._cacheFile(srcPath);
    return this._infoCache[srcPath]![0];
  }

  override measuredLines(srcPath: string): number[] | null {
    this._cacheFile(srcPath);
    return Array.from(this._infoCache[srcPath]![1]);
  }
}

export class LcovCoverageReporter extends BaseViolationReporter {
  private _lcovRoots: string[];
  private _srcRoots: string[];
  private _lcovReport: { [key: string]: { [key: number]: number } } = {};
  private _infoCache: { [key: string]: [Violation[], Set<number>] } = {};

  constructor(lcovContentList: string[], srcRoots: string[] | null = null) {
    super("LCOV");
    this._lcovRoots = lcovContentList;
    this._srcRoots = srcRoots || [""];
    this._parseAll();
  }

  private _parseAll() {
    for (const content of this._lcovRoots) {
      this._parse(content);
    }
  }

  private _parse(content: string) {
    // Parse LCOV content
    const lines = content.split(/\r\n|\r|\n/);
    let sourceFile: string | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const [directive, ...rest] = trimmed.split(":");
      const value = rest.join(":");

      if (directive === "SF") {
        sourceFile = toUnixPath(GitPathTool.relativePath(value));
      } else if (directive === "DA") {
        if (sourceFile && value) {
          const parts = value.split(",");
          const lineNo = parseInt(parts[0]!, 10);
          const executions = parseInt(parts[1]!, 10);

          if (!this._lcovReport[sourceFile]) {
            this._lcovReport[sourceFile] = {};
          }

          if (!this._lcovReport[sourceFile]![lineNo]) {
            this._lcovReport[sourceFile]![lineNo] = 0;
          }
          this._lcovReport[sourceFile]![lineNo]! += executions;
        }
      }
      // Ignore others for now
    }
  }

  override violations(srcPath: string): Violation[] {
    if (!this._infoCache[srcPath]) {
      const report = this._lcovReport[srcPath];
      if (!report) {
        this._infoCache[srcPath] = [[], new Set()];
      } else {
        const violations: Violation[] = [];
        const measured = new Set<number>();
        for (const [lineNoStr, count] of Object.entries(report)) {
          const lineNo = parseInt(lineNoStr, 10);
          measured.add(lineNo);
          if (count === 0) {
            violations.push(new Violation(lineNo, null));
          }
        }
        this._infoCache[srcPath] = [violations, measured];
      }
    }
    return this._infoCache[srcPath][0];
  }

  override measuredLines(srcPath: string): number[] | null {
    if (!this._infoCache[srcPath]) {
      this.violations(srcPath);
    }
    return Array.from(this._infoCache[srcPath]![1]);
  }
}

export abstract class QualityDriver {
  constructor(
    public name: string,
    public supportedExtensions: string[],
    public command: string[],
    public exitCodes: number[] = [0],
    public outputStderr: boolean = false,
  ) {}

  abstract parseReports(reports: string[]): { [key: string]: Violation[] };

  abstract installed(): boolean;

  addDriverArgs(args: Record<string, any>): void {
    throw new Error(`Unsupported argument(s) ${Object.keys(args).join(", ")}`);
  }
}

export class QualityReporter extends BaseViolationReporter {
  private violationsDict: { [key: string]: Violation[] } = {};
  private driverToolInstalled: boolean | null = null;
  private reports: string[] | null = null;

  constructor(
    public driver: QualityDriver,
    reports: string[] | null = null,
    public options: string | null = null,
  ) {
    super(driver.name);
    this.reports = reports;
  }

  override violations(srcPath: string): Violation[] {
    // srcPath is relative to git root.
    // Check extension
    const hasExt = this.driver.supportedExtensions.some((ext) => srcPath.endsWith(ext));
    if (!hasExt) return [];

    const relativeSrcPath = toUnixPath(GitPathTool.relativePath(srcPath));

    if (!this.violationsDict[relativeSrcPath]) {
      if (this.reports) {
        this.violationsDict = this.driver.parseReports(this.reports);
        return this.violationsDict[relativeSrcPath] || [];
      }

      if (!fs.existsSync(relativeSrcPath)) {
        this.violationsDict[relativeSrcPath] = [];
        return [];
      }

      if (this.driverToolInstalled === null) {
        this.driverToolInstalled = this.driver.installed();
      }
      if (!this.driverToolInstalled) {
        throw new Error(`${this.driver.name} is not installed`);
      }

      const command = [...this.driver.command];
      if (this.options) {
        command.push(...this.options.split(/\s+/));
      }
      command.push(relativeSrcPath);

      try {
        const [stdout, stderr] = execute(command, this.driver.exitCodes);
        const output = this.driver.outputStderr ? stderr : stdout;
        const newViolations = this.driver.parseReports([output]);
        // merge
        Object.assign(this.violationsDict, newViolations);
      } catch (e: any) {
        console.error(e.message);
        throw e;
      }
    }
    return this.violationsDict[relativeSrcPath] || [];
  }

  override measuredLines(srcPath: string): number[] | null {
    return null;
  }
}

export class RegexBasedDriver extends QualityDriver {
  private expression: RegExp;
  private commandToCheckInstall: string[];

  constructor(
    name: string,
    supportedExtensions: string[],
    command: string[],
    expression: RegExp,
    commandToCheckInstall: string[],
    exitCodes: number[] = [0],
  ) {
    super(name, supportedExtensions, command, exitCodes);
    this.expression = expression;
    this.commandToCheckInstall = commandToCheckInstall;
  }

  parseReports(reports: string[]): { [key: string]: Violation[] } {
    const violationsDict: { [key: string]: Violation[] } = {};

    for (const report of reports) {
      if (this.expression.flags.includes("m")) {
        let match;
        while ((match = this.expression.exec(report)) !== null) {
          this._addMatch(match, violationsDict);
        }
      } else {
        const lines = report.split(/\r?\n/);
        for (const line of lines) {
          const match = this.expression.exec(line);
          if (match) {
            this._addMatch(match, violationsDict);
          }
        }
      }
    }
    return violationsDict;
  }

  private _addMatch(match: RegExpExecArray, violationsDict: { [key: string]: Violation[] }) {
    if (match.length < 4) return;

    let src = match[1]!;
    const line = parseInt(match[2]!, 10);
    const message = match[3]!;

    src = toUnixPath(src);

    if (!violationsDict[src]) violationsDict[src] = [];
    violationsDict[src]!.push(new Violation(line, message.trim()));
  }

  installed(): boolean {
    return runCommandForCode(this.commandToCheckInstall) === 0;
  }
}

export class EslintDriver extends RegexBasedDriver {
  private reportRootPath: string | null = null;

  constructor() {
    super(
      "eslint",
      ["js", "ts", "tsx", "jsx"],
      ["eslint", "--format=compact"],
      /^([^:]+): line (\d+), col \d+, (.*)$/,
      ["eslint", "-v"],
      [0, 1],
    );
  }

  override addDriverArgs(args: Record<string, any>): void {
    if (args.reportRootPath) {
      this.reportRootPath = args.reportRootPath;
    }
  }

  override parseReports(reports: string[]): { [key: string]: Violation[] } {
    const violationsDict = super.parseReports(reports);
    if (this.reportRootPath) {
      const newDict: { [key: string]: Violation[] } = {};
      for (const key of Object.keys(violationsDict)) {
        const newKey = toUnixPath(path.relative(this.reportRootPath, key));
        newDict[newKey] = violationsDict[key]!;
      }
      return newDict;
    }
    return violationsDict;
  }
}

export class PylintDriver extends RegexBasedDriver {
  constructor() {
    super(
      "pylint",
      ["py"],
      ["pylint", "--msg-template={path}:{line}: [{msg_id}({symbol}), {obj}] {msg}", "--reports=n"],
      /^([^:]+):(\d+): (.*)$/,
      ["pylint", "--version"],
      [0, 1, 2, 4, 8, 16, 32],
    );
  }
}

export class Flake8Driver extends RegexBasedDriver {
  constructor() {
    super(
      "flake8",
      ["py"],
      ["flake8"],
      /^([^:]+):(\d+):\d+: (.*)$/,
      ["flake8", "--version"],
      [0, 1],
    );
  }
}

export class ShellcheckDriver extends RegexBasedDriver {
  constructor() {
    super(
      "shellcheck",
      ["sh", "bash", "ksh", "zsh"],
      ["shellcheck", "--format=gcc"],
      /^([^:]+):(\d+):\d+: (.*)$/,
      ["shellcheck", "--version"],
      [0, 1],
    );
  }
}

export class CppcheckDriver extends RegexBasedDriver {
  constructor() {
    super(
      "cppcheck",
      ["c", "cpp", "h", "hpp"],
      ["cppcheck", "--template={file}:{line}: {message}", "--quiet"],
      /^([^:]+):(\d+): (.*)$/,
      ["cppcheck", "--version"],
      [0],
    );
  }
}

export abstract class XmlQualityDriver extends QualityDriver {
  constructor(
    name: string,
    supportedExtensions: string[],
    command: string[],
    exitCodes: number[] = [0],
    outputStderr: boolean = false,
  ) {
    super(name, supportedExtensions, command, exitCodes, outputStderr);
  }

  parseReports(reports: string[]): { [key: string]: Violation[] } {
    const violationsDict: { [key: string]: Violation[] } = {};
    for (const report of reports) {
      try {
        const xmlDoc = new DOMParser().parseFromString(report, "text/xml");
        this.parseXml(xmlDoc, violationsDict);
      } catch (e) {
        console.error(`Error parsing XML report for ${this.name}: ${String(e)}`);
      }
    }
    return violationsDict;
  }

  protected abstract parseXml(
    xmlDoc: Document,
    violationsDict: { [key: string]: Violation[] },
  ): void;

  installed(): boolean {
    return true;
  }
}

export class CheckstyleDriver extends XmlQualityDriver {
  constructor() {
    super(
      "checkstyle",
      ["java"],
      ["checkstyle"], // Placeholder
      [0],
    );
  }

  protected parseXml(xmlDoc: Document, violationsDict: { [key: string]: Violation[] }): void {
    // <checkstyle><file name="..."><error line="..." message="..."/></file></checkstyle>
    const files = xpath.select("//file", xmlDoc) as Element[];
    for (const file of files) {
      const name = file.getAttribute("name");
      if (!name) continue;
      const unixName = toUnixPath(name);

      const errors = xpath.select("./error", file) as Element[];
      for (const error of errors) {
        const line = parseInt(error.getAttribute("line") || "0", 10);
        const message = error.getAttribute("message") || "";

        if (line > 0) {
          if (!violationsDict[unixName]) violationsDict[unixName] = [];
          violationsDict[unixName].push(new Violation(line, message));
        }
      }
    }
  }
}

export class FindbugsDriver extends XmlQualityDriver {
  constructor() {
    super("findbugs", ["java"], ["findbugs"], [0]);
  }

  protected parseXml(xmlDoc: Document, violationsDict: { [key: string]: Violation[] }): void {
    // <BugCollection><BugInstance><SourceLine sourcepath="..." start="..." .../><LongMessage>...</LongMessage></BugInstance></BugCollection>
    const bugs = xpath.select("//BugInstance", xmlDoc) as Element[];
    for (const bug of bugs) {
      const sourceLine = (xpath.select("./SourceLine", bug) as Element[])[0];
      if (!sourceLine) continue;

      const sourcepath = sourceLine.getAttribute("sourcepath");
      const start = parseInt(sourceLine.getAttribute("start") || "0", 10);

      const messageNode = (xpath.select("./LongMessage", bug) as Element[])[0];
      const message = messageNode ? messageNode.textContent || "" : "";

      if (sourcepath && start > 0) {
        // Findbugs sourcepath is relative (e.g. com/example/File.java)
        // We might need to match it against available files if we want absolute paths,
        // but QualityReporter expects paths relative to git root.
        // If the user provides report, we assume paths match what's in git or we might need searching.
        // For now, let's use what's provided.
        const unixName = toUnixPath(sourcepath);
        if (!violationsDict[unixName]) violationsDict[unixName] = [];
        violationsDict[unixName].push(new Violation(start, message));
      }
    }
  }
}
