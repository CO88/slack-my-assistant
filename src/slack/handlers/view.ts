import type { App } from "@slack/bolt";
import type { SessionService } from "../../services/session.js";
import { MODAL_IDS } from "../../constants.js";

export function registerViewHandler(app: App, sessionService: SessionService): void {
  app.view(MODAL_IDS.SESSION, async ({ ack, body, view, client }) => {
    await ack();

    const userId = body.user.id;
    const workingDirBlock = view.state.values[MODAL_IDS.WORKING_DIR_BLOCK];
    const sessionBlock = view.state.values[MODAL_IDS.SESSION_BLOCK];

    const workingDir = workingDirBlock?.[MODAL_IDS.WORKING_DIR_SELECT]?.selected_option?.value;
    const selectedSession = sessionBlock?.[MODAL_IDS.SESSION_SELECT]?.selected_option?.value;

    if (!workingDir) {
      return;
    }

    let session;

    if (selectedSession === "new") {
      session = sessionService.createSession(userId, workingDir);
    } else if (selectedSession) {
      sessionService.activateSession(userId, selectedSession);
      const activeSession = sessionService.getActiveSession(userId);
      if (!activeSession) {
        return;
      }
      session = activeSession;
    } else {
      return;
    }

    const sessionName = session.name ?? "New Session";
    await client.chat.postMessage({
      channel: userId,
      text: `✅ *Session activated*\n📝 ${sessionName}\n📁 \`${session.workingDir}\`\n\nYou can now send messages to continue the conversation.`,
    });
  });
}
