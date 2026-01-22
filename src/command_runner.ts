import { spawnSync } from "child_process";

export class CommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommandError";
  }
}

/**
 * Execute provided command returning the stdout
 * @param command list of tokens to execute as your command.
 * @param exitCodes exit codes which do not indicate error. If null, all exit codes are allowed.
 * @returns [stdout, stderr]
 */
export function execute(command: string[], exitCodes: number[] | null = [0]): [string, string] {
  const cmd = command[0];
  const args = command.slice(1);

  if (!cmd) {
    throw new Error("Command cannot be empty");
  }

  // On Windows, we might need to use shell: true for some commands,
  // but git usually works fine without it if it's in PATH.
  // However, Python's subprocess uses shell=False by default (except on Windows where it might matter for built-ins).
  // Let's stick to simple spawnSync first.

  const result = spawnSync(cmd, args, {
    encoding: "utf-8",
    maxBuffer: 1024 * 1024 * 10, // 10MB buffer
  });

  if (result.error) {
    console.error(command.join(" "));
    throw result.error;
  }

  const stdout = result.stdout || "";
  const stderr = result.stderr || "";

  if (exitCodes !== null && !exitCodes.includes(result.status ?? 1)) {
    throw new CommandError(stderr);
  }

  return [stdout, stderr];
}

export function runCommandForCode(command: string[]): number {
  const cmd = command[0];
  const args = command.slice(1);

  if (!cmd) return 1;

  const result = spawnSync(cmd, args, {
    stdio: "pipe",
  });

  if (result.error) {
    if ((result.error as any).code === "ENOENT") {
      return 1;
    }
    return 1; // Default error code
  }

  return result.status ?? 1;
}
