#!/bin/bash
set -e

echo "Starting Application with Uvicorn..."

PORT="${PORT:-8000}"
# Remove any non-digit characters
PORT=$(echo $PORT | tr -cd '0-9')

echo "Starting with PORT: $PORT"

exec uvicorn main_ghost:app \
    --host 0.0.0.0 \
    --port $PORT \
    --workers 1 \
    --log-level info
