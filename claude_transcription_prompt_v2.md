# Claude Prompt: Advanced Audio Transcription Feature Implementation

You are an expert full-stack developer and systems architect. I need to add a robust, production-ready audio recording and transcription feature to my existing web application. 

Please provide the complete, step-by-step code updates, database migrations, and library installation requirements to achieve this. The architecture must strictly utilize the open-source asynchronous stack outlined below to prevent blocking, memory exhaustion, and HTTP timeouts.

### 1. Technology Stack
* **Frontend:** React, Vite, Tailwind CSS (Mobile and Desktop responsive)
* **Backend API:** FastAPI (Python)
* **Background Worker:** ARQ (Async Redis Queue) or Celery
* **Message Broker:** Redis
* **Transcription Engine:** mlx-whisper large-v3 utilizing its native Voice Activity Detection (VAD).
* **Database:** PostgreSQL handled asynchronously via `asyncpg`
* **Storage:** MinIO (Open-source S3-compatible) handled asynchronously via `aioboto3`
* **Audio Processing:** `ffmpeg` (executed via `asyncio` subprocesses)

### 2. Required Features & Architecture Logic

#### A. Backend & Async Audio Pipeline
1.  **Format Support:** Accept audio file uploads in `mp3`, `wav`, `aiff`, `pcm`, `aac`, `m4a`, and `ogg`.
2.  **Non-Blocking Audio Pre-processing:** Automatically downsample all incoming audio files to 16kHz (mono) to optimize for Whisper. This must be executed using `asyncio.create_subprocess_exec` to call `ffmpeg` so the event loop is never blocked.
3.  **Transcription Logic (No Arbitrary Chunking):** * Do **not** split the audio into arbitrary time chunks (e.g., 30 seconds), as this destroys semantic context and slices words. 
    * Instead, pass the pre-processed audio file to `faster-whisper` and enable its built-in `vad_filter=True` (Voice Activity Detection using Silero VAD) to intelligently handle silences and long files natively.
4.  **Asynchronous Storage Lifecycle:**
    * Save the original uploaded file to MinIO using the `aioboto3` library to maintain asynchronous, non-blocking I/O.
    * Clean up any temporary local downsampled files immediately after they are processed or uploaded.
5.  **Database Tracking (`asyncpg`):** Create/update a schema to store audio metadata, MinIO storage URL, transcription status (`Pending`, `Processing`, `Completed`, `Failed`), and the finalized transcription text block.

#### B. Background Task Queue (Crucial for Stability)
1.  **Decoupled Inference:** The FastAPI route must **never** run `faster-whisper` directly. When a user requests a transcription, FastAPI should update the database status to `Pending`, push a job to the Redis queue (via ARQ or Celery), and immediately return a 200 OK response to the frontend.
2.  **Worker Process:** A separate background worker process will consume the queue, load the heavy `large-v3` model into memory safely, process the audio, and update the database with the `Completed` status and the text payload.

#### C. Frontend UI & Experience (React + Tailwind)
1.  **Menu Restructuring:**
    * **File Upload Menu:** Keep file uploading here, but remove inline transcription views.
    * **Transcription Menu:** Create a dedicated page. This pulls a list of files from the backend, showing their real-time processing status.
2.  **Resilient Voice Recorder Component:** * Use the browser's MediaRecorder API. 
    * **Critical:** Implement MIME type fallback logic (checking `MediaRecorder.isTypeSupported()`) to iterate through `audio/webm`, `audio/mp4`, and `audio/ogg` to ensure compatibility across Chrome, Safari, and iOS.
    * Provide Record, Pause, Stop, and Save controls. Saved recordings are sent to the backend.
3.  **Asynchronous UI Updates & Editor:**
    * Provide a "Transcribe" button next to each file to trigger the background job.
    * **Polling/SSE:** Since transcriptions take time, implement a polling mechanism (or Server-Sent Events/WebSockets) to check the status endpoint every few seconds. Do not wait for a synchronous HTTP response.
    * Once `Completed`, display the text in a fully editable text area field.
    * Add a "Download as .txt" button that compiles the current text area state into a downloadable file.

### 3. Execution Plan Request
Please structure your response as follows:
1.  **Dependencies:** Provide `pip` and `npm` installation commands (including `faster-whisper`, `asyncpg`, `aioboto3`, `arq`, `redis`, etc.).
2.  **Database Migration:** The SQL or `asyncpg` schema changes needed to track recordings, statuses, and text.
3.  **Backend Services (`FastAPI` & Worker):** * The async `ffmpeg` utility service.
    * The `aioboto3` MinIO upload service.
    * The Background Worker setup (ARQ/Redis) initialized with `faster-whisper` (`vad_filter=True`).
    * FastAPI routes for: file uploads, enqueuing tasks, and polling/fetching status.
4.  **Frontend Components (`React` + `Tailwind`):**
    * The `VoiceRecorder` component with the MIME-type fallback logic.
    * The `TranscriptionManager` component featuring the polling logic, text editor, and `.txt` downloader.

Ensure all code handles asynchronous tasks cleanly and handles exceptions for audio file corruption, missing VAD models, or task failures gracefully.