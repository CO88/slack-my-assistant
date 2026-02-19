import { App } from "@slack/bolt";
import { env } from "../env.js";

export const app = new App({
  signingSecret: env.SLACK_SIGNING_SECRET,
  appToken: env.SLACK_APP_TOKEN,
  token: env.SLACK_TOKEN,
  socketMode: true,
});
