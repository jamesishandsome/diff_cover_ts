import { describe, expect, test, jest, beforeEach } from "bun:test";
import { GitDiffTool, GitDiffFileTool, GitDiffError } from "../src/git_diff";
import * as commandRunner from "../src/command_runner";

// Mock command_runner
const mockExecute = jest.fn();
(jest as any).mock("../src/command_runner", () => ({
  execute: mockExecute,
  CommandError: class CommandError extends Error {},
}));

// Mock fs
const mockReadFileSync = jest.fn();
(jest as any).mock("fs", () => ({
  default: {
    readFileSync: mockReadFileSync,
  },
  readFileSync: mockReadFileSync,
}));

describe("GitDiffTool", () => {
  beforeEach(() => {
    mockExecute.mockClear();
  });

  test("should construct with default options", () => {
    const tool = new GitDiffTool("...", false);
    expect(tool.rangeNotation).toBe("...");
  });

  test("should add ignore whitespace args", () => {
    // We can't verify private properties directly, but we can check if they affect the command
    const tool = new GitDiffTool("...", true);
    mockExecute.mockReturnValue([""]);
    tool.diffCommitted();
    const lastCall = mockExecute.mock.calls[0]![0];
    expect(lastCall).toContain("--ignore-all-space");
    expect(lastCall).toContain("--ignore-blank-lines");
  });

  test("diffCommitted should execute git diff", () => {
    const tool = new GitDiffTool("...", false);
    mockExecute.mockReturnValue(["diff output"]);
    const output = tool.diffCommitted("master");
    expect(output).toBe("diff output");
    expect(mockExecute).toHaveBeenCalledWith(
      expect.arrayContaining(["git", "diff", "master...HEAD"]),
    );
  });

  test("diffCommitted should handle unknown revision error", () => {
    const tool = new GitDiffTool("...", false);
    const CommandError = (commandRunner as any).CommandError;
    mockExecute.mockImplementation(() => {
      throw new CommandError("unknown revision");
    });
    expect(() => tool.diffCommitted("bad-branch")).toThrow(
      /Could not find the branch to compare to/,
    );
  });

  test("diffCommitted should rethrow other errors", () => {
    const tool = new GitDiffTool("...", false);
    mockExecute.mockImplementation(() => {
      throw new Error("other error");
    });
    expect(() => tool.diffCommitted()).toThrow("other error");
  });

  test("diffUnstaged should execute git diff", () => {
    const tool = new GitDiffTool("...", false);
    mockExecute.mockReturnValue(["diff output"]);
    const output = tool.diffUnstaged();
    expect(output).toBe("diff output");
    const lastCall = mockExecute.mock.calls[0]![0];
    // Should NOT contain HEAD or range
    expect(lastCall.some((arg: string) => arg.includes("HEAD"))).toBe(false);
  });

  test("diffStaged should execute git diff --cached", () => {
    const tool = new GitDiffTool("...", false);
    mockExecute.mockReturnValue(["diff output"]);
    const output = tool.diffStaged();
    expect(output).toBe("diff output");
    expect(mockExecute).toHaveBeenCalledWith(expect.arrayContaining(["--cached"]));
  });

  test("untracked should execute git ls-files", () => {
    const tool = new GitDiffTool("...", false);
    mockExecute.mockReturnValue(["file1.ts\nfile2.ts"]);
    const files = tool.untracked();
    expect(files).toEqual(["file1.ts", "file2.ts"]);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.arrayContaining(["git", "ls-files", "--exclude-standard", "--others"]),
    );
  });

  test("untracked should cache results", () => {
    const tool = new GitDiffTool("...", false);
    mockExecute.mockReturnValue(["file1.ts"]);
    tool.untracked();
    tool.untracked();
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  test("untracked should handle empty output", () => {
    const tool = new GitDiffTool("...", false);
    mockExecute.mockReturnValue([""]);
    expect(tool.untracked()).toEqual([]);
  });
});

describe("GitDiffFileTool", () => {
  beforeEach(() => {
    mockReadFileSync.mockClear();
  });

  test("diffCommitted should read from file", () => {
    const tool = new GitDiffFileTool("diff.patch");
    mockReadFileSync.mockReturnValue("file content");
    expect(tool.diffCommitted()).toBe("file content");
    expect(mockReadFileSync).toHaveBeenCalledWith("diff.patch", "utf-8");
  });

  test("diffCommitted should throw if file not found", () => {
    const tool = new GitDiffFileTool("diff.patch");
    mockReadFileSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });
    expect(() => tool.diffCommitted()).toThrow(/Could not read the diff file/);
  });

  test("diffUnstaged should return empty string", () => {
    const tool = new GitDiffFileTool("diff.patch");
    expect(tool.diffUnstaged()).toBe("");
  });

  test("diffStaged should return empty string", () => {
    const tool = new GitDiffFileTool("diff.patch");
    expect(tool.diffStaged()).toBe("");
  });

  test("untracked should return empty array", () => {
    const tool = new GitDiffFileTool("diff.patch");
    expect(tool.untracked()).toEqual([]);
  });
});

describe("GitDiffError", () => {
  test("should have correct name", () => {
    const error = new GitDiffError("msg");
    expect(error.name).toBe("GitDiffError");
    expect(error.message).toBe("msg");
  });
});
