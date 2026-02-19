import type { View } from "@slack/types";
import type { UserSession } from "../services/session.js";
import { env } from "../env.js";
import { formatTimeAgo } from "../utils/time.js";
import { MODAL_IDS, RECENT_SESSIONS_LIMIT } from "../constants.js";

export function buildSessionModal(
  userSessions: UserSession[],
  activeSession: UserSession | null
): View {
  const projectOptions = env.PROJECT_DIRS.map(dir => ({
    text: { type: "plain_text" as const, text: dir },
    value: dir,
  }));

  const recentSessions = userSessions.slice(0, RECENT_SESSIONS_LIMIT);
  const sessionOptions = [
    {
      text: { type: "plain_text" as const, text: "✨ New Session" },
      value: "new",
    },
    ...recentSessions.map(s => {
      const name = s.name ?? s.sessionId.slice(0, 8) + "...";
      const activeLabel = s.isActive ? " ✓" : "";
      return {
        text: {
          type: "plain_text" as const,
          text: `(${formatTimeAgo(s.lastUsedAt)}) ${name}${activeLabel}`,
        },
        value: s.sessionId,
      };
    }),
  ];

  const firstDirOption = projectOptions[0];
  const blocks: View["blocks"] = [];

  if (activeSession) {
    const sessionName = activeSession.name ?? "New Session";
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Current Session*\n📝 ${sessionName}\n📁 \`${activeSession.workingDir}\`\n🕐 ${formatTimeAgo(activeSession.lastUsedAt)}`,
      },
    });
    blocks.push({ type: "divider" });
  } else {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*No active session*\nCreate a new session or resume an existing one.",
      },
    });
    blocks.push({ type: "divider" });
  }

  blocks.push({
    type: "input",
    block_id: MODAL_IDS.WORKING_DIR_BLOCK,
    label: { type: "plain_text", text: "Working Directory" },
    element: {
      type: "static_select",
      action_id: MODAL_IDS.WORKING_DIR_SELECT,
      placeholder: { type: "plain_text", text: "Select a directory" },
      options: projectOptions,
      ...(firstDirOption ? { initial_option: firstDirOption } : {}),
    },
  });

  const firstSessionOption = sessionOptions[0];
  blocks.push({
    type: "input",
    block_id: MODAL_IDS.SESSION_BLOCK,
    label: { type: "plain_text", text: "Session (Recent 10)" },
    element: {
      type: "static_select",
      action_id: MODAL_IDS.SESSION_SELECT,
      placeholder: { type: "plain_text", text: "Select a session..." },
      options: sessionOptions,
      ...(firstSessionOption ? { initial_option: firstSessionOption } : {}),
    },
  });

  return {
    type: "modal",
    callback_id: MODAL_IDS.SESSION,
    title: { type: "plain_text", text: "Claude Session" },
    submit: { type: "plain_text", text: "Start" },
    close: { type: "plain_text", text: "Cancel" },
    blocks,
  };
}
