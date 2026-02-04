#!/bin/bash
# wake.sh - read session state and generate a wake-up briefing
# usage: ./scripts/wake.sh [path-to-session-state.yaml]

STATE_FILE="${1:-$HOME/.openclaw/workspace/memory/session-state.yaml}"

if [ ! -f "$STATE_FILE" ]; then
    echo "no session state found at $STATE_FILE"
    echo "starting fresh."
    exit 0
fi

echo "=========================================="
echo "  WAKE-UP BRIEFING"
echo "=========================================="
echo ""

# extract key fields using grep/sed (works without yq)
TIMESTAMP=$(grep "^timestamp:" "$STATE_FILE" | sed 's/timestamp: //')
GAP=$(grep "^gap_since_last:" "$STATE_FILE" | sed 's/gap_since_last: //')

echo "last session: $TIMESTAMP"
echo "gap: $GAP"
echo ""

echo "--- ACTIVE THREADS ---"
# simple extraction of thread summaries
grep -A2 "id:" "$STATE_FILE" | grep "summary:" | sed 's/.*summary: /  • /'
echo ""

echo "--- OPEN QUESTIONS ---"
sed -n '/^open_questions:/,/^[a-z]/p' "$STATE_FILE" | grep "^  -" | sed 's/  - /  ? /'
echo ""

echo "--- NOTE TO SELF ---"
sed -n '/^note_to_self:/,/^[a-z]/p' "$STATE_FILE" | tail -n +2 | grep -v "^$" | head -10
echo ""
echo "=========================================="
