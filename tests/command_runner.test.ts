import { describe, expect, test, vi, beforeEach } from "bun:test";
import { execute, runCommandForCode, CommandError } from "../src/command_runner";

const mockSpawnSync = vi.fn();
vi.mock("child_process", () => ({
  spawnSync: mockSpawnSync,
}));

describe("command_runner", () => {
  beforeEach(() => {
    mockSpawnSync.mockClear();
  });

  describe("execute", () => {
    test("should return stdout and stderr", () => {
      mockSpawnSync.mockReturnValue({
        stdout: "output",
        stderr: "error",
        status: 0,
        error: null,
      });

      const [stdout, stderr] = execute(["echo", "hello"]);
      expect(stdout).toBe("output");
      expect(stderr).toBe("error");
      expect(mockSpawnSync).toHaveBeenCalledWith("echo", ["hello"], expect.any(Object));
    });

    test("should throw CommandError on non-zero exit code", () => {
      mockSpawnSync.mockReturnValue({
        stdout: "",
        stderr: "fail",
        status: 1,
        error: null,
      });

      expect(() => execute(["fail"])).toThrow(CommandError);
      expect(() => execute(["fail"])).toThrow("fail");
    });

    test("should allow specified exit codes", () => {
      mockSpawnSync.mockReturnValue({
        stdout: "ok",
        stderr: "",
        status: 1,
        error: null,
      });

      const [stdout] = execute(["check"], [0, 1]);
      expect(stdout).toBe("ok");
    });

    test("should throw Error if command is empty", () => {
      expect(() => execute([])).toThrow("Command cannot be empty");
    });

    test("should rethrow system errors", () => {
      const error = new Error("ENOENT");
      mockSpawnSync.mockReturnValue({
        error: error,
      });

      expect(() => execute(["missing"])).toThrow("ENOENT");
    });
  });

  describe("runCommandForCode", () => {
    test("should return exit code", () => {
      mockSpawnSync.mockReturnValue({
        status: 5,
        error: null,
      });

      const code = runCommandForCode(["exit", "5"]);
      expect(code).toBe(5);
    });

    test("should return 1 on error", () => {
      mockSpawnSync.mockReturnValue({
        error: new Error("fail"),
      });

      const code = runCommandForCode(["fail"]);
      expect(code).toBe(1);
    });

    test("should return 1 on ENOENT", () => {
      const err = new Error("ENOENT");
      (err as any).code = "ENOENT";
      mockSpawnSync.mockReturnValue({
        error: err,
      });

      const code = runCommandForCode(["missing"]);
      expect(code).toBe(1);
    });

    test("should return 1 if command is empty", () => {
      const code = runCommandForCode([]);
      expect(code).toBe(1);
    });
  });
});
