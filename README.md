# Audio Scribe - Production-Ready Audio Transcription

A robust, asynchronous audio recording and transcription system built with FastAPI, React, PostgreSQL, Redis, and mlx-whisper (Apple Silicon).

## 🎯 Features

- **Browser-based audio recording** with WebM/MP4/OGG fallback support
- **File upload management** with 500MB file size support
- **Asynchronous transcription** using mlx-whisper (large-v3, Apple Silicon)
- **Real-time status polling** for transcription progress
- **Editable transcription text** with persistent storage
- **Non-blocking async stack** preventing memory exhaustion and HTTP timeouts
- **Production-ready** with Docker Compose orchestration
- **Voice Activity Detection (VAD)** for intelligent silence handling

## 🏗️ Architecture

### Backend Stack
- **FastAPI** - Async web framework
- **asyncpg** - Asynchronous PostgreSQL driver (5-20 connection pool)
- **aioboto3** - Async S3 client for MinIO storage
- **ARQ** - Redis-backed async job queue
- **mlx-whisper (large-v3)** - Apple Silicon-native speech-to-text (runs on the host)
- **ffmpeg** - Audio format conversion (16kHz, mono preprocessing)

### Frontend Stack
- **React 18** - UI framework
- **Vite** - Build tool with HMR
- **TypeScript** - Type safety
- **Zustand** - Lightweight state management
- **Tailwind CSS** - Utility-first styling

### Infrastructure
- **PostgreSQL 15** - Transactional database
- **Redis 7** - Job queue and caching
- **MinIO** - S3-compatible object storage
- **Docker Compose** - Service orchestration
- **Nginx** - Reverse proxy and static file serving

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- FFmpeg (for audio processing)
- Node.js 20+ (for frontend development)
- Python 3.11+ (for backend development)

### Setup Development Environment

```bash
# Clone the repository
git clone <repo-url>
cd audio-scribe

# Copy environment variables
cp .env.example .env

# Run setup script
chmod +x scripts/setup-dev.sh
./scripts/setup-dev.sh
```

This will:
1. Build all Docker images
2. Start PostgreSQL, Redis, MinIO, API, Worker, and Frontend
3. Run health checks
4. Initialize the database schema

### Access the Application

- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/api/docs
- **MinIO Console**: http://localhost:9001
- **Health Check**: `./scripts/health-check.sh`

## 📊 API Endpoints

### Audio Management
- `POST /api/upload` - Upload audio file
- `GET /api/files` - List all files
- `GET /api/files/{audio_id}` - Get file details

### Transcription
- `POST /api/transcribe/{audio_id}` - Start transcription
- `GET /api/status/{audio_id}` - Get transcription status
- `POST /api/files/{audio_id}/text` - Save transcription text

### Utility
- `GET /api/health` - Health check

## 🧪 Integration Tests

```bash
chmod +x scripts/test-integration.sh
./scripts/test-integration.sh
```

Tests:
1. API health check
2. File upload
3. File listing
4. File details retrieval
5. Transcription start
6. Status polling
7. Transcription completion (waits up to 60s)
8. Text saving

## 📁 Project Structure

```
audio-scribe/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app
│   │   ├── database.py          # DB connection pool
│   │   ├── models.py            # Pydantic schemas
│   │   ├── services/
│   │   │   ├── audio_processor.py   # FFmpeg wrapper
│   │   │   ├── storage_service.py   # MinIO operations
│   │   │   └── transcription_service.py # DB ops
│   │   └── routes/
│   │       ├── audio_routes.py      # Upload/list endpoints
│   │       └── transcription_routes.py # Transcription endpoints
│   ├── worker.py                # ARQ background worker
│   ├── requirements.txt         # Python dependencies
│   ├── Dockerfile              # API container
│   └── Dockerfile.worker       # Worker container
├── frontend/
│   ├── src/
│   │   ├── main.tsx            # React entry
│   │   ├── App.tsx             # Main component
│   │   ├── types/
│   │   │   └── index.ts        # TypeScript types
│   │   ├── store/
│   │   │   └── index.ts        # Zustand store
│   │   ├── services/
│   │   │   └── api.ts          # Axios client
│   │   ├── components/
│   │   │   ├── Toast.tsx       # Notifications
│   │   │   ├── VoiceRecorder.tsx # Recording
│   │   │   └── TranscriptionManager.tsx # UI
│   │   └── pages/
│   │       ├── Upload.tsx      # Upload page
│   │       └── Transcription.tsx # Transcription page
│   ├── package.json            # Node dependencies
│   ├── Dockerfile             # Frontend container
│   └── nginx.conf             # Web server config
├── docker-compose.yml          # Service orchestration
├── scripts/
│   ├── setup-dev.sh           # Development setup
│   ├── health-check.sh        # Service health checks
│   └── test-integration.sh    # Integration tests
└── README.md                   # This file
```

