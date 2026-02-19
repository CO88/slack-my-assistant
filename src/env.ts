import { resolve } from "node:path";
import { z } from "zod/v4";

const toAbsolutePath = (val: string) => resolve(val);

const envSchema = z.object({
  SLACK_SIGNING_SECRET: z.string().min(1, "SLACK_SIGNING_SECRET is required"),
  SLACK_APP_TOKEN: z.string().startsWith("xapp-", "Must be a valid Slack app token"),
  SLACK_TOKEN: z.string().startsWith("xoxb-", "Must be a valid Slack bot token"),

  ALLOWED_USERS: z.string()
    .transform((val) => val.split(",").map(s => s.trim()).filter(Boolean)),

  PROJECT_DIRS: z.string()
    .transform((val) => val.split(",").map(s => s.trim()).filter(Boolean)),

  PORT: z.string().default("3000").transform(Number),
  SKIP_PERMISSIONS: z.string().default("true").transform(val => val === "true"),

  MCP_CONFIG_PATH: z.string().optional().transform(val => val ? toAbsolutePath(val) : undefined),

  OUTPUT_DIR: z.string().default("./output").transform(toAbsolutePath),
  TEMP_DIR: z.string().default("./temp").transform(toAbsolutePath),
  DB_PATH: z.string().default("./data/sessions.db").transform(toAbsolutePath),
});

export const env = envSchema.parse(process.env);
