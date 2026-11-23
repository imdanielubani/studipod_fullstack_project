#!/usr/bin/env bash
# Fails if any environment file other than a *.example template is tracked by Git,
# or if a template contains something that looks like a real credential.
# Used in CI and safe to run locally:  ./infrastructure/scripts/check-env-files.sh
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
status=0

tracked_env="$(git ls-files | grep -E '(^|/)\.env(\.|$)' | grep -vE '\.example$' || true)"
if [ -n "$tracked_env" ]; then
  echo "Tracked environment files found (must not be committed):" >&2
  echo "$tracked_env" >&2
  status=1
fi

# Patterns for live credentials that must never appear in templates.
patterns='sk_live_[0-9A-Za-z]{10,}|rk_live_[0-9A-Za-z]{10,}|whsec_[0-9A-Za-z]{20,}|re_[0-9A-Za-z]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----'
# git grep searches tracked content directly: no xargs batching that could mask a hit.
if git grep -IEn -e "$patterns"; then
  echo "Possible credentials found in tracked files (see above)." >&2
  status=1
fi

[ "$status" -eq 0 ] && echo "Environment file check passed."
exit "$status"
