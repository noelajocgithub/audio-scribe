-- Add document save fields to ai_generations.
ALTER TABLE ai_generations ADD COLUMN IF NOT EXISTS document_title VARCHAR(200);
ALTER TABLE ai_generations ADD COLUMN IF NOT EXISTS saved_at TIMESTAMPTZ;
ALTER TABLE ai_generations ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_ai_generations_saved
    ON ai_generations(user_id, is_saved) WHERE is_saved = true;
