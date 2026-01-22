import { describe, it, expect } from "bun:test";
import { toUnixPath, toUnixPaths, toUnescapedFilename } from "../src/util";

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

  it("toUnescapedFilename should remove quotes", () => {
    expect(toUnescapedFilename('"file.ts"')).toBe("file.ts");
  });

  it("toUnescapedFilename should keep unquoted filenames", () => {
    expect(toUnescapedFilename("file.ts")).toBe("file.ts");
  });

  it("toUnescapedFilename should unescape characters", () => {
    // "a\"b\\c" -> a"b\c
    expect(toUnescapedFilename('"a\\"b\\\\c"')).toBe('a"b\\c');
  });

  it("toUnescapedFilename should unescape common escapes", () => {
    expect(toUnescapedFilename('"\\n\\t"')).toBe("\n\t");
  });
  
  it("toUnescapedFilename should handle octal escapes (not implemented but should pass through or similar)", () => {
      // Current implementation is simple char map
      expect(toUnescapedFilename('"\\a"')).toBe("a");
  });
});
