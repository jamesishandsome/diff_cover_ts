import { describe, it, expect, beforeAll } from "bun:test";
import { GitPathTool } from "../src/git_path";

describe("GitPathTool", () => {
  beforeAll(() => {
    GitPathTool.setCwd(process.cwd());
  });

  it("should get git root", () => {
    // This test depends on being in a git repo
    const root = (GitPathTool as any)._gitRoot();
    expect(root).not.toBe("");
  });

  // More tests would require mocking execute or setting up a fake git repo
});
