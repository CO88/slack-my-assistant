import type { App } from "@slack/bolt";
import type { SessionService } from "../../services/session.js";
import { executeClaudeCode } from "../../services/claude.js";
import { saveAsMarkdown } from "../../services/markdown.js";
import { authMiddleware } from "../middleware.js";
import { sayLongMessage } from "../../utils/message.js";
import { markdownToSlackMrkdwn } from "../../utils/format.js";
import { downloadSlackFiles, findTempFiles, uploadAndDeleteFiles, cleanupFiles, uploadTextAsFile } from "../../utils/files.js";
import type { DownloadedFile } from "../../utils/files.js";
import { SLACK_FILE_UPLOAD_THRESHOLD } from "../../constants.js";
import { env } from "../../env.js";

function buildPromptWithFiles(text: string | undefined, files: DownloadedFile[]): string {
  const parts: string[] = [];

  if (files.length > 0) {
    const fileList = files.map(f => `- ${f.path}`).join("\n");
    parts.push(`[Attached files]\n${fileList}`);
  }

  if (text) {
    parts.push(text);
  } else if (files.length > 0) {
    parts.push("Please analyze the attached files.");
  }

  return parts.join("\n\n");
}

export function registerMessageHandler(app: App, sessionService: SessionService): void {
  app.message(authMiddleware, async ({ message, say, client }) => {
    const allowedSubtypes = new Set([undefined, "file_share"]);
    const subtype = "subtype" in message ? message.subtype : undefined;
    if (!allowedSubtypes.has(subtype)) {
      return;
    }

    const text = "text" in message ? message.text : undefined;
    const files = "files" in message ? (message as { files?: unknown[] }).files : undefined;

    if (!text && (!files || files.length === 0)) {
      return;
    }

    const user = "user" in message ? message.user : "unknown";
    const channel = message.channel;
    const threadTs = "ts" in message ? message.ts : undefined;

    const session = sessionService.getActiveSession(user);

    if (!session) {
      if (threadTs) {
        await say({ text: "No active session. Use `/claude` command to start a session.", thread_ts: threadTs });
      } else {
        await say("No active session. Use `/claude` command to start a session.");
      }
      return;
    }

    const isNewSession = !session.name;
    if (isNewSession && text) {
      sessionService.updateSessionName(session.sessionId, text);
    }

    // Download attached files from Slack
    let downloaded: DownloadedFile[] = [];
    if (files && files.length > 0) {
      if (threadTs) {
        await say({ text: `Downloading ${files.length} file(s)...`, thread_ts: threadTs });
      } else {
        await say(`Downloading ${files.length} file(s)...`);
      }
      downloaded = await downloadSlackFiles(
        files as { name?: string | null; url_private_download?: string; mimetype?: string }[],
        env.SLACK_TOKEN,
      );
    }

    const prompt = buildPromptWithFiles(text, downloaded);
    const downloadedPaths = downloaded.map(f => f.path);

    if (threadTs) {
      await say({ text: "Processing your request...", thread_ts: threadTs });
    } else {
      await say("Processing your request...");
    }

    const result = await executeClaudeCode(prompt, {
      sessionId: session.sessionId,
      workingDir: session.workingDir,
      isNewSession,
    });

    sessionService.updateLastUsed(session.sessionId);

    // Save markdown for logging/archival
    await saveAsMarkdown(result, {
      user,
      prompt,
      timestamp: new Date(),
    });

    // Send only the Claude response content to Slack (not the full markdown template)
    const responseContent = result.content || (result.error ? `Error: ${result.error}` : "No response received.");
    const slackContent = markdownToSlackMrkdwn(responseContent);

    if (slackContent.length > SLACK_FILE_UPLOAD_THRESHOLD) {
      if (threadTs) {
        await say({ text: "Response is long. Uploading as a file...", thread_ts: threadTs });
      } else {
        await say("Response is long. Uploading as a file...");
      }
      await uploadTextAsFile(client, channel, responseContent, `claude-response-${Date.now()}.md`, threadTs);
    } else {
      await sayLongMessage(say, slackContent, threadTs);
    }

    // Find newly created files (exclude downloaded input files)
    const tempFiles = await findTempFiles(downloadedPaths);
    if (tempFiles.length > 0) {
      await uploadAndDeleteFiles(client, channel, tempFiles, threadTs);
    }

    // Cleanup downloaded input files
    if (downloadedPaths.length > 0) {
      await cleanupFiles(downloadedPaths);
    }
  });
}
