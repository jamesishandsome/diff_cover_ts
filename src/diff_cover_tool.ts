import { Command, Option } from "commander";
import * as fs from "fs";
import { XmlCoverageReporter, LcovCoverageReporter } from "./violations_reporter";
import { GitDiffReporter } from "./diff_reporter";
import { GitDiffTool, GitDiffFileTool } from "./git_diff";
import { GitPathTool } from "./git_path";
import {
  HtmlReportGenerator,
  JsonReportGenerator,
  StringReportGenerator,
} from "./report_generator";
import { getConfig, Tool } from "./config_parser";
import { findCoverageReports } from "./auto_config";

const VERSION = "0.1.0";

function formatType(value: string, previous: Record<string, string>): Record<string, string> {
  const format = previous || {};
  if (!value) return format;

  const items = value.split(",");
  for (const item of items) {
    const parts = item.split(":");
    if (parts.length >= 2) {
      format[parts[0]!] = parts.slice(1).join(":");
    }
  }
  return format;
}

async function main() {
  const program = new Command();

  program
    .name("diff-cover")
    .description("Automatically find diff lines that need test coverage.")
    .version(VERSION);

  program
    .argument("[coverage_files...]", "coverage report files (XML or lcov.info)")
    .option("--format <value>", "Format to use", formatType)
    .option("--show-uncovered", "Show uncovered lines on the console")
    .option(
      "--expand-coverage-report",
      "Append missing lines in coverage reports based on the hits of the previous line",
    )
    .option("--external-css-file <filename>", "Write CSS into an external file")
    .option("--compare-branch <branch>", "Branch to compare", "origin/main")
    .option(
      "--fail-under <score>",
      "Returns an error code if coverage or quality score is below this value",
      parseFloat,
    )
    .option("--ignore-staged", "Ignores staged changes")
    .option("--ignore-unstaged", "Ignores unstaged changes")
    .option("--include-untracked", "Include untracked files")
    .option("--exclude <patterns...>", "Exclude files, more patterns supported")
    .option("--include <patterns...>", "Files to include (glob pattern)")
    .option(
      "--src-roots <directories...>",
      "List of source directories (only for jacoco coverage reports)",
    )
    .addOption(
      new Option("--diff-range-notation <range>", "Git diff range notation")
        .choices(["...", ".."])
        .default("..."),
    )
    .option("--ignore-whitespace", "When getting a diff ignore any and all whitespace")
    .option("-q, --quiet", "Only print errors and failures")
    .option("-c, --config-file <file>", "The configuration file to use")
    .option("--diff-file <file>", "The diff file to use")
    .option(
      "--total-percent-float",
      "Show total coverage/quality as a float rounded to 2 decimal places",
    );

  const defaults = {
    showUncovered: false,
    compareBranch: "origin/main",
    failUnder: 0,
    ignoreStaged: false,
    ignoreUnstaged: false,
    ignoreUntracked: false,
    srcRoots: ["src/main/java", "src/test/java"],
    ignoreWhitespace: false,
    diffRangeNotation: "...",
    quiet: false,
    expandCoverageReport: false,
    totalPercentFloat: false,
  };

  let config;
  try {
    config = getConfig(program, process.argv, defaults, Tool.DIFF_COVER);
  } catch (e: any) {
    console.error(e.message);
    process.exit(1);
  }

  // Initialize GitPathTool
  GitPathTool.setCwd(process.cwd());

  let diffTool;
  if (config.diffFile) {
    diffTool = new GitDiffFileTool(config.diffFile);
  } else {
    diffTool = new GitDiffTool(config.diffRangeNotation, config.ignoreWhitespace);
  }

  let coverageFiles = program.args;

  if (coverageFiles.length === 0) {
    // Try to auto-detect coverage reports from vite/vitest config
    const autoDetected = findCoverageReports();
    if (autoDetected.length > 0) {
      console.log(`Auto-detected coverage reports: ${autoDetected.join(", ")}`);
      coverageFiles = autoDetected;
    } else {
      console.error("No coverage files provided and none could be auto-detected from config.");
      process.exit(1);
    }
  }

  const xmlRoots: string[] = [];
  const lcovRoots: string[] = [];

  for (const file of coverageFiles) {
    try {
      const content = fs.readFileSync(file, "utf-8");
      if (content.trim().startsWith("<?xml") || file.endsWith(".xml")) {
        xmlRoots.push(content);
      } else {
        lcovRoots.push(content);
      }
    } catch (e: any) {
      console.error(`Could not read file ${file}: ${e.message}`);
      process.exit(1);
    }
  }

  if (xmlRoots.length > 0 && lcovRoots.length > 0) {
    console.error("Mixing LCov and XML reports is not supported yet");
    process.exit(1);
  }

  let coverage;
  try {
    if (xmlRoots.length > 0) {
      coverage = new XmlCoverageReporter(xmlRoots, config.srcRoots, config.expandCoverageReport);
    } else {
      coverage = new LcovCoverageReporter(lcovRoots, config.srcRoots);
    }
  } catch (e: any) {
    console.error(`Error parsing coverage report: ${e.message}`);
    process.exit(1);
  }

  const diffReporter = new GitDiffReporter(
    config.compareBranch,
    diffTool,
    config.ignoreStaged,
    config.ignoreUnstaged,
    config.includeUntracked,
    null, // supportedExtensions
    config.exclude,
    config.include,
  );

  const reportFormats = config.format || {};

  if (reportFormats.html) {
    const htmlReportPath = reportFormats.html;
    const reporter = new HtmlReportGenerator(
      coverage,
      diffReporter,
      config.externalCssFile,
      config.totalPercentFloat,
    );
    const output = fs.createWriteStream(htmlReportPath);
    reporter.generateReport(output);
    output.end();

    if (config.externalCssFile) {
      const cssOutput = fs.createWriteStream(config.externalCssFile);
      reporter.generateCss(cssOutput);
      cssOutput.end();
    }
  }

  if (reportFormats.json) {
    const jsonReportPath = reportFormats.json;
    const reporter = new JsonReportGenerator(coverage, diffReporter, config.totalPercentFloat);
    const output = fs.createWriteStream(jsonReportPath);
    reporter.generateReport(output);
    output.end();
  }

  const stringReporter = new StringReportGenerator(
    coverage,
    diffReporter,
    config.showUncovered,
    config.totalPercentFloat,
  );
  stringReporter.generateReport(process.stdout);

  const percent = stringReporter.totalPercentCovered();
  if (percent < config.failUnder) {
    console.error(`Failure: Coverage (${percent}%) is below the threshold (${config.failUnder}%)`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
