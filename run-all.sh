#!/bin/bash
# Supervisor script for Tamanna services

# Start gateway
cd /home/z/my-project/mini-services/tamanna-gateway
echo "[Supervisor] Starting gateway on port 3003..."
while true; do
  bun src/index.ts 2>&1
  echo "[Supervisor] Gateway exited, restarting in 3s..."
  sleep 3
done &

# Start Next.js
cd /home/z/my-project
echo "[Supervisor] Starting Next.js on port 3000..."
while true; do
  bun run dev 2>&1
  echo "[Supervisor] Next.js exited, restarting in 3s..."
  sleep 3
done &

echo "[Supervisor] All services started. PIDs: $!"
wait
