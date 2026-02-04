import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import type { HookHandler } from "openclaw/hooks";

const handler: HookHandler = async (event) => {
  // Only trigger on agent bootstrap
  if (event.type !== "agent" || event.action !== "bootstrap") {
    return;
  }

  const workspaceDir = event.context.workspaceDir;
  if (!workspaceDir) {
    console.log("[continuity-inject] No workspace dir, skipping");
    return;
  }

  const stateFile = join(workspaceDir, "memory", "session-state.yaml");
  const injectScript = join(workspaceDir, "projects", "continuity", "scripts", "inject.sh");

  // Check if both files exist
  if (!existsSync(stateFile)) {
    console.log("[continuity-inject] No session-state.yaml, skipping");
    return;
  }

  if (!existsSync(injectScript)) {
    console.log("[continuity-inject] No inject.sh script, skipping");
    return;
  }

  try {
    // Run inject.sh to generate BOOTSTRAP.md
    execSync(injectScript, {
      cwd: workspaceDir,
      env: {
        ...process.env,
        MEMORY_DIR: join(workspaceDir, "memory"),
        WORKSPACE: workspaceDir,
      },
      stdio: "pipe",
    });
    console.log("[continuity-inject] Generated BOOTSTRAP.md from session state");
  } catch (err) {
    console.error("[continuity-inject] Failed to run inject.sh:", err instanceof Error ? err.message : String(err));
  }
};

export default handler;
