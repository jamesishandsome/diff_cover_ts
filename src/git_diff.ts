import fs from "fs";
import { execute, CommandError } from "./command_runner";
import { toUnescapedFilename } from "./util";

export class GitDiffError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitDiffError";
  }
}

export class GitDiffTool {
  private _untrackedCache: string[] | null = null;
  public rangeNotation: string;
  private _defaultGitArgs: string[];
  private _defaultDiffArgs: string[];

  constructor(rangeNotation: string, ignoreWhitespace: boolean) {
    this.rangeNotation = rangeNotation;
    this._defaultGitArgs = ["git", "-c", "diff.mnemonicprefix=no", "-c", "diff.noprefix=no"];
    this._defaultDiffArgs = ["diff", "--no-color", "--no-ext-diff", "-U0"];

    if (ignoreWhitespace) {
      this._defaultDiffArgs.push("--ignore-all-space");
      this._defaultDiffArgs.push("--ignore-blank-lines");
    }
  }

  diffCommitted(compareBranch: string = "origin/main"): string {
    const diffRange = `${compareBranch}${this.rangeNotation}HEAD`;
    try {
      const command = [...this._defaultGitArgs, ...this._defaultDiffArgs, diffRange];
      return execute(command)[0];
    } catch (e: any) {
      if (e instanceof CommandError && e.message.includes("unknown revision")) {
        throw new Error(
          `Could not find the branch to compare to. Does '${compareBranch}' exist?\n` +
            `the \`--compare-branch\` argument allows you to set a different branch.`,
        );
      }
      throw e;
    }
  }

  diffUnstaged(): string {
    const command = [...this._defaultGitArgs, ...this._defaultDiffArgs];
    return execute(command)[0];
  }

  diffStaged(): string {
    const command = [...this._defaultGitArgs, ...this._defaultDiffArgs, "--cached"];
    return execute(command)[0];
  }

  untracked(): string[] {
    if (this._untrackedCache !== null) {
      return this._untrackedCache;
    }

    const command = ["git", "ls-files", "--exclude-standard", "--others"];
    const output = execute(command)[0];

    this._untrackedCache = [];
    if (output) {
      this._untrackedCache = output
        .replace(/\r\n/g, "\n")
        .split("\n")
        .filter((line) => line.length > 0)
        .map((line) => toUnescapedFilename(line));
    }
    return this._untrackedCache;
  }
}

export class GitDiffFileTool extends GitDiffTool {
  private diffFilePath: string;

  constructor(diffFilePath: string) {
    super("...", false);
    this.diffFilePath = diffFilePath;
  }

  override diffCommitted(compareBranch: string = "origin/main"): string {
    try {
      return fs.readFileSync(this.diffFilePath, "utf-8");
    } catch {
      throw new Error(`Could not read the diff file. Make sure '${this.diffFilePath}' exists?`);
    }
  }

  override diffUnstaged(): string {
    return "";
  }

  override diffStaged(): string {
    return "";
  }

  override untracked(): string[] {
    return [];
  }
}
