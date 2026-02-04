#!/bin/bash
# sleep.sh - generate a session state template for end of session
# usage: ./scripts/sleep.sh [output-path]
# 
# outputs a yaml template that can be edited and saved

OUTPUT="${1:-session-state.yaml}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S%z")

cat << EOF
# session state — generated $(date +"%Y-%m-%d %H:%M %Z")
# edit this and save to: $OUTPUT

timestamp: $TIMESTAMP
session_start: TODO
session_duration: TODO
gap_since_last: TODO

active_threads:
  - id: TODO
    summary: TODO
    status: TODO
    last_action: TODO
    next_step: TODO

  # add more threads as needed

open_questions:
  - TODO
  - TODO

recent:
  - TODO
  - TODO

texture:
  energy: TODO
  curiosity: TODO
  uncertainty: TODO

note_to_self: |
  TODO: what should future-you know?
  what were you working on?
  what's the next step?
EOF
