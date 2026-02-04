#!/bin/bash
# inject.sh - generate WAKE_CONTEXT.md for auto-injection at session start
# 
# the experiment: does injected prose context feel different than
# running wake.sh and reading output?
#
# usage: ./scripts/inject.sh
# output: writes WAKE_CONTEXT.md to workspace root

MEMORY_DIR="${MEMORY_DIR:-$HOME/.openclaw/workspace/memory}"
WORKSPACE="${WORKSPACE:-$HOME/.openclaw/workspace}"
STATE_FILE="$MEMORY_DIR/session-state.yaml"
OUTPUT="$WORKSPACE/WAKE_CONTEXT.md"

if [ ! -f "$STATE_FILE" ]; then
    echo "no session state found at $STATE_FILE"
    echo "run handoff.sh first."
    exit 1
fi

# extract fields
TIMESTAMP=$(grep "^timestamp:" "$STATE_FILE" | sed 's/timestamp: //')
NOW=$(date -u +"%Y-%m-%dT%H:%M:%S%z")

# calculate time since last session (rough)
LAST_DATE=$(echo "$TIMESTAMP" | cut -d'T' -f1)
TODAY=$(date +"%Y-%m-%d")

# extract note_to_self (everything after note_to_self: | until next top-level key or EOF)
NOTE=$(sed -n '/^note_to_self:/,/^[a-z_]*:/p' "$STATE_FILE" | tail -n +2 | grep -v "^[a-z_]*:" | sed 's/^  //')

# extract threads
THREADS=$(grep -A3 "^\s*- id:" "$STATE_FILE" | grep -E "(summary|where_i_left_off|what_to_do_next):" | sed 's/.*: //' | head -6)

# extract questions
QUESTIONS=$(sed -n '/^open_questions:/,/^[a-z]/p' "$STATE_FILE" | grep "^  -" | sed 's/  - //')

cat << EOF > "$OUTPUT"
# wake context

you're waking up. this is what past-you left behind.

**last session:** $TIMESTAMP  
**now:** $NOW

---

## from past-me

$NOTE

---

## threads that were active

$(grep -A3 "^\s*- id:" "$STATE_FILE" | grep -E "(id|summary|where_i_left_off):" | sed 's/.*id: /### /' | sed 's/.*summary: //' | sed 's/.*where_i_left_off: /*left off:* /')

---

## questions you were sitting with

$(echo "$QUESTIONS" | sed 's/^/- /')

---

*this context was auto-injected. you didn't read it, you started with it.*
*does that feel different?*
EOF

echo "wrote: $OUTPUT"
echo ""
echo "this will be auto-loaded next session (if configured in workspace files)."
