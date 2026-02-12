#!/bin/bash
set -e

echo "Starting Application with Uvicorn..."

PORT="${PORT:-8000}"

exec uvicorn main:app \
    --host 0.0.0.0 \
    --port "$PORT" \
    --workers 1 \
    --timeout-keep-alive 60 \
    --log-level info
