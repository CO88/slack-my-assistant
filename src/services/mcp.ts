import { readFileSync, existsSync } from "node:fs";

interface McpServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface McpServerEntry {
  keywords: string[];
  config: McpServerConfig;
}

interface McpFileConfig {
  servers: Record<string, McpServerEntry>;
}

export class McpService {
  private config: McpFileConfig | null = null;

  constructor(configPath?: string) {
    if (configPath && existsSync(configPath)) {
      const raw = readFileSync(configPath, "utf-8");
      this.config = JSON.parse(raw) as McpFileConfig;
      console.log(
        `[mcp] Loaded config with servers: ${Object.keys(this.config.servers).join(", ")}`
      );
    }
  }

  /**
   * Match keywords in the message and return a filtered MCP config JSON string.
   * Returns undefined if no servers matched.
   */
  matchConfig(message: string): string | undefined {
    if (!this.config) return undefined;

    const lowerMessage = message.toLowerCase();
    const matched: Record<string, McpServerConfig> = {};

    for (const [name, entry] of Object.entries(this.config.servers)) {
      const isMatch = entry.keywords.some(kw =>
        lowerMessage.includes(kw.toLowerCase())
      );
      if (isMatch) {
        matched[name] = this.resolveEnv(entry.config);
      }
    }

    if (Object.keys(matched).length === 0) return undefined;

    console.log(`[mcp] Matched servers: ${Object.keys(matched).join(", ")}`);
    return JSON.stringify({ mcpServers: matched });
  }

  /** Resolve ${VAR} and ${VAR:-default} patterns from process.env */
  private resolveEnv(config: McpServerConfig): McpServerConfig {
    if (!config.env) return config;

    const resolvedEnv: Record<string, string> = {};
    for (const [key, value] of Object.entries(config.env)) {
      resolvedEnv[key] = value.replace(
        /\$\{(\w+)(?::-(.*?))?\}/g,
        (_, name: string, defaultVal?: string) =>
          process.env[name] ?? defaultVal ?? ""
      );
    }

    return { ...config, env: resolvedEnv };
  }
}
