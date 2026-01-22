import { Writable } from "stream";
import * as path from "path";
import { fileURLToPath } from "url";
import nunjucks from "nunjucks";
import { BaseViolationReporter, Violation } from "./violations_reporter";
import { BaseDiffReporter } from "./diff_reporter";
import { Snippet } from "./snippets";
import { toUnixPath } from "./util";

class DiffViolations {
  lines: Set<number>;
  violations: Set<Violation>;
  measured_lines: Set<number>;

  constructor(violations: Violation[], measured_lines: number[] | null, diff_lines: number[]) {
    const diffLinesSet = new Set(diff_lines);

    const violationLinesSet = new Set(violations.map((v) => v.line));

    // Intersection of violation lines and diff lines
    this.lines = new Set([...violationLinesSet].filter((x) => diffLinesSet.has(x)));

    this.violations = new Set(violations.filter((v) => this.lines.has(v.line)));

    if (measured_lines === null) {
      this.measured_lines = new Set(diff_lines);
    } else {
      const measuredLinesSet = new Set(measured_lines);
      this.measured_lines = new Set([...measuredLinesSet].filter((x) => diffLinesSet.has(x)));
    }
  }
}

export abstract class BaseReportGenerator {
  protected _violations: BaseViolationReporter;
  protected _diff: BaseDiffReporter;
  protected _total_percent_float: boolean;
  protected _diff_violations_dict: { [key: string]: DiffViolations } | null = null;

  constructor(
    violations_reporter: BaseViolationReporter,
    diff_reporter: BaseDiffReporter,
    total_percent_float: boolean = false,
  ) {
    this._violations = violations_reporter;
    this._diff = diff_reporter;
    this._total_percent_float = total_percent_float;
  }

  abstract generateReport(outputFile: Writable): void;

  coverageReportName(): string {
    return this._violations.name();
  }

  diffReportName(): string {
    return this._diff.name();
  }

  srcPaths(): string[] {
    const paths: string[] = [];
    const diffViolations = this._diffViolations();
    for (const [src, summary] of Object.entries(diffViolations)) {
      if (summary.measured_lines.size > 0) {
        paths.push(src);
      }
    }
    return paths;
  }

  percentCovered(srcPath: string): number | null {
    const diffViolations = this._diffViolations()[srcPath];
    if (!diffViolations) return null;

    const numMeasured = diffViolations.measured_lines.size;
    if (numMeasured > 0) {
      const numUncovered = diffViolations.lines.size;
      return 100 - (numUncovered / numMeasured) * 100;
    }
    return null;
  }

  coveredLines(srcPath: string): number[] {
    const diffViolations = this._diffViolations()[srcPath];
    if (!diffViolations) return [];

    const violationLines = new Set(this.violationLines(srcPath));
    const covered = [...diffViolations.measured_lines].filter((x) => !violationLines.has(x));
    return covered.sort((a, b) => a - b);
  }

  violationLines(srcPath: string): number[] {
    const diffViolations = this._diffViolations()[srcPath];
    if (!diffViolations) return [];
    return [...diffViolations.lines].sort((a, b) => a - b);
  }

  totalNumLines(): number {
    let total = 0;
    for (const summary of Object.values(this._diffViolations())) {
      total += summary.measured_lines.size;
    }
    return total;
  }

  totalNumViolations(): number {
    let total = 0;
    for (const summary of Object.values(this._diffViolations())) {
      total += summary.lines.size;
    }
    return total;
  }

  totalPercentCovered(): number {
    const totalLines = this.totalNumLines();
    if (totalLines > 0) {
      const numCovered = totalLines - this.totalNumViolations();
      const totalPercent = (numCovered / totalLines) * 100;
      if (this._total_percent_float) {
        return Math.round(totalPercent * 100) / 100;
      }
      return Math.floor(totalPercent);
    }
    return this._total_percent_float ? 100.0 : 100;
  }

  numChangedLines(): number {
    let total = 0;
    for (const srcPath of this._diff.srcPathsChanged()) {
      total += this._diff.linesChanged(srcPath).length;
    }
    return total;
  }

