import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const FALLBACK_VERSION = "2.0.6";

export function packageVersion(): string {
  try {
    const packagePath = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
    const pkg = JSON.parse(readFileSync(packagePath, "utf-8"));
    if (typeof pkg.version === "string" && pkg.version.length > 0) {
      return pkg.version;
    }
  } catch {
    // Compiled single-file binaries may not have package.json next to the executable.
  }

  return FALLBACK_VERSION;
}
