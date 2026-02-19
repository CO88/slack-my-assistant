import { app } from "./slack/app.js";
import { SessionService } from "./services/session.js";
import { env } from "./env.js";
import { registerCommandHandler } from "./slack/handlers/command.js";
import { registerViewHandler } from "./slack/handlers/view.js";
import { registerMessageHandler } from "./slack/handlers/message.js";

const sessionService = new SessionService(env.DB_PATH);

registerCommandHandler(app, sessionService);
registerViewHandler(app, sessionService);
registerMessageHandler(app, sessionService);

(async () => {
  await app.start(env.PORT);
  app.logger.info("⚡️ Slack bot is running!");
})().catch(e => {
  console.log(e)
});
