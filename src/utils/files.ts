import type { WebClient } from "@slack/web-api";
import { writeFile, readFile, readdir, unlink, mkdir } from "node:fs/promises";
import { join, basename } from "node:path";
import { env } from "../env.js";

interface SlackFile {
  name?: string | null;
  url_private_download?: string;
  mimetype?: string;
}

export interface DownloadedFile {
  path: string;
  name: string;
  mimetype: string;
}

export async function downloadSlackFiles(
  files: SlackFile[],
  token: string,
): Promise<DownloadedFile[]> {
  await mkdir(env.TEMP_DIR, { recursive: true });

  const results: DownloadedFile[] = [];

  for (const file of files) {
    const url = file.url_private_download;
    if (!url) {
      console.error(`[files] No download URL for: ${file.name}`);
      continue;
    }

    try {
      console.log(`[files] Downloading: ${file.name} from ${url}`);

      // Follow redirects manually to preserve Authorization header across domains.
      // Native fetch strips auth headers on cross-origin redirects.
      let res: Response;
      let currentUrl = url;
      const maxRedirects = 5;

      for (let i = 0; i <= maxRedirects; i++) {
        res = await fetch(currentUrl, {
          headers: { Authorization: `Bearer ${token}` },
          redirect: "manual",
        });

        console.log(`[files] Hop ${i}: status=${res.status}, url=${currentUrl}`);

        if (res.status >= 300 && res.status < 400) {
          const location = res.headers.get("location");
          if (!location) break;
          currentUrl = location;
          continue;
        }
        break;
      }

      console.log(`[files] Response: status=${res!.status}, content-type=${res!.headers.get("content-type")}, url=${currentUrl}`);

      // Detect auth failure: Slack returns HTML login page instead of the file
      const contentType = res!.headers.get("content-type") ?? "";
      if (contentType.includes("text/html")) {
        console.error(`[files] Auth failed for ${file.name}: received HTML instead of file. Check that the bot token has 'files:read' scope.`);
        continue;
      }

      if (!res!.ok) {
        console.error(`[files] Download failed (${res!.status}): ${await res!.text()}`);
        continue;
      }

      const buffer = Buffer.from(await res!.arrayBuffer());
      console.log(`[files] Buffer size: ${buffer.length} bytes`);

      if (buffer.length === 0) {
        console.error(`[files] Empty file: ${file.name}`);
        continue;
      }

      const filename = `${Date.now()}_${file.name ?? "file"}`;
      const filePath = join(env.TEMP_DIR, filename);
      await writeFile(filePath, buffer);

      results.push({
        path: filePath,
        name: file.name ?? "file",
        mimetype: file.mimetype ?? "application/octet-stream",
      });
      console.log(`[files] Saved: ${filePath}`);
    } catch (err) {
      console.error(`[files] Failed to download ${file.name}:`, err);
    }
  }

  return results;
}

export async function findTempFiles(exclude: string[] = []): Promise<string[]> {
  try {
    await mkdir(env.TEMP_DIR, { recursive: true });
    const files = await readdir(env.TEMP_DIR);
    const excludeSet = new Set(exclude);
    return files
      .map(f => join(env.TEMP_DIR, f))
      .filter(f => !excludeSet.has(f));
  } catch {
    return [];
  }
}

export async function cleanupFiles(files: string[]): Promise<void> {
  for (const filePath of files) {
    try {
      await unlink(filePath);
    } catch {
      // ignore
    }
  }
}

export async function uploadAndDeleteFiles(
  client: WebClient,
  channel: string,
  files: string[],
  threadTs?: string,
): Promise<void> {
  for (const filePath of files) {
    const content = await readFile(filePath);
    if (threadTs) {
      await client.files.uploadV2({ channel_id: channel, file: content, filename: basename(filePath), thread_ts: threadTs });
    } else {
      await client.files.uploadV2({ channel_id: channel, file: content, filename: basename(filePath) });
    }
    await unlink(filePath);
  }
}

export async function uploadTextAsFile(
  client: WebClient,
  channel: string,
  content: string,
  filename: string,
  threadTs?: string,
): Promise<void> {
  if (threadTs) {
    await client.files.uploadV2({ channel_id: channel, content, filename, thread_ts: threadTs });
  } else {
    await client.files.uploadV2({ channel_id: channel, content, filename });
  }
}