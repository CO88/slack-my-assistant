import { spawn } from "node:child_process";
import { env } from "../env.js";

export interface ClaudeResult {
  success: boolean;
  content: string;
  error?: string;
}

interface StreamMessage {
  type: string;
  message?: {
    content?: Array<{ type: string; text?: string }>;
  };
  result?: string;
}

function parseStreamOutput(lines: string[]): string {
  // Extract final result from result-type messages
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line) as StreamMessage;

      if (parsed.type === "result" && parsed.result) {
        return parsed.result;
      }
    } catch {
      // Skip invalid JSON lines
    }
  }

  return "";
}

export interface ClaudeOptions {
  sessionId?: string;
  workingDir?: string;
  isNewSession?: boolean;
}

export async function executeClaudeCode(
  prompt: string,
  options?: ClaudeOptions
): Promise<ClaudeResult> {
  return new Promise((resolve) => {
    const args = [
      "-p",
      "--verbose",
      "--output-format", "stream-json",
    ];

    if (env.SKIP_PERMISSIONS) {
      args.push("--dangerously-skip-permissions");
    }

    // Session handling: new sessions use --session-id, existing use --resume
    if (options?.sessionId) {
      if (options.isNewSession) {
        args.push("--session-id", options.sessionId);
      } else {
        args.push("--resume", options.sessionId);
      }
    }

    // Add working directory
    const workingDir = options?.workingDir ?? env.PROJECT_DIRS[0];
    if (workingDir) {
      args.push("--add-dir", workingDir);
    }

    // Add TEMP_DIR
    args.push("--add-dir", env.TEMP_DIR);
    args.push(
      "--append-system-prompt",
      `When you need to create or save any files (markdown, images, code, etc.), always create them in ${env.TEMP_DIR} directory.`
    );

    args.push("--", prompt);

    console.log("[claude] args:", args);

    const child = spawn("claude", args, {
      cwd: workingDir,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const lines: string[] = [];
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => {
      const chunk = data.toString();
      process.stdout.write(chunk);

      // Collect lines for parsing
      for (const line of chunk.split("\n")) {
        if (line.trim()) {
          lines.push(line);
        }
      }
    });

    child.stderr.on("data", (data: Buffer) => {
      const chunk = data.toString();
      process.stderr.write(chunk);
      stderr += chunk;
    });

    child.on("close", (code) => {
      const content = parseStreamOutput(lines);

      if (code === 0) {
        resolve({
          success: true,
          content,
        });
      } else {
        resolve({
          success: false,
          content,
          error: stderr.trim() || `Process exited with code ${code}`,
        });
      }
    });

    child.on("error", (err) => {
      resolve({
        success: false,
        content: "",
        error: err.message,
      });
    });
  });
}
