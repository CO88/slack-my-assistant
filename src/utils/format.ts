/**
 * Convert basic Markdown to Slack mrkdwn format.
 * Only converts patterns where Markdown and Slack mrkdwn differ.
 * Code blocks are left unchanged (Slack handles them natively).
 */
export function markdownToSlackMrkdwn(text: string): string {
  const lines = text.split("\n");
  let inCodeBlock = false;
  const result: string[] = [];

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      result.push(line);
      continue;
    }

    if (inCodeBlock) {
      result.push(line);
      continue;
    }

    let transformed = line;

    // # Header → *Header*
    transformed = transformed.replace(
      /^(#{1,6})\s+(.+)$/,
      (_match, _hashes: string, content: string) => `*${content}*`,
    );

    // **bold** → *bold*
    transformed = transformed.replace(/\*\*(.+?)\*\*/g, "*$1*");

    result.push(transformed);
  }

  return result.join("\n");
}
