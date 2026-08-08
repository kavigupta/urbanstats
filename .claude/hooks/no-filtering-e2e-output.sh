#!/usr/bin/env bash
# Enforces the "don't pipe e2e output through head/tail/grep" rule in react/test/AGENTS.md.
set -euo pipefail

cmd=$(jq -r '.tool_input.command // ""')

case "$cmd" in
  *test:e2e*|*run-e2e-tests*) ;;
  *) exit 0 ;;
esac

filters='\|[[:space:]&]*(sudo[[:space:]]+)?([^[:space:]|]*/)?(grep|egrep|fgrep|rg|ag|ack|head|tail|sed|awk)\b'

if printf '%s' "$cmd" | grep -Eq "$filters"; then
  jq -nc '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Blocked: this pipes e2e test output through a filter. Runs take minutes and a run you truncate is a run you have to do again. Redirect to a file and grep the file instead: `<cmd> > /tmp/e2e.log 2>&1`, then `grep -n failed /tmp/e2e.log`. The whole run stays on disk, so narrowing down costs nothing. See react/test/AGENTS.md."
    }
  }'
fi
