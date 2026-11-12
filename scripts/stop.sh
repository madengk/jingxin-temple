#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ -f logs/cloudflared.pid ]]; then
  kill "$(cat logs/cloudflared.pid)" 2>/dev/null || true
  rm -f logs/cloudflared.pid
fi
pkill -f "cloudflared tunnel --url" 2>/dev/null || true
pkill -f "lt --port" 2>/dev/null || true
rm -f logs/localtunnel.pid
if [[ -f logs/server.pid ]]; then
  kill "$(cat logs/server.pid)" 2>/dev/null || true
  rm -f logs/server.pid
fi
pkill -f "tsx server/src/index.ts" 2>/dev/null || true
echo "Stopped."
