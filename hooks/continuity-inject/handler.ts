import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import type { HookHandler } from "openclaw/hooks";

/**
 * Continuity Inject Hook (v2)
 * 
 * Builds on openclaw infrastructure:
 * - Uses session store for staleness (not custom yaml timestamp)
 * - Generates minimal BOOTSTRAP.md with orientation
 * - Relies on memory_search for dynamic context (not static yaml)
 * - memoryFlush handles pre-compaction capture (not custom plugin)
 */

interface SessionStore {
  [key: string]: {
    sessionId: string;
    updatedAt: string;
    [key: string]: unknown;
  };
}

function getLastSessionTime(workspaceDir: string): Date | null {
  // Try to read from openclaw's session store
  const storePath = join(
    process.env.HOME || "~",
    ".openclaw/agents/main/sessions/sessions.json"
  );
  
  try {
    if (existsSync(storePath)) {
      const store: SessionStore = JSON.parse(readFileSync(storePath, "utf-8"));
      const mainSession = store["agent:main:main"];
      if (mainSession?.updatedAt) {
        return new Date(mainSession.updatedAt);
      }
    }
  } catch (e) {
    // Fall back to yaml if store unavailable
  }

  // Fallback: check session-state.yaml
  const stateFile = join(workspaceDir, "memory", "session-state.yaml");
  if (existsSync(stateFile)) {
    const content = readFileSync(stateFile, "utf-8");
    const match = content.match(/^timestamp:\s*(.+)$/m);
    if (match) {
      return new Date(match[1]);
    }
  }

  return null;
}

function assessStaleness(lastActive: Date | null): { 
  level: "fresh" | "recent" | "stale" | "unknown";
  gap: string;
  note: string;
} {
  if (!lastActive) {
    return { level: "unknown", gap: "unknown", note: "" };
  }

  const now = new Date();
  const diffMs = now.getTime() - lastActive.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let gap: string;
  if (diffDays > 0) gap = `${diffDays}d`;
  else if (diffHours > 0) gap = `${diffHours}h`;
  else if (diffMins > 0) gap = `${diffMins}m`;
  else gap = "just now";

  if (diffHours < 2) {
    return { level: "fresh", gap, note: "" };
  } else if (diffHours < 24) {
    return { level: "recent", gap, note: "assess relevance of short-term context" };
  } else {
    return { level: "stale", gap, note: "verify assumptions, context may be outdated" };
  }
}

function generateBootstrap(
  staleness: { level: string; gap: string; note: string },
  lastActive: Date | null
): string {
  const now = new Date().toISOString();
  
  let md = `# session state\n\n`;
  md += `**last active:** ${lastActive?.toISOString() || "unknown"}  \n`;
  md += `**now:** ${now}  \n`;
  md += `**gap:** ${staleness.gap}`;
  
  if (staleness.note) {
    md += ` (${staleness.note})`;
  }
  md += `\n\n`;

  // Orientation note based on staleness
  if (staleness.level === "stale") {
    md += `> ⚠️ Long gap since last session. Run memory_search for context before assuming continuity.\n\n`;
  } else if (staleness.level === "recent") {
    md += `> Recent session. Check memory/session-state.yaml for threads and standing instructions.\n\n`;
  }

  // Point to where context lives (don't duplicate it)
  md += `## context sources\n\n`;
  md += `- **standing instructions**: memory/session-state.yaml\n`;
  md += `- **recent context**: memory_search for relevant notes\n`;
  md += `- **session history**: available via session indexing\n`;

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

  try {
    const lastActive = getLastSessionTime(workspaceDir);
    const staleness = assessStaleness(lastActive);
    const bootstrap = generateBootstrap(staleness, lastActive);

    const outputFile = join(workspaceDir, "BOOTSTRAP.md");
    writeFileSync(outputFile, bootstrap);
    
    console.log(`[continuity-inject] generated BOOTSTRAP.md (staleness: ${staleness.level}, gap: ${staleness.gap})`);
  } catch (err) {
    console.error("[continuity-inject] failed:", err instanceof Error ? err.message : String(err));
  }
};

export default handler;
