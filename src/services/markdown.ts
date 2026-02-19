import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { env } from "../env.js";
import type { ClaudeResult } from "./claude.js";

export interface MarkdownMeta {
  user: string;
  prompt: string;
  timestamp: Date;
}

function formatFilename(meta: MarkdownMeta): string {
  const date = meta.timestamp.toISOString().replace(/[:.]/g, "-");
  return `${date}_${meta.user}.md`;
}

function formatMarkdown(result: ClaudeResult, meta: MarkdownMeta): string {
  const lines = [
    `# Claude Code Result`,
    ``,
    `- **User**: ${meta.user}`,
    `- **Date**: ${meta.timestamp.toISOString()}`,
    ``,
    `## Prompt`,
    ``,
    "```",
    meta.prompt,
    "```",
    ``,
    `## Response`,
    ``,
    result.content,
  ];

  if (!result.success && result.error) {
    lines.push(``, `## Error`, ``, "```", result.error, "```");
  }

  return lines.join("\n");
}

export async function saveAsMarkdown(
  result: ClaudeResult,
  meta: MarkdownMeta
): Promise<string> {
  await mkdir(env.OUTPUT_DIR, { recursive: true });

  const filename = formatFilename(meta);
  const filePath = join(env.OUTPUT_DIR, filename);
  const content = formatMarkdown(result, meta);

  await writeFile(filePath, content, "utf-8");

  return filePath;
}
