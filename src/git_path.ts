import path from "path";
import { execute } from "./command_runner";
import { toUnixPath } from "./util";

export class GitPathTool {
  private static _cwd: string | null = null;
  private static _root: string | null = null;

  static setCwd(cwd: string | null) {
    if (!cwd) {
      cwd = process.cwd();
    }
    this._cwd = cwd;
    this._root = this._gitRoot();
  }

  static relativePath(gitDiffPath: string): string {
    // If GitPathTool hasn't been initialized, return the path unchanged
    if (this._cwd === null || this._root === null) {
      return gitDiffPath;
    }

    // git_diff_path is relative to git root.
    // We want to make it relative to cwd.

    // Example:
    // root: /project
    // cwd: /project/subdir
    // gitDiffPath: subdir/file.ts

    // rootRelPath (cwd relative to root): subdir
    // path.relative('subdir', 'subdir/file.ts') -> file.ts

    const rootRelPath = path.relative(this._root, this._cwd);
    return path.relative(rootRelPath, gitDiffPath);
  }

  static absolutePath(srcPath: string): string {
    // Returns absolute git_diff_path
    if (this._root === null) {
      // Fallback if not initialized, though usage implies it should be.
      return toUnixPath(path.resolve(srcPath));
    }
    return toUnixPath(path.join(this._root, srcPath));
  }

  private static _gitRoot(): string {
    const command = ["git", "rev-parse", "--show-toplevel"];
    try {
      const [gitRoot] = execute(command);
      return gitRoot ? gitRoot.split("\n")[0]!.trim() : "";
    } catch {
      return "";
    }
  }
}
