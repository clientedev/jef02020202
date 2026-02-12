#!/bin/bash
set -e

echo "========================================="
echo "Nucleo 1.03 - Railway Quick Start"
echo "========================================="

# Set default port
PORT="${PORT:-8000}"
echo "Starting Application with Uvicorn on port $PORT..."

exec uvicorn main:app \
    --host 0.0.0.0 \
    --port "$PORT" \
    --workers 1 \
    --timeout-keep-alive 60 \
    --log-level info
