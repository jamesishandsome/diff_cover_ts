import * as fs from "fs";
import * as path from "path";

export function findCoverageReports(): string[] {
  const cwd = process.cwd();
  const configFiles = [
    "vitest.config.ts",
    "vitest.config.js",
    "vite.config.ts",
    "vite.config.js",
  ];

  let reporters: string[] = [];
  let reportsDirectory = "coverage";

  for (const configFile of configFiles) {
    const configPath = path.join(cwd, configFile);
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, "utf-8");
        
        // Extract reporters
        // Match: reporter: ['lcov', 'json'] or reporter: "lcov"
        const reporterMatch = content.match(/reporter:\s*(\[[^\]]*\]|['"][^'"]*['"])/);
        if (reporterMatch && reporterMatch[1]) {
          const reporterValue = reporterMatch[1];
          if (reporterValue.startsWith("[")) {
            // Parse array manually to avoid eval/json parse issues with single quotes
            const items = reporterValue
              .slice(1, -1) // remove []
              .split(",")
              .map(s => s.trim().replace(/^['"]|['"]$/g, ""));
            reporters = items.filter(s => s.length > 0);
          } else {
            reporters = [reporterValue.replace(/^['"]|['"]$/g, "")];
          }
        }

        // Extract reportsDirectory
        const dirMatch = content.match(/reportsDirectory:\s*['"]([^'"]*)['"]/);
        if (dirMatch && dirMatch[1]) {
          reportsDirectory = dirMatch[1];
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
