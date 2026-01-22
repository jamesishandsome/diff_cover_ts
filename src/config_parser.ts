import * as fs from "fs";
import * as toml from "@iarna/toml";
import { Command } from "commander";

export enum Tool {
  DIFF_COVER = "diff_cover",
  DIFF_QUALITY = "diff_quality",
}

export class ParserError extends Error {}

abstract class ConfigParser {
  protected fileName: string;
  protected tool: Tool;

  constructor(fileName: string, tool: Tool) {
    this.fileName = fileName;
    this.tool = tool;
  }

  abstract parse(): Record<string, any> | null;
}

class TOMLParser extends ConfigParser {
  private section: string;

  constructor(fileName: string, tool: Tool) {
    super(fileName, tool);
    this.section = tool === Tool.DIFF_COVER ? "diff_cover" : "diff_quality";
  }

  parse(): Record<string, any> | null {
    if (!this.fileName.endsWith(".toml")) {
      return null;
    }

    try {
      const content = fs.readFileSync(this.fileName, "utf-8");
      const config = toml.parse(content);
      const toolConfig = (config as any).tool?.[this.section];

      if (!toolConfig) {
        // It's acceptable to have a toml file without the section?
        // Python code raises error if section missing?
        // "No 'tool.diff_cover' configuration available"
        throw new ParserError(`No 'tool.${this.section}' configuration available`);
      }
      return toolConfig;
    } catch (e: any) {
      if (e instanceof ParserError) throw e;
      // If file doesn't exist, Python open() would fail.
      // We assume file exists if passed to constructor?
      // In _parse_config_file, we iterate parsers.
      throw new ParserError(`Error parsing TOML: ${e.message}`);
    }
  }
}

const PARSERS = [TOMLParser];

function parseConfigFile(fileName: string, tool: Tool): Record<string, any> {
  for (const ParserClass of PARSERS) {
    const parser = new ParserClass(fileName, tool);
    // Check if parser can handle
    // TOMLParser checks extension in parse()
    // But constructor doesn't check.
    // We should probably check extension before creating parser or catch error?
    // Python code: parser.parse() returns None if cannot handle.
    const config = parser.parse();
    if (config) {
      return config;
    }
  }
  throw new ParserError(`No config parser could handle ${fileName}`);
}

function normalizePatterns(patterns: any): string[] | null {
  if (patterns === null || patterns === undefined) return null;
  if (typeof patterns === "string") return [patterns];
  if (Array.isArray(patterns)) return patterns;
  return null;
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (g) => g[1]!.toUpperCase());
}

function snakeToCamelKeys(obj: Record<string, any>): Record<string, any> {
  const newObj: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    newObj[toCamelCase(key)] = obj[key];
  }
  return newObj;
}

export function getConfig(
  program: Command,
  argv: string[],
  defaults: Record<string, any>,
  tool: Tool,
): Record<string, any> {
  // Parse args
  // We assume program is already configured with options/arguments.
  program.parse(argv); // argv should include 'node', 'script' usually?
  // If called from main with process.argv, yes.

  const opts = program.opts();

  // Combine opts and args
  const cliConfig: Record<string, any> = { ...opts };

  // Handle positional args if any (specific to diff_cover_tool)
  // We rely on caller to map args to config keys if needed,
  // OR we standardize here.
  // In diff_cover_tool, positional arg is 'coverage_files'.
  // Commander stores it in program.args if configured as argument.
  // We'll leave it to caller to extract args?
  // But getConfig returns a merged config.
  // Python get_config: vars(parser.parse_args(argv)).
  // argparse puts positional args in the dict.
  // Commander puts them in .args array, NOT in opts().
  // Unless we use .argument('<name>')?
  // If we use .argument(), does it go to opts()? No.
  // But we can manually add it.

  // For now, we assume cliConfig contains options.
  // We will handle coverageFiles manually in diff_cover_tool before calling getConfig?
  // Or we modify getConfig to handle it?
  // Python's get_config is generic.

  let fileConfig: Record<string, any> = {};
  if (cliConfig.configFile) {
    fileConfig = parseConfigFile(cliConfig.configFile, tool);
    fileConfig = snakeToCamelKeys(fileConfig);
  }

  const config = { ...defaults };

  // Merge: defaults -> file -> cli
  // But we need to handle None/undefined.
  // Python: "if value is None: default; else override"
  // In JS commander, missing options are undefined.

  for (const configDict of [fileConfig, cliConfig]) {
    for (const [key, value] of Object.entries(configDict)) {
      if (value === undefined || value === null) {
        if (!(key in config)) {
          config[key] = value;
        }
      } else {
        config[key] = value;
      }
    }
  }

  // Normalize patterns
  if (config.exclude) config.exclude = normalizePatterns(config.exclude);
  if (config.include) config.include = normalizePatterns(config.include);

  return config;
}
