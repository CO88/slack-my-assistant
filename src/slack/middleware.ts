import type { Middleware, SlackEventMiddlewareArgs } from "@slack/bolt";
import { env } from "../env.js";

export const authMiddleware: Middleware<SlackEventMiddlewareArgs<"message">> = async ({
  message,
  next,
}) => {
  if ("user" in message && env.ALLOWED_USERS.includes(message.user)) {
    await next();
  }
};
