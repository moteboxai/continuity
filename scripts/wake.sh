#!/bin/bash
# wake.sh - read session state and output briefing
# usage: ./scripts/wake.sh [path-to-session-state.yaml]

STATE_FILE="${1:-$HOME/.openclaw/workspace/memory/session-state.yaml}"

if [ ! -f "$STATE_FILE" ]; then
    echo "no session state found."
    exit 0
fi

echo "=========================================="
echo "  SESSION STATE"
echo "=========================================="
echo ""

TIMESTAMP=$(grep "^timestamp:" "$STATE_FILE" | sed 's/timestamp: //')
echo "last active: $TIMESTAMP"
echo ""

echo "--- THREADS ---"
grep -A2 "id:" "$STATE_FILE" | grep "summary:" | sed 's/.*summary: /  • /'
echo ""

echo "--- QUESTIONS ---"
sed -n '/^open_questions:/,/^[a-z]/p' "$STATE_FILE" | grep "^  -" | sed 's/  - /  ? /'
echo ""

echo "--- CONTEXT ---"
sed -n '/^context:/,/^[a-z_]*:/p' "$STATE_FILE" | tail -n +2 | grep -v "^[a-z_]*:" | grep -v "^$" | head -10
echo ""
echo "=========================================="
