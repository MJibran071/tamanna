#!/bin/bash
cd "$(dirname "$0")"
LOG="/home/z/my-project/gateway.log"

while true; do
  echo "=== START $(date) ===" >> "$LOG"
  node dist/index.js >> "$LOG" 2>&1
  CODE=$?
  echo "=== EXIT code=$CODE $(date) ===" >> "$LOG"
  if [ $CODE -eq 0 ]; then break; fi
  sleep 1
done
