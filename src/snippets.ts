import * as fs from "fs";
import * as path from "path";
import jschardet from "jschardet";
import hljs from "highlight.js";
import { GitPathTool } from "./git_path";

export class Snippet {
  static VIOLATION_COLOR = "#ffcccc";
  static DIV_CSS_CLASS = "snippet";
  static NUM_CONTEXT_LINES = 4;
  static MAX_GAP_IN_SNIPPET = 4;

  static LEXER_TO_MARKDOWN_CODE_HINT: { [key: string]: string } = {
    python: "python",
    "c++": "cpp",
    cpp: "cpp",
    typescript: "typescript",
    ts: "typescript",
    javascript: "javascript",
    js: "javascript",
    java: "java",
    xml: "xml",
    html: "html",
    css: "css",
    json: "json",
    markdown: "markdown",
    md: "markdown",
  };

  private _srcFilename: string;
  private _startLine: number;
  private _lastLine: number;
  private _violationLines: number[];
  private _lines: string[];
  private _language: string;

  constructor(
    lines: string[],
    srcFilename: string,
    startLine: number,
    lastLine: number,
    violationLines: number[],
    language: string,
  ) {
    if (startLine < 1) {
      throw new Error("Start line must be >= 1");
    }
    this._lines = lines;
    this._srcFilename = srcFilename;
    this._startLine = startLine;
    this._lastLine = lastLine;
    this._violationLines = violationLines;
    this._language = language;
  }

  static styleDefs(): string {
    // Simple CSS for highlighting violation lines
    return `
.snippet .hll { background-color: ${Snippet.VIOLATION_COLOR} }
.snippet { background: #f0f0f0; }
.snippet .linenos { color: #888; border-right: 1px solid #ccc; padding-right: 5px; margin-right: 5px; user-select: none; }
.snippet pre { margin: 0; }
        `;
  }

  html(): string {
    // Generate HTML similar to Pygments HtmlFormatter
    const linesHtml: string[] = [];
    const lineNosHtml: string[] = [];

    for (let i = 0; i < this._lines.length; i++) {
      const lineNum = this._startLine + i;
      const lineContent = this._lines[i]!;
      const isViolation = this._violationLines.includes(lineNum);

      // Highlight code
      let highlighted: string;
      try {
        if (this._language && hljs.getLanguage(this._language)) {
          highlighted = hljs.highlight(lineContent, { language: this._language }).value;
        } else {
          highlighted = hljs.highlightAuto(lineContent).value;
        }
      } catch {
        highlighted = lineContent; // Fallback
      }

      // Wrap in span if violation
      if (isViolation) {
        linesHtml.push(`<span class="hll">${highlighted}</span>`);
      } else {
        linesHtml.push(highlighted);
      }

      // Line number
      lineNosHtml.push(`<span${isViolation ? ' class="hll"' : ""}>${lineNum}</span>`);
    }

    return `
<div class="${Snippet.DIV_CSS_CLASS}">
<table class="highlighttable">
<tr>
<td class="linenos"><div class="linenodiv"><pre>${lineNosHtml.join("\n")}</pre></div></td>
<td class="code"><div class="highlight"><pre>${linesHtml.join("\n")}</pre></div></td>
</tr>
</table>
</div>
        `.trim();
  }

  markdown(): string {
    const lineNumLen = String(this._lastLine).length;
    let text = "";

    for (let i = 0; i < this._lines.length; i++) {
      const lineNum = this._startLine + i;
      const lineContent = this._lines[i];
      const isViolation = this._violationLines.includes(lineNum);

      const notice = isViolation ? "!" : " ";
      const paddedLineNum = String(lineNum).padStart(lineNumLen, " ");

      if (i > 0) text += "\n";
      text += `${notice} ${paddedLineNum} ${lineContent}`;
    }

    const header = `Lines ${this._startLine}-${this._lastLine}\n\n`;
    const codeHint = Snippet.LEXER_TO_MARKDOWN_CODE_HINT[this._language] || "";

    return `${header}\`\`\`${codeHint}\n${text}\n\`\`\`\n`;
  }

  terminal(): string {
    // Terminal output (no colors for now, just text)
    // Similar to markdown but without fence
    const lineNumLen = String(this._lastLine).length;
    let text = "";

    for (let i = 0; i < this._lines.length; i++) {
      const lineNum = this._startLine + i;
      const lineContent = this._lines[i];
      const isViolation = this._violationLines.includes(lineNum);

      const notice = isViolation ? "!" : " ";
      const paddedLineNum = String(lineNum).padStart(lineNumLen, " ");

      if (i > 0) text += "\n";
      text += `${notice} ${paddedLineNum} ${lineContent}`;
    }

    return text;
  }

