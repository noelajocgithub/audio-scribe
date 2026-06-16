CREATE TABLE IF NOT EXISTS audio_files (
    id SERIAL PRIMARY KEY,
    original_filename VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    file_format VARCHAR(50) NOT NULL,
    duration_seconds FLOAT,
    storage_key VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,
    upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Friendly display name (defaults to the original filename on upload).
ALTER TABLE audio_files ADD COLUMN IF NOT EXISTS title VARCHAR(255);
UPDATE audio_files SET title = original_filename WHERE title IS NULL;

CREATE TABLE IF NOT EXISTS transcriptions (
    id SERIAL PRIMARY KEY,
    audio_file_id INTEGER NOT NULL UNIQUE,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processing', 'Completed', 'Failed', 'Cancelled')),
    transcription_text TEXT,
    progress INTEGER NOT NULL DEFAULT 0,
    cancel_requested BOOLEAN NOT NULL DEFAULT FALSE,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (audio_file_id) REFERENCES audio_files(id) ON DELETE CASCADE
);

-- Idempotent upgrades for databases created before these columns/status existed.
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0;
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS cancel_requested BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE transcriptions DROP CONSTRAINT IF EXISTS transcriptions_status_check;
ALTER TABLE transcriptions ADD CONSTRAINT transcriptions_status_check
    CHECK (status IN ('Pending', 'Processing', 'Completed', 'Failed', 'Cancelled'));

CREATE INDEX IF NOT EXISTS idx_audio_files_upload_timestamp ON audio_files(upload_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audio_files_storage_key ON audio_files(storage_key);
CREATE INDEX IF NOT EXISTS idx_transcriptions_status ON transcriptions(status);
CREATE INDEX IF NOT EXISTS idx_transcriptions_audio_file_id ON transcriptions(audio_file_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_created_at ON transcriptions(created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_audio_files_updated_at ON audio_files;
CREATE TRIGGER update_audio_files_updated_at BEFORE UPDATE ON audio_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transcriptions_updated_at ON transcriptions;
CREATE TRIGGER update_transcriptions_updated_at BEFORE UPDATE ON transcriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
