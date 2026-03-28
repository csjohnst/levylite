#!/usr/bin/env bash
# PostToolUse hook: run ESLint on files changed by Write/Edit
# Reads hook JSON from stdin, extracts the file path, runs eslint if applicable

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# Extract file path from stdin JSON
FILE=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')

# Skip if no file or not a lintable extension
if [[ -z "$FILE" ]]; then
  exit 0
fi

case "$FILE" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs)
    ;;
  *)
    exit 0
    ;;
esac

# Skip if file doesn't exist (was deleted)
if [[ ! -f "$FILE" ]]; then
  exit 0
fi

# Determine which sub-project the file belongs to
if [[ "$FILE" == "$ROOT/app/"* ]]; then
  PROJECT_DIR="$ROOT/app"
elif [[ "$FILE" == "$ROOT/landing/"* ]]; then
  PROJECT_DIR="$ROOT/landing"
else
  exit 0
fi

# Run ESLint on the file
cd "$PROJECT_DIR"
OUTPUT=$(npx eslint --no-warn-ignored "$FILE" 2>&1) || true

if [[ -n "$OUTPUT" ]]; then
  # Return lint errors as context for Claude to fix
  jq -n --arg ctx "$OUTPUT" '{
    "hookSpecificOutput": {
      "hookEventName": "PostToolUse",
      "additionalContext": ("ESLint found issues in the file you just edited. Fix them:\n\n" + $ctx)
    }
  }'
fi
