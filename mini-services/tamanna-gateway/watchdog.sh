#!/bin/bash
# Gateway watchdog — restarts gateway if it crashes
cd "$(dirname "$0")"
while true; do
  echo "=== GATEWAY START $(date) ==="
  node dist/index.js 2>&1
  EXIT_CODE=$?
  echo "=== GATEWAY EXIT code=$EXIT_CODE $(date) ==="
  if [ $EXIT_CODE -eq 0 ]; then
    echo "Clean exit, stopping watchdog."
    break
  fi
  echo "Restarting in 2s..."
  sleep 2
done
