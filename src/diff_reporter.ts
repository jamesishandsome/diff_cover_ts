import fs from "fs";
import path from "path";
import { minimatch } from "minimatch";
import { GitDiffTool, GitDiffError } from "./git_diff";
import { toUnixPath } from "./util";

export abstract class BaseDiffReporter {
  protected _name: string;
  protected _exclude: string[] | null;
  protected _include: string[] | null;

  constructor(name: string, exclude: string[] | null = null, include: string[] | null = null) {
    this._name = name;
    this._exclude = exclude;
    this._include = include;
  }

  abstract srcPathsChanged(): string[];
  abstract linesChanged(srcPath: string): number[];

  name(): string {
    return this._name;
  }

  protected _fnmatch(
    filename: string,
    patterns: string[] | null,
    defaultValue: boolean = true,
  ): boolean {
    if (!patterns || patterns.length === 0) {
      return defaultValue;
    }
    return patterns.some((pattern) => minimatch(filename, pattern));
  }

  protected isPathExcluded(p: string): boolean {
    const include = this._include;
    if (include) {
      let isIncluded = false;
      for (const pattern of include) {
        if (minimatch(p, pattern)) {
          isIncluded = true;
          break;
        }
      }
      if (!isIncluded) {
        return true;
      }
    }

    const exclude = this._exclude;
    if (!exclude) {
      return false;
    }

    const basename = path.basename(p);
    if (this._fnmatch(basename, exclude)) {
      return true;
    }

    const absolutePath = path.resolve(p);
    return this._fnmatch(absolutePath, exclude);
  }
}

export class GitDiffReporter extends BaseDiffReporter {
  private _compareBranch: string;
  private _gitDiffTool: GitDiffTool | null;
  private _ignoreStaged: boolean;
  private _ignoreUnstaged: boolean;
  private _includeUntracked: boolean;
  private _supportedExtensions: string[] | null;
  private _diffDict: { [key: string]: number[] } | null = null;

  constructor(
    compareBranch: string = "origin/main",
    gitDiff: GitDiffTool | null = null,
    ignoreStaged: boolean = false,
    ignoreUnstaged: boolean = false,
    includeUntracked: boolean = false,
    supportedExtensions: string[] | null = null,
    exclude: string[] | null = null,
    include: string[] | null = null,
  ) {
    const options: string[] = [];
    if (!ignoreStaged) options.push("staged");
    if (!ignoreUnstaged) options.push("unstaged");
    if (includeUntracked) options.push("untracked");

    const rangeNotation = (gitDiff as any)?.rangeNotation || "...";
    let name = `${compareBranch}${rangeNotation}HEAD`;

    if (options.length > 0) {
      const prefix = options.slice(0, -1).join(", ");
      const last = options[options.length - 1];
      if (prefix) {
        name += `, ${prefix} and ${last} changes`;
      } else {
        name += ` and ${last} changes`;
      }
    }

    super(name, exclude, include);

    this._compareBranch = compareBranch;
    this._gitDiffTool = gitDiff;
    this._ignoreStaged = ignoreStaged;
    this._ignoreUnstaged = ignoreUnstaged;
    this._includeUntracked = includeUntracked;
    this._supportedExtensions = supportedExtensions;
  }

  clearCache() {
    this._diffDict = null;
  }

  srcPathsChanged(): string[] {
    const diffDict = this._gitDiff();

    if (this._includeUntracked && this._gitDiffTool) {
      for (const p of this._gitDiffTool.untracked()) {
        if (!this._validatePathToDiff(p)) {
          continue;
        }
        const numLines = GitDiffReporter._getFileLines(p);
        diffDict[p] = Array.from({ length: numLines }, (_, i) => i + 1);
      }
    }

    return Object.keys(diffDict).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }

  linesChanged(srcPath: string): number[] {
    const diffDict = this._gitDiff();
    return diffDict[toUnixPath(srcPath)] || [];
  }

  private static _getFileLines(p: string): number {
    try {
      const content = fs.readFileSync(p, "utf-8");
      const lines = content.split(/\r\n|\r|\n/);
      if (lines.length > 0 && lines[lines.length - 1] === "") {
        return lines.length - 1;
      }
      return lines.length;
    } catch {
      return 0;
    }
  }

  private _getIncludedDiffResults(): string[] {
    if (!this._gitDiffTool) return [];

    const included: string[] = [this._gitDiffTool.diffCommitted(this._compareBranch)];
    if (!this._ignoreStaged) {
      included.push(this._gitDiffTool.diffStaged());
    }
    if (!this._ignoreUnstaged) {
      included.push(this._gitDiffTool.diffUnstaged());
    }
    return included;
  }

