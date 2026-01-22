import { describe, expect, test, vi, beforeEach } from "bun:test";
import {
  QualityReporter,
  EslintDriver,
  Violation,
  QualityDriver,
  PylintDriver,
  Flake8Driver,
  ShellcheckDriver,
  CppcheckDriver,
  CheckstyleDriver,
  FindbugsDriver,
} from "../src/violations_reporter";
import * as commandRunner from "../src/command_runner";

vi.mock("../src/command_runner", () => ({
  execute: vi.fn(),
  runCommandForCode: vi.fn(),
}));

const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();
vi.mock("fs", () => ({
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
  },
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
}));

vi.mock("../src/git_path", () => ({
  GitPathTool: {
    relativePath: (p: string) => p,
    absolutePath: (p: string) => p,
  },
}));

describe("QualityReporter", () => {
  let mockExecute: vi.Mock;
  let mockRunCommandForCode: vi.Mock;
  // mockExistsSync is global to module scope now

  beforeEach(() => {
    mockExecute = commandRunner.execute as vi.Mock;
    mockRunCommandForCode = commandRunner.runCommandForCode as vi.Mock;

    mockExecute.mockClear();
    mockRunCommandForCode.mockClear();
    mockExistsSync.mockClear();
  });

  class MockDriver extends QualityDriver {
    constructor() {
      super("mock", ["js"], ["mock_cmd"], [0]);
    }
    parseReports(reports: string[]): { [key: string]: Violation[] } {
      const violations: { [key: string]: Violation[] } = {};
      for (const report of reports) {
        if (report.includes("violation")) {
          violations["test.js"] = [new Violation(1, "violation message")];
        }
      }
      return violations;
    }
    installed(): boolean {
      return true;
    }
  }

  test("should use provided reports without executing command", () => {
    const driver = new MockDriver();
    const reporter = new QualityReporter(driver, ["violation report"]);

    // Mock fs.existsSync to return true for supported extensions check if needed,
    // but actually QualityReporter checks extension of srcPath first.

    const violations = reporter.violations("test.js");
    expect(violations).toHaveLength(1);
    expect(violations[0]!.line).toBe(1);
    expect(violations[0]!.message).toBe("violation message");
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test("should execute command if no reports provided", () => {
    const driver = new MockDriver();
    const reporter = new QualityReporter(driver);

    mockExistsSync.mockReturnValue(true); // file exists
    mockExecute.mockReturnValue(["violation output", ""]);

    const violations = reporter.violations("test.js");

    expect(mockExecute).toHaveBeenCalledWith(["mock_cmd", "test.js"], [0]);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.line).toBe(1);
  });

  test("should include options in command", () => {
    const driver = new MockDriver();
    const reporter = new QualityReporter(driver, null, "--option value");

    mockExistsSync.mockReturnValue(true);
    mockExecute.mockReturnValue(["", ""]);

    reporter.violations("test.js");

    expect(mockExecute).toHaveBeenCalledWith(["mock_cmd", "--option", "value", "test.js"], [0]);
  });

  test("should return empty if file does not exist", () => {
    const driver = new MockDriver();
    const reporter = new QualityReporter(driver);

    mockExistsSync.mockReturnValue(false);

    const violations = reporter.violations("test.js");
    expect(violations).toHaveLength(0);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test("should throw if driver not installed", () => {
    const driver = new MockDriver();
    vi.spyOn(driver, "installed").mockReturnValue(false);
    const reporter = new QualityReporter(driver);

    mockExistsSync.mockReturnValue(true);

    expect(() => reporter.violations("test.js")).toThrow("mock is not installed");
  });
});

describe("EslintDriver", () => {
  test("should parse eslint output correctly", () => {
    const driver = new EslintDriver();
    const output = `
file.js: line 10, col 2, Error message 1
other.ts: line 5, col 1, Error message 2
        `.trim();

    const violations = driver.parseReports([output]);

    expect(violations["file.js"]).toBeDefined();
    expect(violations["file.js"]).toHaveLength(1);
    expect(violations["file.js"]![0]!.line).toBe(10);
    expect(violations["file.js"]![0]!.message).toBe("Error message 1");

    expect(violations["other.ts"]).toBeDefined();
    expect(violations["other.ts"]).toHaveLength(1);
    expect(violations["other.ts"]![0]!.line).toBe(5);
    expect(violations["other.ts"]![0]!.message).toBe("Error message 2");
  });

  test("should handle reportRootPath", () => {
    const driver = new EslintDriver();
    driver.addDriverArgs({ reportRootPath: "/abs/path/to/root" });

    // Mock toUnixPath behavior indirectly via how EslintDriver uses it
    // But EslintDriver uses imported util.toUnixPath.
    // We are testing logic, assuming relative path calculation works.

    const output = `/abs/path/to/root/src/file.js: line 10, col 2, Error`;

    const violations = driver.parseReports([output]);

    // path.relative('/abs/path/to/root', '/abs/path/to/root/src/file.js') -> 'src/file.js' (on posix)
    // or 'src\\file.js' on windows. toUnixPath converts backslashes.

    // Since we can't easily control path.relative behavior across OS in this test without mocking path,
    // let's assume standard behavior.

    const keys = Object.keys(violations);
    expect(keys.length).toBe(1);

    // It should match src/file.js (normalized)
    expect(keys[0]).toMatch(/src\/file\.js$/);
  });
});

describe("PylintDriver", () => {
  test("should parse pylint output correctly", () => {
    const driver = new PylintDriver();
    // {path}:{line}: [{msg_id}({symbol}), {obj}] {msg}
    // ^([^:]+):(\d+): (.*)$
    // message is in group 3
    const output = `
src/file.py:10: [C0111(missing-docstring), ] Missing docstring
src/other.py:20: [W0611(unused-import), Module] Unused import os
        `.trim();

    const violations = driver.parseReports([output]);

    expect(violations["src/file.py"]).toBeDefined();
    expect(violations["src/file.py"]![0]!.line).toBe(10);
    expect(violations["src/file.py"]![0]!.message).toBe(
      "[C0111(missing-docstring), ] Missing docstring",
    );

    expect(violations["src/other.py"]).toBeDefined();
    expect(violations["src/other.py"]![0]!.line).toBe(20);
    expect(violations["src/other.py"]![0]!.message).toBe(
      "[W0611(unused-import), Module] Unused import os",
    );
  });
});

describe("Flake8Driver", () => {
  test("should parse flake8 output correctly", () => {
    const driver = new Flake8Driver();
    // filename:line:col: code text
    // ^([^:]+):(\d+):\d+: (.*)$
    const output = `
src/file.py:10:1: F401 'os' imported but unused
src/other.py:5:80: E501 line too long
        `.trim();

    const violations = driver.parseReports([output]);

    expect(violations["src/file.py"]).toBeDefined();
    expect(violations["src/file.py"]![0]!.line).toBe(10);
    expect(violations["src/file.py"]![0]!.message).toBe("F401 'os' imported but unused");

    expect(violations["src/other.py"]).toBeDefined();
    expect(violations["src/other.py"]![0]!.line).toBe(5);
    expect(violations["src/other.py"]![0]!.message).toBe("E501 line too long");
  });
});

describe("ShellcheckDriver", () => {
  test("should parse shellcheck output correctly", () => {
    const driver = new ShellcheckDriver();
    // gcc format: file:line:col: type: message
    // ^([^:]+):(\d+):\d+: (.*)$
    const output = `
script.sh:10:5: warning: Quote this to prevent word splitting. [SC2046]
other.sh:5:1: error: Parsing error
        `.trim();

    const violations = driver.parseReports([output]);

    expect(violations["script.sh"]).toBeDefined();
    expect(violations["script.sh"]![0]!.line).toBe(10);
    expect(violations["script.sh"]![0]!.message).toBe(
      "warning: Quote this to prevent word splitting. [SC2046]",
    );

    expect(violations["other.sh"]).toBeDefined();
    expect(violations["other.sh"]![0]!.line).toBe(5);
    expect(violations["other.sh"]![0]!.message).toBe("error: Parsing error");
  });
});

describe("CppcheckDriver", () => {
  test("should parse cppcheck output correctly", () => {
    const driver = new CppcheckDriver();
    // {file}:{line}: {message}
    // ^([^:]+):(\d+): (.*)$
    const output = `
file.cpp:10: Error message 1
src/other.cpp:5: Error message 2
        `.trim();

    const violations = driver.parseReports([output]);

    expect(violations["file.cpp"]).toBeDefined();
    expect(violations["file.cpp"]![0]!.line).toBe(10);
    expect(violations["file.cpp"]![0]!.message).toBe("Error message 1");

    expect(violations["src/other.cpp"]).toBeDefined();
    expect(violations["src/other.cpp"]![0]!.line).toBe(5);
    expect(violations["src/other.cpp"]![0]!.message).toBe("Error message 2");
  });
});

describe("CheckstyleDriver", () => {
  test("should parse checkstyle xml output correctly", () => {
    const driver = new CheckstyleDriver();
    const output = `
<?xml version="1.0" encoding="UTF-8"?>
<checkstyle version="5.0">
    <file name="src/File.java">
        <error line="10" column="1" severity="error" message="Missing javadoc" source="com.puppycrawl.tools.checkstyle.checks.javadoc.JavadocMethodCheck"/>
    </file>
    <file name="src/Other.java">
        <error line="5" message="Some error"/>
        <error line="0" message="File error"/>
    </file>
</checkstyle>
        `.trim();

    const violations = driver.parseReports([output]);

    expect(violations["src/File.java"]).toBeDefined();
    expect(violations["src/File.java"]).toHaveLength(1);
    expect(violations["src/File.java"]![0]!.line).toBe(10);
    expect(violations["src/File.java"]![0]!.message).toBe("Missing javadoc");

    expect(violations["src/Other.java"]).toBeDefined();
    expect(violations["src/Other.java"]).toHaveLength(1); // line 0 ignored
    expect(violations["src/Other.java"]![0]!.line).toBe(5);
    expect(violations["src/Other.java"]![0]!.message).toBe("Some error");
  });
});

describe("FindbugsDriver", () => {
  test("should parse findbugs xml output correctly", () => {
    const driver = new FindbugsDriver();
    const output = `
<BugCollection>
    <BugInstance type="ABC">
        <SourceLine sourcepath="com/example/File.java" start="10" end="12"/>
        <LongMessage>Bad code here</LongMessage>
    </BugInstance>
    <BugInstance type="DEF">
        <SourceLine sourcepath="com/example/Other.java" start="5"/>
        <LongMessage>Another error</LongMessage>
    </BugInstance>
</BugCollection>
        `.trim();

    const violations = driver.parseReports([output]);

    expect(violations["com/example/File.java"]).toBeDefined();
    expect(violations["com/example/File.java"]![0]!.line).toBe(10);
    expect(violations["com/example/File.java"]![0]!.message).toBe("Bad code here");

    expect(violations["com/example/Other.java"]).toBeDefined();
    expect(violations["com/example/Other.java"]![0]!.line).toBe(5);
    expect(violations["com/example/Other.java"]![0]!.message).toBe("Another error");
  });
});
