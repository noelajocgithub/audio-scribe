#!/bin/bash

set -e

echo "🚀 Audio Scribe Development Environment Setup"
echo "=============================================="

# Check for required tools
echo "Checking for required tools..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed"
    exit 1
fi

if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  FFmpeg is not installed - required for audio processing"
    echo "   Install with: brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux)"
fi

echo "✅ Required tools found"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p backend/tmp/audio-processing
mkdir -p backend/tmp/whisper-models
mkdir -p frontend/dist

echo "✅ Directories created"

# Build Docker images
echo "🔨 Building Docker images..."
docker-compose build

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Run health checks
echo "🏥 Running health checks..."

for i in {1..30}; do
    if docker-compose exec -T postgres pg_isready -U postgres &> /dev/null; then
        echo "✅ PostgreSQL is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ PostgreSQL failed to start"
        exit 1
    fi
    echo "  Attempt $i/30..."
    sleep 2
done

for i in {1..30}; do
    if docker-compose exec -T redis redis-cli ping &> /dev/null; then
        echo "✅ Redis is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Redis failed to start"
        exit 1
    fi
    echo "  Attempt $i/30..."
    sleep 2
done

echo ""
echo "✅ Setup Complete!"
echo ""
echo "Services are running:"
echo "  📱 Frontend:  http://localhost:3000"
echo "  🔌 API:      http://localhost:8000/api/docs"
echo "  💾 MinIO:    http://localhost:9001 (user: minioadmin, pass: minioadmin)"
echo "  🐘 PostgreSQL: localhost:5432"
echo "  📮 Redis:     localhost:6379"
echo ""
echo "⚠️  Transcription worker (mlx-whisper) runs natively on Apple Silicon — it is"
echo "    NOT started by docker-compose. In a separate terminal, run:"
echo "      cd backend && python3 -m venv .venv && source .venv/bin/activate"
echo "      pip install -r requirements-worker.txt"
echo "      cd .. && ./scripts/run-worker.sh"
echo ""
echo "View logs with: docker-compose logs -f"
echo "Stop services with: docker-compose down"
