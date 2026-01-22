import { describe, it, expect, beforeAll, jest, beforeEach } from "bun:test";
import { GitPathTool } from "../src/git_path";
import * as commandRunner from "../src/command_runner";
import { toUnixPath } from "../src/util";

// Mock command_runner
const mockExecute = jest.fn();
jest.mock("../src/command_runner", () => ({
  execute: mockExecute,
}));

describe("GitPathTool", () => {
  beforeEach(() => {
    mockExecute.mockClear();
  });

  it("should get git root", () => {
    mockExecute.mockReturnValue(["/git/root"]);
    GitPathTool.setCwd("/git/root/subdir");
    const root = (GitPathTool as any)._root;
    expect(root).toBe("/git/root");
  });

  it("should handle empty git root", () => {
    mockExecute.mockReturnValue([""]);
    GitPathTool.setCwd("/git/root/subdir");
    const root = (GitPathTool as any)._root;
    expect(root).toBe("");
  });

  it("should calculate relative path", () => {
    mockExecute.mockReturnValue(["/git/root"]);
    GitPathTool.setCwd("/git/root/subdir");
    // root: /git/root
    // cwd: /git/root/subdir
    // file relative to root: subdir/file.ts
    // file relative to cwd: file.ts

    // relativePath takes a path relative to git root, and returns path relative to cwd
    const rel = GitPathTool.relativePath("subdir/file.ts");
    // relative from /git/root/subdir to /git/root/subdir/file.ts is file.ts
    expect(rel).toBe("file.ts");
  });

  it("should calculate relative path for file in root", () => {
    mockExecute.mockReturnValue(["/git/root"]);
    GitPathTool.setCwd("/git/root/subdir");

    // file relative to root: file.ts
    // file relative to cwd: ../file.ts
    const rel = GitPathTool.relativePath("file.ts");
    expect(toUnixPath(rel)).toBe("../file.ts");
  });

  it("should calculate absolute path", () => {
    mockExecute.mockReturnValue(["/git/root"]);
    GitPathTool.setCwd("/git/root/subdir");

    const abs = GitPathTool.absolutePath("subdir/file.ts");
    expect(abs).toBe("/git/root/subdir/file.ts");
  });
});