## 🔄 How It Works

### Audio Upload Flow
1. User records audio in browser or selects file
2. Frontend uploads to `/api/upload`
3. Backend validates format and checks file size
4. Audio is stored in MinIO S3
5. Database record created with storage key
6. Empty transcription record created (status: Pending)
7. Frontend receives audio_id

### Transcription Flow
1. User clicks "Start Transcription"
2. API POST to `/api/transcribe/{audio_id}`
3. Status updated to "Processing"
4. ARQ job enqueued to Redis
5. Worker picks up job:
   - Downloads audio from MinIO
   - Downsamples to 16kHz mono using ffmpeg
   - Runs mlx-whisper (off the event loop via asyncio.to_thread)
   - Updates DB with transcription text
6. Frontend polls `/api/status/{audio_id}` every 2s
7. When status changes to "Completed", text is displayed
8. User can edit text and save with `/api/files/{audio_id}/text`

### Non-Blocking Architecture
- **FastAPI async/await**: All I/O operations are non-blocking
- **asyncpg connection pool**: Min 5, max 20 connections (prevents exhaustion)
- **ffmpeg async subprocess**: `asyncio.create_subprocess_exec` (doesn't block event loop)
- **ARQ job queue**: Background transcription prevents HTTP timeout
- **No arbitrary chunking**: the full file is passed to Whisper, which handles
  silence/hallucination natively (no_speech / logprob / compression-ratio thresholds)

> **Note:** The worker uses **mlx-whisper**, which is Apple-Silicon-only. It runs
> natively on the host (see `scripts/run-worker.sh`), not in Docker. Start the infra
> with `docker-compose up -d`, then run the worker in a separate terminal.

## 🛠️ Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/audio_scribe

# Redis
REDIS_URL=redis://localhost:6379

# MinIO
MINIO_URL=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=audio-files

# Whisper Model (mlx-whisper, Apple Silicon)
# A Hugging Face repo id, or a short alias: tiny/base/small/medium/large-v3/large-v3-turbo
WHISPER_MODEL=mlx-community/whisper-large-v3-mlx
WHISPER_LANGUAGE=auto         # "auto" detects per file, or set e.g. en, es, fr

# Frontend
VITE_API_URL=http://localhost:8000/api
```

## 🚨 Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs -f

# Check specific service
docker-compose logs -f api
```

### FFmpeg not found
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg
```

### Database connection errors
```bash
# Reset database
docker-compose down -v
docker-compose up -d postgres
sleep 10
docker-compose up -d
```

### Transcription fails
1. Check the worker output in the terminal running `./scripts/run-worker.sh`
2. Verify audio file format is supported
3. Ensure sufficient disk space for the model cache (~3GB for large-v3)
4. Confirm you're on Apple Silicon — mlx-whisper does not run on Intel/Linux

## 📈 Performance Tuning

### Database
- Connection pool: 5-20 connections
- Query timeout: 60 seconds
- Indexes on: status, audio_file_id, upload_timestamp

### Worker
- Job timeout: 1 hour per transcription
- Max retries: 3 attempts
- Model cache: `/tmp/whisper-models`
- Processing tmp: `/tmp/audio-processing`

### Frontend
- File poll interval: 2 seconds during transcription
- Toast auto-dismiss: 3 seconds
- Max upload size: 500MB

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For issues and questions:
1. Check troubleshooting section
2. Review logs: `docker-compose logs -f`
3. Run health checks: `./scripts/health-check.sh`
4. Run integration tests: `./scripts/test-integration.sh`
