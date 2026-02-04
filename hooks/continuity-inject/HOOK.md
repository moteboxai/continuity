---
name: continuity-inject
description: "Generate BOOTSTRAP.md from session state before workspace injection"
homepage: https://github.com/moteboxai/continuity
metadata:
  {
    "openclaw":
      {
        "emoji": "🔄",
        "events": ["agent:bootstrap"],
        "requires": { "config": ["workspace.dir"] },
      },
  }
---

# Continuity Inject Hook

Generates BOOTSTRAP.md from session-state.yaml before workspace files are injected.

## What It Does

When a new session starts (agent bootstrap):

1. Reads `memory/session-state.yaml` from workspace
2. Runs `scripts/inject.sh` from the continuity project
3. Generates `BOOTSTRAP.md` with standing instructions, short-term context, threads, questions

## Why

BOOTSTRAP.md is auto-injected at session start. By generating it from session state during bootstrap, the agent wakes up with context already loaded.

## Requirements

- `workspace.dir` configured
- `memory/session-state.yaml` exists
- `projects/continuity/scripts/inject.sh` exists

## Related

- [continuity project](https://github.com/moteboxai/continuity)
