"""AI document generation routes with SSE streaming."""

import io
import json
import logging

import markdown
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from slugify import slugify
from weasyprint import HTML

from app.auth.dependencies import require_user
from app.auth.rate_limit import rate_limit_generate
from app.models import GenerateRequest, GenerationOut, SaveDocumentRequest, SavedDocumentOut
from app.services.generation_service import GenerationService
from app.services.ollama_service import OllamaService
from app.services.prompt_service import PromptService
from app.services.transcription_service import TranscriptionService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/v1/generate/")
async def generate_document(body: GenerateRequest, user: dict = Depends(rate_limit_generate)):
    """Stream AI-generated document via Server-Sent Events."""

    # Validate: exactly one of prompt_template_id or custom_prompt
    if not body.prompt_template_id and not body.custom_prompt:
        raise HTTPException(status_code=422, detail="Provide either prompt_template_id or custom_prompt.")
    if body.prompt_template_id and body.custom_prompt:
        raise HTTPException(status_code=422, detail="Provide only one of prompt_template_id or custom_prompt, not both.")

    # Validate model
    OllamaService.validate_model(body.model)

    # Resolve transcription text
    transcription_text = body.transcription_override
    if not transcription_text and body.transcription_id:
        transcription = await TranscriptionService.get_transcription(body.transcription_id)
        if not transcription:
            raise HTTPException(status_code=404, detail="Transcription not found")
        transcription_text = transcription.get("transcription_text", "")

    if not transcription_text or not transcription_text.strip():
        raise HTTPException(status_code=422, detail="No transcription text available to process.")

    # Resolve instruction
    if body.prompt_template_id:
        template = await PromptService.get_by_id(body.prompt_template_id)
        if not template or not template.get("is_active"):
            raise HTTPException(status_code=404, detail="Prompt template not found or inactive.")
        instruction = template["template"].replace("{{transcription}}", "")
    else:
        instruction = body.custom_prompt

    # Build Ollama payload
    payload = OllamaService.build_payload(transcription_text, instruction, body.model)

    # Create generation record
    generation_id = await GenerationService.create(
        user_id=user["id"],
        transcription_id=body.transcription_id,
        prompt_template_id=body.prompt_template_id,
        custom_prompt=body.custom_prompt,
        ollama_model=body.model,
        context_snapshot=transcription_text,
    )

    async def event_stream():
        full_output = []
        try:
            async for token in OllamaService.stream_chat(payload):
                full_output.append(token)
                yield f"data: {json.dumps({'token': token})}\n\n"

            output_text = "".join(full_output)
            await GenerationService.update_completed(generation_id, output_text)
            yield f"data: {json.dumps({'done': True, 'generation_id': generation_id})}\n\n"

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Generation failed for {generation_id}: {error_msg}")
            await GenerationService.update_failed(generation_id, error_msg)
            yield f"data: {json.dumps({'error': error_msg})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/v1/generate/saved", response_model=list[SavedDocumentOut])
async def list_saved(
    user: dict = Depends(require_user),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    """List saved documents for the current user."""
    documents = await GenerationService.list_saved(user["id"], limit=limit, offset=offset)
    return documents


@router.get("/v1/generate/", response_model=list[GenerationOut])
async def list_generations(user: dict = Depends(require_user)):
    """List current user's AI generation history."""
    generations = await GenerationService.list_for_user(user["id"])
    return generations


@router.get("/v1/generate/{generation_id}", response_model=GenerationOut)
async def get_generation(generation_id: str, user: dict = Depends(require_user)):
    """Get a specific generation record (ownership-scoped)."""
    generation = await GenerationService.get_by_id(generation_id, user["id"])
    if not generation:
        raise HTTPException(status_code=404, detail="Generation not found")
    return generation


@router.patch("/v1/generate/{generation_id}/save")
async def save_generation(
    generation_id: str,
    body: SaveDocumentRequest,
    user: dict = Depends(require_user),
):
    """Mark a generation as a saved document with a title."""
    success = await GenerationService.mark_saved(generation_id, user["id"], body.document_title)
    if not success:
        raise HTTPException(status_code=404, detail="Generation not found or not completed")
    return {"message": "Generation saved", "id": generation_id}


@router.patch("/v1/generate/{generation_id}/unsave")
async def unsave_generation(generation_id: str, user: dict = Depends(require_user)):
    """Remove saved status from a generation."""
    success = await GenerationService.mark_unsaved(generation_id, user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Generation not found")
    return {"message": "Generation unsaved", "id": generation_id}


@router.get("/v1/generate/{generation_id}/download/pdf")
async def download_pdf(generation_id: str, user: dict = Depends(require_user)):
    """Download a generation as a formatted PDF document."""
    generation = await GenerationService.get_by_id(generation_id, user["id"])
    if not generation:
        raise HTTPException(status_code=404, detail="Generation not found")
    if not generation.get("output"):
        raise HTTPException(status_code=422, detail="No output to download")

    title = generation.get("document_title") or "AI Document"
    created = generation.get("created_at", "")
    date_str = str(created)[:10] if created else ""

    md_html = markdown.markdown(generation["output"], extensions=["tables", "fenced_code"])

    html_template = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
@page {{ size: A4; margin: 2.5cm; @bottom-center {{ content: "Page " counter(page) " of " counter(pages); font-size: 8pt; color: #999; }} }}
body {{ font-family: 'Liberation Sans', Helvetica, Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #222; }}
h1 {{ font-size: 18pt; margin-bottom: 0.5em; border-bottom: 2px solid #7c3aed; padding-bottom: 0.3em; }}
h2 {{ font-size: 14pt; margin-top: 1.5em; color: #4c1d95; }}
h3 {{ font-size: 12pt; margin-top: 1.2em; }}
ul, ol {{ margin-left: 1.5em; }}
li {{ margin-bottom: 0.3em; }}
table {{ border-collapse: collapse; width: 100%; margin: 1em 0; }}
th, td {{ border: 1px solid #ddd; padding: 0.5em; text-align: left; }}
th {{ background: #f3f4f6; }}
.header {{ margin-bottom: 2em; }}
.header h1 {{ margin-bottom: 0.2em; }}
.header .date {{ font-size: 10pt; color: #666; }}
.watermark {{ position: fixed; bottom: 1cm; right: 2.5cm; font-size: 8pt; color: #ccc; }}
</style></head><body>
<div class="header"><h1>{title}</h1><div class="date">Generated: {date_str}</div></div>
{md_html}
<div class="watermark">Audio Scribe</div>
</body></html>"""

    pdf_bytes = HTML(string=html_template).write_pdf()
    slug = slugify(title) or "document"
    filename = f"{slug}_{date_str}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
