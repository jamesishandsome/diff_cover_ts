import { Command, Option } from "commander";
import * as fs from "fs";
import {
  QualityReporter,
  EslintDriver,
  PylintDriver,
  Flake8Driver,
  ShellcheckDriver,
  CppcheckDriver,
  CheckstyleDriver,
  FindbugsDriver,
  QualityDriver,
} from "./violations_reporter";
import { GitDiffReporter } from "./diff_reporter";
import { GitDiffTool, GitDiffFileTool } from "./git_diff";
import { GitPathTool } from "./git_path";
import {
  HtmlQualityReportGenerator,
  JsonReportGenerator,
  StringQualityReportGenerator,
  BaseReportGenerator,
} from "./report_generator";
import { getConfig, Tool } from "./config_parser";

const VERSION = "0.1.0";

const DRIVERS: { [key: string]: new () => QualityDriver } = {
  eslint: EslintDriver,
  pylint: PylintDriver,
  flake8: Flake8Driver,
  shellcheck: ShellcheckDriver,
  cppcheck: CppcheckDriver,
  checkstyle: CheckstyleDriver,
  findbugs: FindbugsDriver,
};

async function main() {
  const program = new Command();

  program
    .name("diff-quality")
    .description("Automatically find diff lines that need quality checks.")
    .version(VERSION);

  program.argument("[reports...]", "Quality report files");

  program
    .option("--violations <driver>", "Which code quality driver to use")
    .option("--html-report <file>", "Write HTML report to this file")
    .option("--json-report <file>", "Write JSON report to this file")
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
    .option("--options <options>", "Options to be passed to the quality driver")
    .option("--report-root-path <path>", "Root path for the report")
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
    violations: "eslint",
    compareBranch: "origin/main",
    failUnder: 0,
    ignoreStaged: false,
    ignoreUnstaged: false,
    ignoreUntracked: false,
    ignoreWhitespace: false,
    diffRangeNotation: "...",
    quiet: false,
    totalPercentFloat: false,
  };

  let config;
  try {
    config = getConfig(program, process.argv, defaults, Tool.DIFF_QUALITY);
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

  // Select driver
  const DriverClass = DRIVERS[config.violations];
  if (!DriverClass) {
    console.error(
      `Quality driver '${config.violations}' not supported. Available: ${Object.keys(DRIVERS).join(", ")}`,
    );
    process.exit(1);
  }

  const driver = new DriverClass();

  // Add driver args
  if (config.reportRootPath) {
    try {
      driver.addDriverArgs({ reportRootPath: config.reportRootPath });
    } catch (e: any) {
      console.error(`Error configuring driver: ${e.message}`);
      process.exit(1);
    }
  }

  const inputReports = program.args;
  let reports: string[] | null = null;

  if (inputReports.length > 0) {
    reports = [];
    for (const file of inputReports) {
      try {
        reports.push(fs.readFileSync(file, "utf-8"));
      } catch (e: any) {
        console.error(`Could not read file ${file}: ${e.message}`);
        process.exit(1);
      }
    }
  }

  let qualityReporter;
  try {
    qualityReporter = new QualityReporter(driver, reports, config.options);
  } catch (e: any) {
    console.error(`Error initializing reporter: ${e.message}`);
    process.exit(1);
  }

  const diffReporter = new GitDiffReporter(
    config.compareBranch,
    diffTool,
    config.ignoreStaged,
    config.ignoreUnstaged,
    config.includeUntracked,
    driver.supportedExtensions,
    config.exclude,
    config.include,
  );

  let reporter: BaseReportGenerator;

  if (config.htmlReport) {
    reporter = new HtmlQualityReportGenerator(
      qualityReporter,
      diffReporter,
      null,
      config.totalPercentFloat,
    );
    const output = fs.createWriteStream(config.htmlReport);
    reporter.generateReport(output);
    if (config.externalCssFile) {
      const cssOutput = fs.createWriteStream(config.externalCssFile);
      (reporter as HtmlQualityReportGenerator).generateCss(cssOutput);
      cssOutput.end();
    }
    output.end();
  } else if (config.jsonReport) {
    reporter = new JsonReportGenerator(qualityReporter, diffReporter, config.totalPercentFloat);
    const output = fs.createWriteStream(config.jsonReport);
    reporter.generateReport(output);
    output.end();
  } else {
    reporter = new StringQualityReportGenerator(
      qualityReporter,
      diffReporter,
      config.totalPercentFloat,
    );
    reporter.generateReport(process.stdout);
  }

  const percent = reporter.totalPercentCovered();
  if (percent < config.failUnder) {
    console.error(`Failure: Quality (${percent}%) is below the threshold (${config.failUnder}%)`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
