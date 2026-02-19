import type { App } from "@slack/bolt";
import type { SessionService } from "../../services/session.js";
import { MODAL_IDS } from "../../constants.js";

export function registerViewHandler(app: App, sessionService: SessionService): void {
  app.view(MODAL_IDS.SESSION, async ({ ack, body, view }) => {
    const userId = body.user.id;
    const workingDirBlock = view.state.values[MODAL_IDS.WORKING_DIR_BLOCK];
    const sessionBlock = view.state.values[MODAL_IDS.SESSION_BLOCK];

    const workingDir = workingDirBlock?.[MODAL_IDS.WORKING_DIR_SELECT]?.selected_option?.value;
    const selectedSession = sessionBlock?.[MODAL_IDS.SESSION_SELECT]?.selected_option?.value;

    if (!workingDir) {
      await ack();
      return;
    }

    let session;

    if (selectedSession === "new") {
      session = sessionService.createSession(userId, workingDir);
    } else if (selectedSession) {
      sessionService.activateSession(userId, selectedSession);
      const activeSession = sessionService.getActiveSession(userId);
      if (!activeSession) {
        await ack();
        return;
      }
      session = activeSession;
    } else {
      await ack();
      return;
    }

    const sessionName = session.name ?? "New Session";
    await ack({
      response_action: "update",
      view: {
        type: "modal",
        title: { type: "plain_text", text: "Session Activated" },
        close: { type: "plain_text", text: "Close" },
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `✅ *Session activated*\n\n📝 ${sessionName}\n📁 \`${session.workingDir}\`\n\nYou can now send messages to continue the conversation.`,
            },
          },
        ],
      },
    });
  });
}
