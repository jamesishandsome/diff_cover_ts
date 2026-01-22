import { describe, expect, test, vi, beforeEach } from "bun:test";
import * as path from "path";
import { findCoverageReports } from "../src/auto_config";

// Mock fs
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

describe("auto_config", () => {
  const cwd = process.cwd();

  beforeEach(() => {
    mockExistsSync.mockClear();
    mockReadFileSync.mockClear();
  });

  test("should detect lcov reporter in vitest.config.ts", () => {
    const configPath = path.join(cwd, "vitest.config.ts");
    const reportPath = path.join(cwd, "coverage", "lcov.info");

    mockExistsSync.mockImplementation((p: string) => {
      if (p === configPath) return true;
      if (p === reportPath) return true;
      return false;
    });

    mockReadFileSync.mockImplementation((p: string) => {
      if (p === configPath) {
        return `
          export default {
            test: {
              coverage: {
                reporter: ['lcov']
              }
            }
          }
        `;
      }
      return "";
    });

    const reports = findCoverageReports();
    expect(reports).toEqual([reportPath]);
  });

  test("should detect multiple reporters in vitest.config.js", () => {
    const configPath = path.join(cwd, "vitest.config.js");
    const lcovPath = path.join(cwd, "coverage", "lcov.info");
    const coberturaPath = path.join(cwd, "coverage", "cobertura.xml");

    mockExistsSync.mockImplementation((p: string) => {
      if (p === configPath) return true;
      if (p === lcovPath) return true;
      if (p === coberturaPath) return true;
      return false;
    });

    mockReadFileSync.mockImplementation((p: string) => {
      if (p === configPath) {
        return `
          module.exports = {
            test: {
              coverage: {
                reporter: ['lcov', 'cobertura', 'text']
              }
            }
          }
        `;
      }
      return "";
    });

    const reports = findCoverageReports();
    expect(reports).toContain(lcovPath);
    expect(reports).toContain(coberturaPath);
    expect(reports.length).toBe(2);
  });

  test("should handle single reporter as string", () => {
    const configPath = path.join(cwd, "vite.config.ts");
    const reportPath = path.join(cwd, "coverage", "lcov.info");

    mockExistsSync.mockImplementation((p: string) => {
      if (p === configPath) return true;
      if (p === reportPath) return true;
      return false;
    });

    mockReadFileSync.mockImplementation((p: string) => {
      if (p === configPath) {
        return `
          export default {
            test: {
              coverage: {
                reporter: "lcov"
              }
            }
          }
        `;
      }
      return "";
    });

    const reports = findCoverageReports();
    expect(reports).toEqual([reportPath]);
  });

  test("should respect custom reportsDirectory", () => {
    const configPath = path.join(cwd, "vitest.config.ts");
    const reportPath = path.join(cwd, "custom-coverage", "lcov.info");

    mockExistsSync.mockImplementation((p: string) => {
      if (p === configPath) return true;
      if (p === reportPath) return true;
      return false;
    });

    mockReadFileSync.mockImplementation((p: string) => {
      if (p === configPath) {
        return `
          export default {
            test: {
              coverage: {
                reporter: ['lcov'],
                reportsDirectory: 'custom-coverage'
              }
            }
          }
        `;
      }
      return "";
    });

    const reports = findCoverageReports();
    expect(reports).toEqual([reportPath]);
  });

  test("should return empty list if no config found", () => {
    mockExistsSync.mockReturnValue(false);
    const reports = findCoverageReports();
    expect(reports).toEqual([]);
  });

  test("should return empty list if config found but no reporter", () => {
    const configPath = path.join(cwd, "vitest.config.ts");

    mockExistsSync.mockImplementation((p: string) => {
      if (p === configPath) return true;
      return false;
    });

    mockReadFileSync.mockReturnValue("export default {}");

    const reports = findCoverageReports();
    expect(reports).toEqual([]);
  });

  test("should prioritize vitest.config.ts over vite.config.js", () => {
    const vitestConfigPath = path.join(cwd, "vitest.config.ts");
    const viteConfigPath = path.join(cwd, "vite.config.js");
    const lcovPath = path.join(cwd, "coverage", "lcov.info");
    const coberturaPath = path.join(cwd, "coverage", "cobertura.xml");

    mockExistsSync.mockImplementation((p: string) => {
      if (p === vitestConfigPath) return true;
      if (p === viteConfigPath) return true;
      if (p === lcovPath) return true;
      if (p === coberturaPath) return true;
      return false;
    });

    mockReadFileSync.mockImplementation((p: string) => {
      if (p === vitestConfigPath) {
        return "reporter: ['lcov']";
      }
      if (p === viteConfigPath) {
        return "reporter: ['cobertura']";
      }
      return "";
    });

    const reports = findCoverageReports();
    expect(reports).toEqual([lcovPath]);
  });

  test("should handle multi-line array formatting", () => {
    const configPath = path.join(cwd, "vitest.config.ts");
    const lcovPath = path.join(cwd, "coverage", "lcov.info");

    mockExistsSync.mockImplementation((p: string) => {
      if (p === configPath) return true;
      if (p === lcovPath) return true;
      return false;
    });

    mockReadFileSync.mockImplementation((p: string) => {
      if (p === configPath) {
        return `
          reporter: [
            'lcov',
            'text'
          ]
        `;
      }
      return "";
    });

    const reports = findCoverageReports();
    expect(reports).toEqual([lcovPath]);
  });

  test("should ignore object-style reporters and valid string reporters in mixed array", () => {
    const configPath = path.join(cwd, "vitest.config.ts");
    const lcovPath = path.join(cwd, "coverage", "lcov.info");

    mockExistsSync.mockImplementation((p: string) => {
      if (p === configPath) return true;
      if (p === lcovPath) return true;
      return false;
    });

    // We expect it to find 'lcov' and ignore the object
    mockReadFileSync.mockImplementation((p: string) => {
      if (p === configPath) {
        return `
          reporter: ['lcov', { 'some': 'config' }]
        `;
      }
      return "";
    });

    const reports = findCoverageReports();
    expect(reports).toEqual([lcovPath]);
  });
});
