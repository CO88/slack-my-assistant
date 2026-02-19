# slack-my-assistant

A Slack bot that connects to the [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code), enabling you to interact with Claude Code directly from Slack with persistent session management.

## Features

- **Slash command** (`/claude`) to create and manage Claude Code sessions
- **Session persistence** via SQLite — resume conversations across messages
- **File handling** — upload files to Slack and they are passed to Claude Code as context
- **Threaded replies** — all responses are posted in a thread on your message
- **Long response support** — automatically splits messages or uploads as file attachments
- **Markdown logging** — all interactions are saved as markdown files for archival
- **Access control** — restrict usage to specific Slack user IDs

## Prerequisites

- [Node.js](https://nodejs.org/) >= 22.0.0
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- A [Slack App](https://api.slack.com/apps) with Socket Mode enabled

## Installation

```bash
git clone https://github.com/<owner>/slack-my-assistant.git
cd slack-my-assistant
yarn install
cp .env.example .env
```

Edit `.env` with your Slack app credentials and settings.

## Slack App Setup

### 1. Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app
2. Enable **Socket Mode** under Settings > Socket Mode
3. Generate an **App-Level Token** with the `connections:write` scope

### 2. Configure OAuth Scopes

Under **OAuth & Permissions**, add these Bot Token Scopes:

| Scope | Purpose |
|-------|---------|
| `commands` | Slash commands |
| `chat:write` | Send messages |
| `files:read` | Download uploaded files |
| `files:write` | Upload response files |
| `im:read` | Read DM messages |
| `im:write` | Send DM messages |
| `im:history` | Access DM history |

### 3. Add Slash Command

Under **Slash Commands**, create:
- **Command**: `/claude`
- **Description**: Open Claude Code session manager

### 4. Enable Interactivity

Under **Interactivity & Shortcuts**, toggle Interactivity **On**.

### 5. Subscribe to Events

Under **Event Subscriptions**, subscribe to bot events:
- `message.im`

### 6. Install the App

Install the app to your workspace and copy the **Bot User OAuth Token**.

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SLACK_SIGNING_SECRET` | Slack app signing secret | Yes | — |
| `SLACK_APP_TOKEN` | Slack app-level token (`xapp-...`) | Yes | — |
| `SLACK_TOKEN` | Slack bot token (`xoxb-...`) | Yes | — |
| `ALLOWED_USERS` | Comma-separated Slack user IDs | Yes | — |
| `PROJECT_DIRS` | Comma-separated project directory paths | Yes | — |
| `PORT` | Server port | No | `3000` |
| `SKIP_PERMISSIONS` | Skip Claude Code permission prompts | No | `true` |
| `OUTPUT_DIR` | Directory for response log files | No | `./output` |
| `TEMP_DIR` | Directory for temporary files | No | `./temp` |
| `DB_PATH` | Path to SQLite database file | No | `./data/sessions.db` |

## Usage

### Start the bot

```bash
# Development
yarn dev

# Production
yarn build && yarn start
```

### Interact via Slack

1. Open a direct message with the bot
2. Run `/claude` to open the session manager
3. Select a working directory and create or resume a session
4. Send messages — they are forwarded to Claude Code and responses are sent back in a thread
5. Attach files — they are downloaded and passed to Claude Code as context

## How It Works

```
User sends /claude  →  Session modal (select directory & session)
User sends message  →  Claude Code CLI execution (with session ID)
Claude responds     →  Markdown log saved + response sent to Slack thread
```

- Sessions are stored in a local SQLite database
- Each user can have multiple sessions; one is active at a time
- Claude Code is invoked via the CLI with `--session-id` (new) or `--resume` (existing)
- Responses exceeding 8000 characters are uploaded as file attachments
- All interactions are logged as markdown files in the output directory

## Security Considerations

- **Access control**: Only Slack users listed in `ALLOWED_USERS` can interact with the bot.
- **Permission flag**: By default, the bot runs Claude Code with `--dangerously-skip-permissions`, which grants Claude Code full access within the specified directories. Set `SKIP_PERMISSIONS=false` to require manual permission approval for each action.
- **Secrets**: Never commit your `.env` file. Use `.env.example` as a template.
- **Directory access**: `PROJECT_DIRS` controls which directories Claude Code can access. Only add directories you trust Claude Code to operate in.

## Project Structure

```
slack-my-assistant/
├── src/
│   ├── index.ts                    # Entry point
│   ├── env.ts                      # Environment variable validation (Zod)
│   ├── constants.ts                # Shared constants
│   ├── types/
│   │   └── index.ts                # Re-exported types
│   ├── services/
│   │   ├── claude.ts               # Claude Code CLI execution
│   │   ├── markdown.ts             # Markdown file generation
│   │   └── session.ts              # SQLite session management
│   ├── slack/
│   │   ├── app.ts                  # Slack Bolt app initialization
│   │   ├── middleware.ts           # Auth middleware
│   │   ├── modal.ts                # Session modal builder
│   │   └── handlers/
│   │       ├── command.ts          # /claude slash command
│   │       ├── view.ts             # Modal submission handler
│   │       └── message.ts          # Message handler (core logic)
│   └── utils/
│       ├── files.ts                # File download/upload utilities
│       ├── format.ts               # Markdown-to-Slack formatting
│       ├── message.ts              # Message splitting
│       └── time.ts                 # Time formatting
├── .env.example                    # Environment variable template
├── package.json
├── tsconfig.json
└── README.md
```

## License

[MIT](LICENSE)
