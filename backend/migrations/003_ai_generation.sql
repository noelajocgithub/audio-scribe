-- AI Document Generation: prompt templates + generation history.

CREATE TABLE IF NOT EXISTS prompt_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(80) NOT NULL,
    description     VARCHAR(200),
    template        TEXT NOT NULL,
    category        VARCHAR(50) NOT NULL DEFAULT 'custom',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prompt_templates_active ON prompt_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON prompt_templates(category);

DROP TRIGGER IF EXISTS update_prompt_templates_updated_at ON prompt_templates;
CREATE TRIGGER update_prompt_templates_updated_at BEFORE UPDATE ON prompt_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS ai_generations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transcription_id    INTEGER REFERENCES transcriptions(id) ON DELETE SET NULL,
    prompt_template_id  UUID REFERENCES prompt_templates(id) ON DELETE SET NULL,
    custom_prompt       TEXT,
    ollama_model        VARCHAR(60) NOT NULL,
    context_snapshot    TEXT NOT NULL,
    output              TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'streaming', 'completed', 'failed')),
    error_message       TEXT,
    is_saved            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_generations_user ON ai_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_transcription ON ai_generations(transcription_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_status ON ai_generations(status);

DROP TRIGGER IF EXISTS update_ai_generations_updated_at ON ai_generations;
CREATE TRIGGER update_ai_generations_updated_at BEFORE UPDATE ON ai_generations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
