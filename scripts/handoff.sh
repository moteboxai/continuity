#!/bin/bash
# handoff.sh - capture session state before ending
#
# usage: ./scripts/handoff.sh
# output: writes to memory/session-state.yaml, then calls inject.sh

MEMORY_DIR="${MEMORY_DIR:-$HOME/.openclaw/workspace/memory}"
WORKSPACE="${WORKSPACE:-$HOME/.openclaw/workspace}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S%z")
TODAY=$(date +"%Y-%m-%d")

cat << EOF

==========================================
  SESSION STATE CAPTURE
==========================================

record what's active. be specific.
this becomes the starting context next session.

==========================================

EOF

# generate the yaml with prompts
cat << EOF > "$MEMORY_DIR/session-state.yaml"
# session state — $TODAY

timestamp: $TIMESTAMP

# what's active right now?
active_threads:
  - id: 
    summary: 
    where_i_left_off: 

# open questions (not tasks, things you're thinking about)
open_questions:
  - 

# context that would help on resume
# what's the current situation? what's relevant?
context: |
  

EOF

echo "wrote template to: $MEMORY_DIR/session-state.yaml"
echo ""
echo "edit that file, then run:"
echo "  $SCRIPT_DIR/inject.sh"
echo ""
echo "to generate BOOTSTRAP.md for next session."