  protected _diffViolations(): { [key: string]: DiffViolations } {
    if (!this._diff_violations_dict) {
      const srcPathsChanged = this._diff.srcPathsChanged();
      this._diff_violations_dict = {};

      try {
        // Try batch optimization if available (implied by Python code structure)
        // In TS violationsBatch returns { [srcPath]: Violation[] }
        const violationsBatch = this._violations.violationsBatch(srcPathsChanged);
        for (const srcPath of srcPathsChanged) {
          const unixPath = toUnixPath(srcPath);
          // Use unixPath as key to match Python behavior
          this._diff_violations_dict[unixPath] = new DiffViolations(
            violationsBatch[srcPath] || [],
            this._violations.measuredLines(srcPath),
            this._diff.linesChanged(srcPath),
          );
        }
      } catch {
        for (const srcPath of srcPathsChanged) {
          const unixPath = toUnixPath(srcPath);
          this._diff_violations_dict[unixPath] = new DiffViolations(
            this._violations.violations(srcPath),
            this._violations.measuredLines(srcPath),
            this._diff.linesChanged(srcPath),
          );
        }
      }
    }
    return this._diff_violations_dict;
  }

  reportDict(): any {
    const srcStats: { [key: string]: any } = {};
    for (const src of this.srcPaths()) {
      srcStats[src] = this._srcPathStats(src);
    }
    return {
      report_name: this.coverageReportName(),
      diff_name: this.diffReportName(),
      src_stats: srcStats,
      total_num_lines: this.totalNumLines(),
      total_num_violations: this.totalNumViolations(),
      total_percent_covered: this.totalPercentCovered(),
      num_changed_lines: this.numChangedLines(),
    };
  }

  protected _srcPathStats(srcPath: string): any {
    const coveredLines = this.coveredLines(srcPath);
    const violationLines = this.violationLines(srcPath);
    const diffViolations = this._diffViolations()[srcPath]!;
    const violations = [...diffViolations.violations].sort((a, b) => a.line - b.line);

    return {
      percent_covered: this.percentCovered(srcPath),
      violation_lines: violationLines,
      covered_lines: coveredLines,
      violations: violations.map((v) => [v.line, v.message]),
    };
  }
}

// Configure Nunjucks environment
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_LOADER = new nunjucks.FileSystemLoader(path.join(__dirname, "..", "templates"));
const TEMPLATE_ENV = new nunjucks.Environment(TEMPLATE_LOADER, {
  autoescape: true,
  trimBlocks: true,
  lstripBlocks: true,
});

// Add dictsort filter
TEMPLATE_ENV.addFilter("dictsort", function (obj: any) {
  if (!obj) return [];
  const entries = Object.entries(obj);
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  return entries;
});

export class JsonReportGenerator extends BaseReportGenerator {
  generateReport(outputFile: Writable): void {
    const jsonReportStr = JSON.stringify(this.reportDict());
    outputFile.write(jsonReportStr);
  }
}

export class TemplateReportGenerator extends BaseReportGenerator {
  templatePath: string | null = null;
  cssTemplatePath: string | null = null;
  includeSnippets: boolean = false;
  cssUrl: string | null;

  constructor(
    violationsReporter: BaseViolationReporter,
    diffReporter: BaseDiffReporter,
    cssUrl: string | null = null,
    totalPercentFloat: boolean = false,
  ) {
    super(violationsReporter, diffReporter, totalPercentFloat);
    this.cssUrl = cssUrl;
  }

  generateReport(outputFile: Writable): void {
    if (this.templatePath) {
      const context = this._context();
      const report = TEMPLATE_ENV.render(this.templatePath, context);
      outputFile.write(report);
    }
  }

  generateCss(outputFile: Writable): void {
    if (this.cssTemplatePath) {
      const context = this._context();
      const style = TEMPLATE_ENV.render(this.cssTemplatePath, context);
      outputFile.write(style);
    }
  }

  protected _context(): any {
    let snippetStyle: string | null = null;
    if (this.includeSnippets) {
      snippetStyle = Snippet.styleDefs();
    }

    const context = this.reportDict();
    context.css_url = this.cssUrl;
    context.snippet_style = snippetStyle;
    return context;
  }

