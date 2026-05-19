import * as fs from "fs";
import * as path from "path";

function extractPropertyValue(content: string, propertyName: string): string | null {
  const match = new RegExp(`${propertyName}\\s*:`).exec(content);
  if (!match) return null;

  let index = match.index + match[0].length;
  while (/\s/.test(content[index] || "")) index++;

  const first = content[index];
  if (first === "'" || first === '"') {
    const quote = first;
    let end = index + 1;
    while (end < content.length) {
      if (content[end] === "\\" && end + 1 < content.length) {
        end += 2;
        continue;
      }
      if (content[end] === quote) {
        return content.slice(index, end + 1);
      }
      end++;
    }
    return null;
  }

  if (first !== "[") return null;

  let depth = 0;
  let quote: string | null = null;
  for (let end = index; end < content.length; end++) {
    const char = content[end];
    if (quote) {
      if (char === "\\" && end + 1 < content.length) {
        end++;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "[") depth++;
    if (char === "]") depth--;
    if (depth === 0) {
      return content.slice(index, end + 1);
    }
  }

  return null;
}

function unquote(value: string): string | null {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if ((quote !== "'" && quote !== '"') || trimmed[trimmed.length - 1] !== quote) {
    return null;
  }
  return trimmed.slice(1, -1);
}

function splitTopLevelArrayItems(value: string): string[] {
  const inner = value.trim().slice(1, -1);
  const items: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: string | null = null;

  for (let index = 0; index < inner.length; index++) {
    const char = inner[index];
    if (quote) {
      if (char === "\\" && index + 1 < inner.length) {
        index++;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "[" || char === "{") depth++;
    if (char === "]" || char === "}") depth--;
    if (char === "," && depth === 0) {
      items.push(inner.slice(start, index).trim());
      start = index + 1;
    }
  }

  const lastItem = inner.slice(start).trim();
  if (lastItem) items.push(lastItem);
  return items;
}

function parseReporters(value: string): string[] {
  const trimmed = value.trim();
  const singleReporter = unquote(trimmed);
  if (singleReporter) return [singleReporter];
  if (!trimmed.startsWith("[")) return [];

  return splitTopLevelArrayItems(trimmed)
    .map((item) => {
      const direct = unquote(item);
      if (direct) return direct;
      if (item.startsWith("[")) {
        const firstTupleItem = splitTopLevelArrayItems(item)[0];
        return firstTupleItem ? unquote(firstTupleItem) : null;
      }
      return null;
    })
    .filter((item): item is string => Boolean(item));
}

export function findCoverageReports(): string[] {
  const cwd = process.cwd();
  const configFiles = ["vitest.config.ts", "vitest.config.js", "vite.config.ts", "vite.config.js"];

  let reporters: string[] = [];
  let reportsDirectory = "coverage";

  for (const configFile of configFiles) {
    const configPath = path.join(cwd, configFile);
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, "utf-8");

        const reporterValue = extractPropertyValue(content, "reporter");
        if (reporterValue) {
          reporters = parseReporters(reporterValue);
        }

        const reportsDirectoryValue = extractPropertyValue(content, "reportsDirectory");
        const parsedReportsDirectory = reportsDirectoryValue
          ? unquote(reportsDirectoryValue)
          : null;
        if (parsedReportsDirectory) {
          reportsDirectory = parsedReportsDirectory;
        }

        if (reporters.length > 0) {
          break; // Found config, stop searching
        }
      } catch (e) {
        console.warn(`Error reading ${configFile}:`, e);
      }
    }
  }

  // If no reporters found in config, but coverage directory exists,
  // we might try to guess? But user asked to identify FROM config.
  // If no config found, we return empty list.

  const foundReports: string[] = [];

  if (reporters.length > 0) {
    // Map reporters to expected files
    // lcov -> lcov.info
    // cobertura -> cobertura.xml
    // json -> coverage-final.json (istanbul)
    // clover -> clover.xml
    // jacoco -> jacoco.xml

    // Priorities: lcov > xml > json

    for (const reporter of reporters) {
      let filename = "";
      if (reporter === "lcov") filename = "lcov.info";
      else if (reporter === "cobertura") filename = "cobertura.xml";
      else if (reporter === "clover") filename = "clover.xml";
      else if (reporter === "jacoco") filename = "jacoco.xml";
      // else if (reporter === "json") filename = "coverage-final.json"; // This varies, maybe skip json for now as lcov/xml are preferred for diff-cover

      if (filename) {
        const reportPath = path.join(cwd, reportsDirectory, filename);
        if (fs.existsSync(reportPath)) {
          foundReports.push(reportPath);
        }
      }
    }
  }

  return foundReports;
}
