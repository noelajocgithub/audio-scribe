#!/bin/bash
#
# Run the transcription worker natively on the host.
#
# The worker uses faster-whisper (CPU int8, or NVIDIA GPU via float16). Running
# it natively avoids container overhead and gives it direct access to host
# CPU/GPU. Start the infra (postgres/redis/minio) with `docker-compose up -d`
# first, then run this script. It points the worker at the Docker services via
# localhost. (Alternatively run it in Docker: see the "containerized-worker"
# profile in docker-compose.yml.)
#
# One-time setup:
#   cd backend
#   python3 -m venv .venv && source .venv/bin/activate
#   pip install -r requirements-worker.txt
#
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../backend"

# Default to the Dockerized infra exposed on localhost. Override by exporting
# these before running, or by sourcing your .env.
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/audio_scribe}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
export MINIO_URL="${MINIO_URL:-http://localhost:9000}"
export MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
export MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"
export MINIO_BUCKET="${MINIO_BUCKET:-audio-files}"
export WHISPER_MODEL="${WHISPER_MODEL:-large-v3}"
export WHISPER_LANGUAGE="${WHISPER_LANGUAGE:-auto}"

# Activate a local venv if present.
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
fi

echo "🎤 Starting faster-whisper worker (model: $WHISPER_MODEL)..."
exec python worker.py