  static combineAdjacentLines(lineNumbers: number[]): string[] {
    const combinedList: string[] = [];

    if (lineNumbers.length === 0) return [];

    // Sort just in case
    lineNumbers.sort((a, b) => a - b);

    let start = lineNumbers[0]!;
    let end: number | null = null;

    for (let i = 1; i < lineNumbers.length; i++) {
      const lineNum = lineNumbers[i]!;
      if ((end !== null ? end : start) + 1 === lineNum) {
        end = lineNum;
      } else {
        if (end !== null) {
          combinedList.push(`${start}-${end}`);
        } else {
          combinedList.push(String(start));
        }
        start = lineNum;
        end = null;
      }
    }

    // Final flush
    if (end !== null) {
      combinedList.push(`${start}-${end}`);
    } else {
      combinedList.push(String(start));
    }

    return combinedList;
  }

  protected override _srcPathStats(srcPath: string): any {
    const stats = super._srcPathStats(srcPath);

    const formattedSnippets: { html: string[]; markdown: string[]; terminal: string[] } = {
      html: [],
      markdown: [],
      terminal: [],
    };

    if (this.includeSnippets) {
      try {
        const snippets = Snippet.loadFormattedSnippets(srcPath, stats.violation_lines);
        formattedSnippets.html = snippets.html;
        formattedSnippets.markdown = snippets.markdown;
        formattedSnippets.terminal = snippets.terminal;
      } catch {
        // Suppress error
      }
    }

    stats.snippets_html = formattedSnippets.html;
    stats.snippets_markdown = formattedSnippets.markdown;
    stats.snippets_terminal = formattedSnippets.terminal;
    stats.violation_lines = TemplateReportGenerator.combineAdjacentLines(stats.violation_lines);

    return stats;
  }
}

export class StringReportGenerator extends TemplateReportGenerator {
  constructor(
    violationsReporter: BaseViolationReporter,
    diffReporter: BaseDiffReporter,
    showUncovered: boolean = false,
    totalPercentFloat: boolean = false,
  ) {
    super(violationsReporter, diffReporter, null, totalPercentFloat);
    this.templatePath = "console_coverage_report.txt";
    this.includeSnippets = showUncovered;
  }
}

export class HtmlReportGenerator extends TemplateReportGenerator {
  constructor(
    violationsReporter: BaseViolationReporter,
    diffReporter: BaseDiffReporter,
    cssUrl: string | null = null,
    totalPercentFloat: boolean = false,
  ) {
    super(violationsReporter, diffReporter, cssUrl, totalPercentFloat);
    this.templatePath = "html_coverage_report.html";
    this.cssTemplatePath = "external_style.css";
    this.includeSnippets = true;
  }
}

export class MarkdownReportGenerator extends TemplateReportGenerator {
  constructor(
    violationsReporter: BaseViolationReporter,
    diffReporter: BaseDiffReporter,
    totalPercentFloat: boolean = false,
  ) {
    super(violationsReporter, diffReporter, null, totalPercentFloat);
    this.templatePath = "markdown_coverage_report.md";
    this.includeSnippets = true;
  }
}

export class StringQualityReportGenerator extends TemplateReportGenerator {
  constructor(
    violationsReporter: BaseViolationReporter,
    diffReporter: BaseDiffReporter,
    totalPercentFloat: boolean = false,
  ) {
    super(violationsReporter, diffReporter, null, totalPercentFloat);
    this.templatePath = "console_quality_report.txt";
  }
}

export class HtmlQualityReportGenerator extends TemplateReportGenerator {
  constructor(
    violationsReporter: BaseViolationReporter,
    diffReporter: BaseDiffReporter,
    cssUrl: string | null = null,
    totalPercentFloat: boolean = false,
  ) {
    super(violationsReporter, diffReporter, cssUrl, totalPercentFloat);
    this.templatePath = "html_quality_report.html";
    this.cssTemplatePath = "external_style.css";
    this.includeSnippets = true;
  }
}

export class MarkdownQualityReportGenerator extends TemplateReportGenerator {
  constructor(
    violationsReporter: BaseViolationReporter,
    diffReporter: BaseDiffReporter,
    totalPercentFloat: boolean = false,
  ) {
    super(violationsReporter, diffReporter, null, totalPercentFloat);
    this.templatePath = "markdown_quality_report.md";
    this.includeSnippets = true;
  }
}
