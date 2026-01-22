import { $ } from "bun";
import { mkdir } from "node:fs/promises";

const TARGETS = [
  "bun-linux-x64",
  "bun-linux-arm64",
  "bun-windows-x64",
  "bun-darwin-x64",
  "bun-darwin-arm64",
];

const TOOLS = [
  { name: "diff-cover", entry: "src/diff_cover_tool.ts" },
  { name: "diff-quality", entry: "src/diff_quality_tool.ts" },
];

await mkdir("dist", { recursive: true });

for (const tool of TOOLS) {
  for (const target of TARGETS) {
    const ext = target.includes("windows") ? ".exe" : "";
    const outfile = `dist/${tool.name}-${target}${ext}`;

    console.log(`Building ${tool.name} for ${target}...`);

    try {
      await $`bun build --compile --target ${target} --outfile ${outfile} ${tool.entry}`;
    } catch (e) {
      console.error(`Failed to build for ${target}:`, e);
    }
  }
}

console.log("Build complete! Artifacts are in dist/");
