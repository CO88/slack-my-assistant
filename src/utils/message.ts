import type { SayFn } from "@slack/bolt";
import { SLACK_MESSAGE_LIMIT } from "../constants.js";

export function splitMessage(content: string): string[] {
  if (content.length <= SLACK_MESSAGE_LIMIT) {
    return [content];
  }

  const chunks: string[] = [];
  let remaining = content;

  while (remaining.length > 0) {
    if (remaining.length <= SLACK_MESSAGE_LIMIT) {
      chunks.push(remaining);
      break;
    }

    let splitIndex = remaining.lastIndexOf("\n", SLACK_MESSAGE_LIMIT);
    if (splitIndex === -1 || splitIndex < SLACK_MESSAGE_LIMIT / 2) {
      splitIndex = SLACK_MESSAGE_LIMIT;
    }

    chunks.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex).trimStart();
  }

  return chunks;
}

export async function sayLongMessage(say: SayFn, content: string, threadTs?: string): Promise<void> {
  const chunks = splitMessage(content);
  for (const chunk of chunks) {
    if (threadTs) {
      await say({ text: chunk, thread_ts: threadTs });
    } else {
      await say(chunk);
    }
  }
}
