#!/bin/bash
set -e

echo "========================================="
echo "Nucleo 1.03 - Railway Quick Start"
echo "========================================="

# Set default port
PORT="${PORT:-8000}"
# Run database initialization
echo "Running database initialization script..."
python pre_start.py || echo "Warning: Database initialization script failed, continuing anyway..."

echo "Starting Application with Uvicorn on port $PORT..."

exec uvicorn main:app \
    --host 0.0.0.0 \
    --port "$PORT" \
    --workers 1 \
    --timeout-keep-alive 60 \
    --log-level info
