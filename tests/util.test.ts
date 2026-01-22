import { describe, it, expect } from "bun:test";
import { toUnixPath, toUnixPaths } from "../src/util";

describe("util", () => {
  it("toUnixPath should convert backslashes to forward slashes", () => {
    expect(toUnixPath("path\\to\\file")).toBe("path/to/file");
  });

  it("toUnixPath should handle mixed slashes", () => {
    expect(toUnixPath("path/to\\file")).toBe("path/to/file");
  });

  it("toUnixPaths should convert array of paths", () => {
    expect(toUnixPaths(["a\\b", "c\\d"])).toEqual(["a/b", "c/d"]);
  });
});
