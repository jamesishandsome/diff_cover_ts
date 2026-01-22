import path from "path";

export function toUnixPath(p: string): string {
  // Normalize the path and replace backslashes with forward slashes
  // normalize() handles .. and . parts, but we want to force forward slashes
  // even on Windows for consistency with the Python implementation
  const normalized = path.normalize(p);
  return normalized.replace(/\\/g, "/");
}

export function toUnixPaths(paths: string[]): string[] {
  return paths.map(toUnixPath);
}

export function toUnescapedFilename(filename: string): string {
  if (!(filename.startsWith('"') && filename.endsWith('"'))) {
    return filename;
  }

  const unquoted = filename.slice(1, -1);
  let result = "";
  let i = 0;
  while (i < unquoted.length) {
    if (unquoted[i] === "\\" && i + 1 < unquoted.length) {
      const nextChar = unquoted[i + 1]!;
      const map: { [key: string]: string } = {
        "\\": "\\",
        '"': '"',
        a: "a", // Python implementation maps 'a' to 'a' ??? Wait.
        // Python: "a": "a"
        // It seems the python implementation maps \a to a, not \a (bell).
        // Let's check the python code again.
        // "a": "a", "n": "\n", etc.
        n: "\n",
        t: "\t",
        r: "\r",
        b: "\b",
        f: "\f",
      };
      // Python implementation: .get(next_char, next_char)
      // So if it's not in map, just return next_char.
      result += map[nextChar] ?? nextChar;
      i += 2;
    } else {
      result += unquoted[i];
      i += 1;
    }
  }
  return result;
}
