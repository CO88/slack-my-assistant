# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**slack-my-assistant** — Slack-to-Claude Code Automation Bot

A utility service that receives messages from Slack, executes them via Claude Code CLI with session management, generates markdown files from the results, and sends the output back to Slack.

### Workflow

```
1. /claude command → Session modal (select directory & session)
2. Slack Message → Claude Code CLI Execution (with session) → Response
3. MD File Generation → Slack Response (threaded text or file attachment)
```

## Technology Stack

- **Runtime**: Node.js (>= 22) with TypeScript
- **Slack Integration**: @slack/bolt (Socket Mode)
- **CLI Integration**: Claude Code CLI
- **Database**: SQLite (better-sqlite3) for session management
- **Validation**: Zod for environment variables

## Project Structure

```
slack-my-assistant/
├── src/
│   ├── index.ts                    # Entry point, registers handlers and starts the app
│   ├── env.ts                      # Environment variable validation (Zod)
│   ├── constants.ts                # Shared constants (limits, modal IDs)
│   ├── types/
│   │   └── index.ts                # Re-exported type definitions
│   ├── services/
│   │   ├── claude.ts               # Claude Code CLI spawn and stream parsing
│   │   ├── markdown.ts             # Response logging as markdown files
│   │   └── session.ts              # SQLite session CRUD and in-memory active tracking
│   ├── slack/
│   │   ├── app.ts                  # Slack Bolt app initialization
│   │   ├── middleware.ts           # User authorization middleware
│   │   ├── modal.ts                # Session selection modal builder
│   │   └── handlers/
│   │       ├── command.ts          # /claude slash command
│   │       ├── view.ts             # Modal submission handler
│   │       └── message.ts          # DM message handler (core flow)
│   └── utils/
│       ├── files.ts                # Slack file download/upload, temp file management
│       ├── format.ts               # Markdown to Slack mrkdwn conversion
│       ├── message.ts              # Message chunking for Slack limits
│       └── time.ts                 # Relative time formatting
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Development Commands

```bash
yarn install    # Install dependencies
yarn dev        # Development mode (tsx, hot reload)
yarn build      # Build TypeScript to dist/
yarn start      # Start production server (from dist/)
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SLACK_SIGNING_SECRET` | Slack app signing secret | Required |
| `SLACK_APP_TOKEN` | Slack app-level token (xapp-) | Required |
| `SLACK_TOKEN` | Slack bot token (xoxb-) | Required |
| `ALLOWED_USERS` | Comma-separated user IDs | Required |
| `PROJECT_DIRS` | Comma-separated project directories | Required |
| `PORT` | Server port | `3000` |
| `SKIP_PERMISSIONS` | Skip Claude Code permission prompts | `true` |
| `OUTPUT_DIR` | Directory for log MD files | `./output` |
| `TEMP_DIR` | Directory for temp MD files | `./temp` |
| `DB_PATH` | SQLite database path | `./data/sessions.db` |

## Architecture Notes

### Session Management

- Sessions are stored in SQLite for persistence
- Active session state is tracked in memory (Map<userId, sessionId>)
- Each user can have multiple sessions; one is active at a time
- `/claude` command opens a modal to create or resume sessions
- Session ID is passed to Claude Code CLI with `--session-id` (new) or `--resume` (existing)

### Message Flow

1. User runs `/claude` command
2. Modal displays directory selection and recent sessions
3. User selects/creates session → Bot confirms activation via DM
4. User sends messages → Bot executes with active session
5. Response sent as threaded text (chunked if needed) or file attachment (if over 8KB)

### Slack App Requirements

- **OAuth Scopes**: `commands`, `chat:write`, `files:read`, `files:write`, `im:read`, `im:write`, `im:history`
- **Socket Mode**: Enabled
- **Slash Commands**: `/claude`
- **Interactivity**: Enabled
- **Event Subscriptions**: `message.im`
