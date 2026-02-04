import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import type { PluginAPI } from "openclaw/plugin-sdk";

interface SessionState {
  timestamp?: string;
  standing_instructions?: string[];
  short_term?: Array<{ note: string; added?: string; decay?: string }>;
  active_threads?: Array<{
    id: string;
    summary?: string;
    status?: string;
  }>;
  open_questions?: string[];
  context?: string;
}

function parseYaml(content: string): SessionState {
  const state: SessionState = {};
  const lines = content.split("\n");
  let currentKey: string | null = null;
  let currentObject: Record<string, string> | null = null;
  let inContext = false;
  let contextLines: string[] = [];

  for (const line of lines) {
    if (inContext) {
      if (line.startsWith("  ") || line.trim() === "") {
        contextLines.push(line.replace(/^  /, ""));
        continue;
      } else {
        state.context = contextLines.join("\n").trim();
        inContext = false;
      }
    }

    if (line.startsWith("timestamp:")) {
      state.timestamp = line.replace("timestamp:", "").trim();
    } else if (line === "standing_instructions:") {
      currentKey = "standing_instructions";
      state.standing_instructions = [];
    } else if (line === "short_term:") {
      currentKey = "short_term";
      state.short_term = [];
    } else if (line === "active_threads:") {
      currentKey = "active_threads";
      state.active_threads = [];
    } else if (line === "open_questions:") {
      currentKey = "open_questions";
      state.open_questions = [];
    } else if (line.startsWith("context: |")) {
      inContext = true;
      contextLines = [];
    } else if (line.startsWith("  - ") && currentKey) {
      const value = line.replace("  - ", "").trim();
      if (currentKey === "standing_instructions" || currentKey === "open_questions") {
        (state[currentKey] as string[]).push(value);
      } else if (currentKey === "short_term" && value.startsWith("note:")) {
        currentObject = { note: value.replace("note:", "").trim().replace(/^"/, "").replace(/"$/, "") };
        state.short_term!.push(currentObject as any);
      } else if (currentKey === "active_threads" && value.startsWith("id:")) {
        currentObject = { id: value.replace("id:", "").trim() };
        state.active_threads!.push(currentObject as any);
      }
    } else if (line.startsWith("    ") && currentObject) {
      const trimmed = line.trim();
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx > 0) {
        const key = trimmed.slice(0, colonIdx);
        const val = trimmed.slice(colonIdx + 1).trim();
        currentObject[key] = val;
      }
    }
  }

  if (inContext) {
    state.context = contextLines.join("\n").trim();
  }

  return state;
}

function generateStateYaml(state: SessionState, additionalContext?: string): string {
  const now = new Date().toISOString();
  let yaml = `# session state — auto-captured before compaction\n\n`;
  yaml += `timestamp: ${now}\n\n`;

  if (state.standing_instructions?.length) {
    yaml += `standing_instructions:\n`;
    for (const instruction of state.standing_instructions) {
      yaml += `  - ${instruction}\n`;
    }
    yaml += `\n`;
  }

  if (state.short_term?.length) {
    yaml += `short_term:\n`;
    for (const item of state.short_term) {
      yaml += `  - note: "${item.note}"\n`;
      if (item.added) yaml += `    added: ${item.added}\n`;
      if (item.decay) yaml += `    decay: ${item.decay}\n`;
    }
    yaml += `\n`;
  }

  if (state.active_threads?.length) {
    yaml += `active_threads:\n`;
    for (const thread of state.active_threads) {
      yaml += `  - id: ${thread.id}\n`;
      if (thread.summary) yaml += `    summary: ${thread.summary}\n`;
      if (thread.status) yaml += `    status: ${thread.status}\n`;
    }
    yaml += `\n`;
  }

  if (state.open_questions?.length) {
    yaml += `open_questions:\n`;
    for (const q of state.open_questions) {
      yaml += `  - ${q}\n`;
    }
    yaml += `\n`;
  }

  const contextText = additionalContext 
    ? (state.context ? `${state.context}\n\n[auto-captured at compaction]:\n${additionalContext}` : additionalContext)
    : state.context;

  if (contextText) {
    yaml += `context: |\n`;
    for (const line of contextText.split("\n")) {
      yaml += `  ${line}\n`;
    }
  }

  return yaml;
}

export default function register(api: PluginAPI) {
  const logger = api.logger;

  // Register before_compaction hook
  api.registerHook("before_compaction", async (ctx) => {
    try {
      const workspaceDir = ctx.workspaceDir;
      if (!workspaceDir) {
        logger.debug("[continuity-capture] no workspace dir, skipping");
        return;
      }

      const stateFile = join(workspaceDir, "memory", "session-state.yaml");
      
      // Read existing state if present
      let state: SessionState = {};
      if (existsSync(stateFile)) {
        try {
          const content = readFileSync(stateFile, "utf-8");
          state = parseYaml(content);
        } catch (e) {
          logger.warn("[continuity-capture] failed to parse existing state");
        }
      }

      // Add compaction note to context
      const compactionNote = `compaction triggered at ${new Date().toISOString()}`;
      
      // Update timestamp and save
      const updatedYaml = generateStateYaml(state, compactionNote);
      
      // Ensure directory exists
      const memoryDir = dirname(stateFile);
      if (!existsSync(memoryDir)) {
        mkdirSync(memoryDir, { recursive: true });
      }

      writeFileSync(stateFile, updatedYaml);
      logger.info("[continuity-capture] saved state before compaction");
      
    } catch (err) {
      logger.error("[continuity-capture] failed:", err instanceof Error ? err.message : String(err));
    }
  });

  logger.info("[continuity-capture] registered before_compaction hook");
}
