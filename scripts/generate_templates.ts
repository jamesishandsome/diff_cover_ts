import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const TEMPLATES_DIR = path.join(process.cwd(), "templates");
const OUTPUT_FILE = path.join(process.cwd(), "src", "generated_templates.ts");

function generateTemplates() {
  if (!fs.existsSync(TEMPLATES_DIR)) {
    console.error(`Templates directory not found: ${TEMPLATES_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(TEMPLATES_DIR);
  const templates: Record<string, string> = {};

  for (const file of files) {
    const filePath = path.join(TEMPLATES_DIR, file);
    if (fs.statSync(filePath).isFile()) {
      const content = fs.readFileSync(filePath, "utf-8");
      templates[file] = content;
    }
  }

  const fileContent = `// This file is auto-generated. Do not edit manually.
export const TEMPLATES: Record<string, string> = ${JSON.stringify(templates, null, 2)};
`;

  fs.writeFileSync(OUTPUT_FILE, fileContent, "utf-8");

  const formatter = spawnSync("bunx", ["oxfmt", "--write", OUTPUT_FILE], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (formatter.status !== 0) {
    process.exit(formatter.status ?? 1);
  }

  console.log(`Generated templates bundle at ${OUTPUT_FILE}`);
}

generateTemplates();
