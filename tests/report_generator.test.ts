import { expect, test, describe } from "bun:test";
import { StringReportGenerator } from "../src/report_generator";
import { BaseViolationReporter, Violation } from "../src/violations_reporter";
import { BaseDiffReporter } from "../src/diff_reporter";

class MockViolationReporter extends BaseViolationReporter {
  constructor() {
    super("mock");
  }
  violations(srcPath: string): Violation[] {
    if (srcPath === "file1.ts") {
      return [new Violation(10, "error"), new Violation(20, "warning")];
    }
    return [];
  }
  override measuredLines(srcPath: string): number[] | null {
    if (srcPath === "file1.ts") {
      return [5, 10, 15, 20, 25];
    }
    return null;
  }
}

class MockDiffReporter extends BaseDiffReporter {
  constructor() {
    super("mock");
  }
  srcPathsChanged(): string[] {
    return ["file1.ts"];
  }
  linesChanged(srcPath: string): number[] {
    if (srcPath === "file1.ts") {
      return [10, 20, 30];
    }
    return [];
  }
}

describe("ReportGenerator", () => {
  test("StringReportGenerator", () => {
    const violations = new MockViolationReporter();
    const diff = new MockDiffReporter();
    const generator = new StringReportGenerator(violations, diff);

    let output = "";
    const stream = {
      write: (chunk: string) => (output += chunk),
    } as any;

    generator.generateReport(stream);

    console.log(output);

    expect(output).toContain("Diff Coverage");
    expect(output).toContain("file1.ts");
    // Measured in diff: 10, 20 (30 is not measured)
    // Violations in diff: 10, 20
    // Coverage: 0%
    expect(output).toContain("0%");
    expect(output).toContain("Missing lines 10,20");
  });
});