  private _gitDiff(): { [key: string]: number[] } {
    if (this._diffDict === null) {
      const resultDict: { [key: string]: number[] } = {};

      for (const diffStr of this._getIncludedDiffResults()) {
        const diffDict = this._parseDiffStr(diffStr);

        for (const [srcPathRaw, [addedLines, deletedLines]] of Object.entries(diffDict)) {
          let srcPath = toUnixPath(srcPathRaw);
          if (!this._validatePathToDiff(srcPath)) {
            continue;
          }

          const existing = resultDict[srcPath] || [];
          const filtered = existing.filter((line) => !deletedLines.includes(line));
          resultDict[srcPath] = [...filtered, ...addedLines];
        }
      }

      for (const key in resultDict) {
        resultDict[key] = this._uniqueOrderedLines(resultDict[key]!);
      }

      this._diffDict = resultDict;
    }
    return this._diffDict;
  }

  private _validatePathToDiff(srcPath: string): boolean {
    if (this.isPathExcluded(srcPath)) {
      return false;
    }

    const ext = path.extname(srcPath).slice(1).toLowerCase();
    if (this._supportedExtensions && !this._supportedExtensions.includes(ext)) {
      return false;
    }
    return true;
  }

  private static SRC_FILE_RE = /^diff --git "?a\/.*"? "?b\/([^"\n]*)"?/;
  private static MERGE_CONFLICT_RE = /^diff --cc ([^\n]*)/;
  private static HUNK_LINE_RE = /\+([0-9]*)/;

  private _parseDiffStr(diffStr: string): { [key: string]: [number[], number[]] } {
    const diffDict: { [key: string]: [number[], number[]] } = {};
    const sectionsDict = this._parseSourceSections(diffStr);

    for (const [srcPath, diffLines] of Object.entries(sectionsDict)) {
      diffDict[srcPath] = this._parseLines(diffLines);
    }
    return diffDict;
  }

  private _parseSourceSections(diffStr: string): { [key: string]: string[] } {
    const sourceDict: { [key: string]: string[] } = {};
    let srcPath: string | null = null;
    let foundHunk = false;

    const lines = diffStr.split(/\r\n|\r|\n/);
    for (let line of lines) {
      line = line.trimEnd();

      if (line.startsWith("diff --git") || line.startsWith("diff --cc")) {
        srcPath = this._parseSourceLine(line);
        if (!sourceDict[srcPath]) {
          sourceDict[srcPath] = [];
        }
        foundHunk = false;
      } else if (foundHunk || line.startsWith("@@")) {
        foundHunk = true;
        if (srcPath !== null) {
          sourceDict[srcPath]!.push(line);
        } else if (line.startsWith("@@")) {
          // Note: original raises GitDiffError, but sometimes output might be malformed?
          // Let's strict follow python
          throw new GitDiffError(`Hunk has no source file: '${line}'`);
        }
      }
    }
    return sourceDict;
  }

  private _parseLines(diffLines: string[]): [number[], number[]] {
    const addedLines: number[] = [];
    const deletedLines: number[] = [];

    let currentLineNew: number | null = null;
    let currentLineOld: number | null = null;

    for (const line of diffLines) {
      if (line.startsWith("@@")) {
        const lineNum = this._parseHunkLine(line);
        currentLineNew = lineNum;
        currentLineOld = lineNum;
      } else if (line.startsWith("+")) {
        if (currentLineNew !== null) {
          addedLines.push(currentLineNew);
          currentLineNew++;
        }
      } else if (line.startsWith("-")) {
        if (currentLineOld !== null) {
          deletedLines.push(currentLineOld);
          currentLineOld++;
        }
      } else {
        if (currentLineOld !== null) currentLineOld++;
        if (currentLineNew !== null) currentLineNew++;
      }
    }
    return [addedLines, deletedLines];
  }

  private _parseSourceLine(line: string): string {
    let regex: RegExp;
    if (line.includes("--git")) {
      regex = GitDiffReporter.SRC_FILE_RE;
    } else if (line.includes("--cc")) {
      regex = GitDiffReporter.MERGE_CONFLICT_RE;
    } else {
      throw new GitDiffError(`Do not recognize format of source in line '${line}'`);
    }

    const match = line.match(regex);
    if (match && match[1]) {
      return match[1];
    }

    throw new GitDiffError(`Could not parse source path in line '${line}'`);
  }

  private _parseHunkLine(line: string): number {
    const components = line.split("@@");
    if (components.length >= 2) {
      const hunkInfo = components[1]!;
      const match = hunkInfo.match(GitDiffReporter.HUNK_LINE_RE);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num)) {
          return num;
        }
      }
      throw new GitDiffError(`Could not parse hunk in line '${line}'`);
    }
    throw new GitDiffError(`Could not parse hunk in line '${line}'`);
  }

  private _uniqueOrderedLines(lineNumbers: number[]): number[] {
    if (lineNumbers.length === 0) return [];
    return Array.from(new Set(lineNumbers)).sort((a, b) => a - b);
  }
}
