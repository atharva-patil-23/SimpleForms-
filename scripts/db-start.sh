#!/usr/bin/env bash
# Start the local Supabase stack, loading Google OAuth credentials from
# .env.google.local if present so sign-in works locally. Safe to run without
# the file — the stack just starts without a configured Google provider.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env.google.local ]; then
  echo "Loading Google OAuth credentials from .env.google.local"
  set -a
  # shellcheck disable=SC1091
  source .env.google.local
  set +a
else
  echo "No .env.google.local found — starting without Google credentials."
  echo "Copy .env.google.local.example to .env.google.local to enable sign-in."
fi

npx supabase start
