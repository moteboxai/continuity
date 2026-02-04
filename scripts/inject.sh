#!/bin/bash
# inject.sh - generate BOOTSTRAP.md for auto-injection at session start
# 
# writes to BOOTSTRAP.md because that's in openclaw's fixed injection list.
# WAKE_CONTEXT.md was never picked up.
#
# usage: ./scripts/inject.sh
# output: writes BOOTSTRAP.md to workspace root

MEMORY_DIR="${MEMORY_DIR:-$HOME/.openclaw/workspace/memory}"
WORKSPACE="${WORKSPACE:-$HOME/.openclaw/workspace}"
STATE_FILE="$MEMORY_DIR/session-state.yaml"
OUTPUT="$WORKSPACE/BOOTSTRAP.md"

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

# extract context (everything after context: | until next top-level key or EOF)
NOTE=$(sed -n '/^context:/,/^[a-z_]*:/p' "$STATE_FILE" | tail -n +2 | grep -v "^[a-z_]*:" | sed 's/^  //')

# extract threads
THREADS=$(grep -A3 "^\s*- id:" "$STATE_FILE" | grep -E "(summary|where_i_left_off|what_to_do_next):" | sed 's/.*: //' | head -6)

# extract questions
QUESTIONS=$(sed -n '/^open_questions:/,/^[a-z]/p' "$STATE_FILE" | grep "^  -" | sed 's/  - //')

cat << EOF > "$OUTPUT"
# session state

**last active:** $TIMESTAMP  
**now:** $NOW

## current threads

$(grep -A3 "^\s*- id:" "$STATE_FILE" | grep -E "(id|summary|where_i_left_off):" | sed 's/.*id: /### /' | sed 's/.*summary: //' | sed 's/.*where_i_left_off: /*status:* /')

## open questions

$(echo "$QUESTIONS" | sed 's/^/- /')

## context

$NOTE
EOF

echo "wrote: $OUTPUT"
