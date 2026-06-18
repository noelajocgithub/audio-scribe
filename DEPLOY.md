# Deploy / Update Runbook

How to ship changes to the production server (`talinoserver4`,
`https://dostscribe.dostcaraga.ph`).

## Architecture (where things run)

Everything runs on the Linux server under systemd; the units live in
[`systemd/`](systemd/):

| Component | Unit / process | Notes |
|---|---|---|
| API (FastAPI/uvicorn) | `audioscribe-api.service` | `127.0.0.1:8000`, 4 workers |
| Transcription worker | `audioscribe-worker.service` | ARQ + faster-whisper, `Restart=always` |
| Object storage | `audioscribe-minio.service` | MinIO |
| Postgres / Redis | system `postgresql` / `redis-server` | |
| Frontend | nginx serving `frontend/dist/` | built static assets |

- Repo on server: `/home/talinoserver4/Documents/audio-scribe`
- Shared Python venv (api **and** worker): `backend/.venv`
- Env file (gitignored — **edit on the server, never committed**):
  `backend/.env`

The worker must run **on the server**, co-located with Redis/Postgres/MinIO.
Running it elsewhere over SSH tunnels is a debug-only stopgap: it dies when the
tunnel drops and silently leaves jobs stuck in `Processing`.

## From your workstation

```bash
# Commit + push to main — the server deploys by pulling main.
git push origin main
```

## On the server (SSH in)

### 0. Diagnose first (when fixing a failure)
```bash
sudo systemctl status audioscribe-worker --no-pager
journalctl -u audioscribe-worker -n 80 --no-pager
# Common culprits:
#   - crash-loop on model load  -> bad WHISPER_MODEL in backend/.env
#   - ModuleNotFoundError: faster_whisper -> deps not installed in the venv
```

### 1. Pull code
```bash
cd /home/talinoserver4/Documents/audio-scribe
git pull origin main
```

### 2. Backend deps (shared venv)
```bash
cd backend
.venv/bin/pip install -r requirements-worker.txt
.venv/bin/python -c "import faster_whisper; print('faster-whisper', faster_whisper.__version__)"
```

### 3. Server `.env` (gitignored — your local edits do NOT reach it)
Ensure `backend/.env` contains:
```ini
WHISPER_MODEL=large-v3-turbo      # ~8x faster than large-v3, near-identical accuracy
WHISPER_COMPUTE_TYPE=int8
WHISPER_LANGUAGE=auto
# Optional (sensible defaults exist):
# WHISPER_JOB_TIMEOUT=21600        # 6h ceiling for very long files
# TRANSCRIPTION_STALL_TIMEOUT=300  # mark dead jobs Failed after 5 min idle
```
Remove any old `WHISPER_MODEL=mlx-community/...` line — faster-whisper cannot
load MLX models, which makes the worker crash-loop.

> GPU: if the box has an NVIDIA GPU (`nvidia-smi`), set `WHISPER_DEVICE=cuda` +
> `WHISPER_COMPUTE_TYPE=float16` for a large speedup over CPU.

### 4. Rebuild frontend (nginx serves `frontend/dist/`)
```bash
cd ../frontend
npm install
npm run build
```

### 5. Restart services
```bash
sudo systemctl restart audioscribe-worker audioscribe-api
sudo systemctl enable  audioscribe-worker audioscribe-api   # survive reboot
```
First worker start downloads the `large-v3-turbo` model (~1.6 GB). Watch for it:
```bash
journalctl -u audioscribe-worker -f   # wait for: Model loaded: large-v3-turbo
```

### 6. Verify
```bash
sudo systemctl is-active audioscribe-worker audioscribe-api   # both: active
journalctl -u audioscribe-worker -n 30 --no-pager             # no crash loop
curl -s http://127.0.0.1:8000/ ; echo                         # API responds
```
Then in the browser: upload a short clip, **Save & Transcribe**, and confirm the
progress bar climbs past 0% to `Completed`.

## Notes

- **No DB migration** is required for the current changes — the stalled-job
  detection reuses existing columns.
- The stalled-job reconciler only activates after the **API** restart (step 5):
  a job left with no advancing worker flips to `Failed` with a clear message
  within `TRANSCRIPTION_STALL_TIMEOUT` instead of spinning at 0% forever.
- **Rollback:** `git checkout <previous-sha>` then repeat steps 4–5.
