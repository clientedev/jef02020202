#!/bin/bash
set -e

echo "Starting Application with Uvicorn..."

PORT="${PORT:-8000}"

exec uvicorn main_ghost:app \
    --host 0.0.0.0 \
    --port "$PORT" \
    --workers 1 \
    --log-level info
