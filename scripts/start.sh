#!/usr/bin/env bash
# Start 静心寺 production server + a public tunnel (localtunnel; cloudflared optional).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p logs
PORT="${PORT:-2567}"

if curl -sf "http://localhost:${PORT}/health" >/dev/null 2>&1; then
  echo "Server already running on :${PORT}"
else
  if [[ ! -f client/dist/index.html ]]; then
    echo "Building client…"
    npm run build
  fi
  NODE_ENV=production nohup npx tsx server/src/index.ts >> logs/server.log 2>&1 &
  echo $! > logs/server.pid
  echo "Server starting (pid $(cat logs/server.pid)) on :${PORT}"
  sleep 1
  curl -sf "http://localhost:${PORT}/health" && echo
fi

if [[ "${TUNNEL:-1}" != "1" ]]; then
  echo "TUNNEL=0, local only: http://localhost:${PORT}"
  exit 0
fi

# Prefer localtunnel: cloudflared edge is often blocked in this environment.
if pgrep -f "lt --port ${PORT}" >/dev/null; then
  echo "localtunnel already running."
else
  : > logs/localtunnel.log
  nohup npx --yes localtunnel --port "${PORT}" >> logs/localtunnel.log 2>&1 &
  echo $! > logs/localtunnel.pid
  echo "localtunnel starting (pid $(cat logs/localtunnel.pid))"
  sleep 6
fi
echo -n "Public URL: "
grep -oE 'https://[a-zA-Z0-9.-]+\.loca\.lt' logs/localtunnel.log | tail -1 || echo "(see logs/localtunnel.log)"