  static loadFormattedSnippets(
    srcPath: string,
    violationLines: number[],
  ): { html: string[]; markdown: string[]; terminal: string[] } {
    const snippets = Snippet.loadSnippets(srcPath, violationLines);
    return {
      html: snippets.map((s) => s.html()),
      markdown: snippets.map((s) => s.markdown()),
      terminal: snippets.map((s) => s.terminal()),
    };
  }

  static loadContents(srcPath: string): string {
    const relativePath = GitPathTool.relativePath(srcPath);
    let buffer: Buffer;
    try {
      buffer = fs.readFileSync(relativePath);
    } catch {
      // Try absolute path if relative failed
      try {
        buffer = fs.readFileSync(srcPath);
      } catch {
        console.warn(`Could not read file ${srcPath}`);
        return "";
      }
    }

    const detection = jschardet.detect(buffer);
    const encoding = detection.encoding || "utf-8";

    try {
      const decoder = new TextDecoder(encoding);
      return decoder.decode(buffer);
    } catch {
      console.warn(
        `Could not decode file ${srcPath} with encoding ${encoding}. Falling back to utf-8 replace.`,
      );
      const decoder = new TextDecoder("utf-8", { fatal: false });
      return decoder.decode(buffer);
    }
  }

  static loadSnippets(srcPath: string, violationLines: number[]): Snippet[] {
    const contents = Snippet.loadContents(srcPath);
    if (!contents) return [];

    const srcLines = contents.split(/\r?\n/);
    const snippetRanges = Snippet._snippetRanges(srcLines.length, violationLines);
    const language = Snippet._getLanguage(srcPath);

    const snippets: Snippet[] = [];
    for (const [start, end] of snippetRanges) {
      // start and end are 1-based inclusive
      // srcLines is 0-based array
      const lines = srcLines.slice(start - 1, end);
      snippets.push(new Snippet(lines, srcPath, start, end, violationLines, language));
    }

    return snippets;
  }

  private static _snippetRanges(numSrcLines: number, violationLines: number[]): [number, number][] {
    let currentStart: number | null = null;
    let currentEnd: number | null = null;
    let linesSinceLastViolation = 0;
    const snippetRanges: [number, number][] = [];

    // violationLines is list of line numbers (1-based? Python code implies 1-based comparison, but passed as list)
    // Python code: "list of line numbers, starting at index 0" - wait, "starting at index 0" usually means the list is 0-indexed, but the values are line numbers.
    // "start_line is the line number of first line... The first line in the file is line number 1."
    // And "violation_lines is a list of line numbers to highlight".
    // Let's assume violationLines contains 1-based line numbers.

    for (let lineNum = 1; lineNum <= numSrcLines; lineNum++) {
      if (currentStart === null) {
        if (violationLines.includes(lineNum)) {
          const snippetStart = Math.max(1, lineNum - Snippet.NUM_CONTEXT_LINES);
          currentStart = snippetStart;
          linesSinceLastViolation = 0;
        }
      } else if (currentEnd === null) {
        if (violationLines.includes(lineNum)) {
          linesSinceLastViolation = 0;
        } else if (linesSinceLastViolation > Snippet.MAX_GAP_IN_SNIPPET) {
          let snippetEnd = lineNum - linesSinceLastViolation;
          snippetEnd = Math.min(numSrcLines, snippetEnd + Snippet.NUM_CONTEXT_LINES);
          currentEnd = snippetEnd;

          snippetRanges.push([currentStart, currentEnd]);
          currentStart = null;
          currentEnd = null;
        }
        linesSinceLastViolation++;
      }
    }

    if (currentStart !== null && currentEnd === null) {
      snippetRanges.push([currentStart, numSrcLines]);
    }

    return snippetRanges;
  }

  private static _getLanguage(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    // Simple mapping
    const map: { [key: string]: string } = {
      ".py": "python",
      ".ts": "typescript",
      ".js": "javascript",
      ".java": "java",
      ".cpp": "cpp",
      ".c": "c",
      ".h": "c",
      ".cs": "csharp",
      ".go": "go",
      ".rs": "rust",
      ".php": "php",
      ".rb": "ruby",
      ".html": "xml",
      ".xml": "xml",
      ".css": "css",
      ".json": "json",
      ".md": "markdown",
    };
    return map[ext] || "plaintext";
  }
}
