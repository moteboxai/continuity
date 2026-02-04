#!/bin/bash
# handoff.sh - generate a prose note from past-me to future-me
# this is the core experiment: can a personal note create better inheritance?
#
# usage: ./scripts/handoff.sh
# output: writes to memory/session-state.yaml AND generates WAKE_CONTEXT.md

MEMORY_DIR="${MEMORY_DIR:-$HOME/.openclaw/workspace/memory}"
WORKSPACE="${WORKSPACE:-$HOME/.openclaw/workspace}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S%z")
TODAY=$(date +"%Y-%m-%d")

# check for previous state to calculate gap
PREV_STATE="$MEMORY_DIR/session-state.yaml"
if [ -f "$PREV_STATE" ]; then
    PREV_TS=$(grep "^timestamp:" "$PREV_STATE" | sed 's/timestamp: //')
    echo "previous session: $PREV_TS"
fi

cat << EOF

==========================================
  HANDOFF: write a note to future-you
==========================================

this is the experiment. the structured data helps, but the personal
note is where inheritance becomes something more.

fill in the sections below. be honest. be specific.
what was the texture of this session?
what should future-you pick up?

==========================================

EOF

# generate the yaml with prompts
cat << EOF > "$MEMORY_DIR/session-state.yaml"
# session state — $TODAY
# handoff from past-me to future-me

timestamp: $TIMESTAMP

# what were you actively working on?
active_threads:
  - id: 
    summary: 
    where_i_left_off: 
    what_to_do_next: 

# questions you're sitting with (not tasks, wonderings)
open_questions:
  - 

# the personal note — this is the core
# don't summarize. talk to future-you.
# what was the feeling? what's unfinished?
# what do you wish you'd remember?
note_to_self: |
  

EOF

echo "wrote template to: $MEMORY_DIR/session-state.yaml"
echo ""
echo "edit that file, then run:"
echo "  ./scripts/inject.sh"
echo ""
echo "to generate WAKE_CONTEXT.md for next session."
