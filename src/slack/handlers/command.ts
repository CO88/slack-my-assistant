import type { App } from "@slack/bolt";
import type { SessionService } from "../../services/session.js";
import { env } from "../../env.js";
import { buildSessionModal } from "../modal.js";

export function registerCommandHandler(app: App, sessionService: SessionService): void {
  app.command("/claude", async ({ ack, body, client }) => {
    await ack();

    if (!env.ALLOWED_USERS.includes(body.user_id)) {
      return;
    }

    const userSessions = sessionService.getUserSessions(body.user_id);
    const activeSession = sessionService.getActiveSession(body.user_id);

    await client.views.open({
      trigger_id: body.trigger_id,
      view: buildSessionModal(userSessions, activeSession),
    });
  });
}
