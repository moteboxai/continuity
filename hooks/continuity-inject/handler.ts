import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import type { HookHandler } from "openclaw/hooks";

interface SessionState {
  timestamp?: string;
  standing_instructions?: string[];
  short_term?: Array<{ note: string; added?: string; decay?: string }>;
  active_threads?: Array<{
    id: string;
    summary?: string;
    status?: string;
    where_i_left_off?: string;
  }>;
  open_questions?: string[];
  context?: string;
}

function parseYaml(content: string): SessionState {
  // simple yaml parser for our known structure
  const state: SessionState = {};
  const lines = content.split("\n");
  let currentKey: string | null = null;
  let currentList: string[] = [];
  let currentObject: Record<string, string> | null = null;
  let inContext = false;
  let contextLines: string[] = [];

  for (const line of lines) {
    // context block (multiline)
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
        // start new short_term object
        currentObject = { note: value.replace("note:", "").trim().replace(/^"/, "").replace(/"$/, "") };
        state.short_term!.push(currentObject as any);
      } else if (currentKey === "active_threads" && value.startsWith("id:")) {
        currentObject = { id: value.replace("id:", "").trim() };
        state.active_threads!.push(currentObject as any);
      }
    } else if (line.startsWith("    ") && currentObject) {
      // nested properties
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

function formatTimeSince(timestamp: string): string {
  const then = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  return "just now";
}

function assessStaleness(timestamp: string): "fresh" | "recent" | "stale" {
  const then = new Date(timestamp);
  const now = new Date();
  const diffHours = (now.getTime() - then.getTime()) / 3600000;

  if (diffHours < 2) return "fresh";
  if (diffHours < 24) return "recent";
  return "stale";
}

function generateBootstrap(state: SessionState): string {
  const now = new Date().toISOString();
  const timeSince = state.timestamp ? formatTimeSince(state.timestamp) : "unknown";
  const staleness = state.timestamp ? assessStaleness(state.timestamp) : "stale";

  let md = `# session state\n\n`;
  md += `**last active:** ${state.timestamp || "unknown"}  \n`;
  md += `**now:** ${now}  \n`;
  md += `**gap:** ${timeSince}`;

  if (staleness === "stale") {
    md += ` (context may be outdated, verify assumptions)`;
  }
  md += `\n\n`;

  // standing instructions
  if (state.standing_instructions?.length) {
    md += `## standing instructions\n\n`;
    for (const instruction of state.standing_instructions) {
      md += `- ${instruction}\n`;
    }
    md += `\n`;
  }

  // short term with staleness assessment
  if (state.short_term?.length) {
    md += `## short term`;
    if (staleness !== "fresh") {
      md += ` (assess relevance, some may be stale)`;
    }
    md += `\n\n`;
    for (const item of state.short_term) {
      md += `- ${item.note}`;
      if (item.added) md += ` (added: ${item.added})`;
      md += `\n`;
    }
    md += `\n`;
  }

  // active threads with staleness
  if (state.active_threads?.length) {
    md += `## current threads`;
    if (staleness === "stale") {
      md += ` (may need status check)`;
    }
    md += `\n\n`;
    for (const thread of state.active_threads) {
      md += `### ${thread.id}\n`;
      if (thread.summary) md += `${thread.summary}\n`;
      if (thread.status || thread.where_i_left_off) {
        md += `*status:* ${thread.status || thread.where_i_left_off}\n`;
      }
      md += `\n`;
    }
  }

  // open questions
  if (state.open_questions?.length) {
    md += `## open questions\n\n`;
    for (const q of state.open_questions) {
      md += `- ${q}\n`;
    }
    md += `\n`;
  }

  // context
  if (state.context) {
    md += `## context\n\n`;
    md += state.context;
    md += `\n`;
  }

  return md;
}

const handler: HookHandler = async (event) => {
  if (event.type !== "agent" || event.action !== "bootstrap") {
    return;
  }

  const workspaceDir = event.context.workspaceDir;
  if (!workspaceDir) {
    console.log("[continuity-inject] no workspace dir, skipping");
    return;
  }

  const stateFile = join(workspaceDir, "memory", "session-state.yaml");
  const outputFile = join(workspaceDir, "BOOTSTRAP.md");

  if (!existsSync(stateFile)) {
    console.log("[continuity-inject] no session-state.yaml, skipping");
    return;
  }

  try {
    const content = readFileSync(stateFile, "utf-8");
    const state = parseYaml(content);
    const bootstrap = generateBootstrap(state);

    writeFileSync(outputFile, bootstrap);
    console.log("[continuity-inject] generated BOOTSTRAP.md (dynamic)");
    
    // log staleness assessment
    if (state.timestamp) {
      const staleness = assessStaleness(state.timestamp);
      console.log(`[continuity-inject] session staleness: ${staleness} (${formatTimeSince(state.timestamp)})`);
    }
  } catch (err) {
    console.error("[continuity-inject] failed:", err instanceof Error ? err.message : String(err));
  }
};

export default handler;
