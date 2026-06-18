"""Admin CRUD for AI prompt templates."""

import logging

from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import require_admin, require_user
from app.models import PromptTemplateCreate, PromptTemplateUpdate, PromptTemplateOut, PromptTemplateAdminOut
from app.services.prompt_service import PromptService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/v1/prompts/", response_model=list[PromptTemplateOut])
async def list_prompts(user: dict = Depends(require_user)):
    """Return active prompt templates (title/description/category only)."""
    templates = await PromptService.list_active()
    return templates


@router.get("/v1/prompts/admin", response_model=list[PromptTemplateAdminOut])
async def list_prompts_admin(user: dict = Depends(require_admin)):
    """Admin view: all templates including template body and inactive ones."""
    return await PromptService.list_all()


@router.get("/v1/prompts/{template_id}", response_model=PromptTemplateAdminOut)
async def get_prompt(template_id: str, user: dict = Depends(require_admin)):
    """Admin only: get full prompt template including template body."""
    template = await PromptService.get_by_id(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Prompt template not found")
    return template


@router.post("/v1/prompts/", response_model=PromptTemplateAdminOut, status_code=201)
async def create_prompt(body: PromptTemplateCreate, user: dict = Depends(require_admin)):
    """Create a new prompt template. Template must contain {{transcription}}."""
    if "{{transcription}}" not in body.template:
        raise HTTPException(
            status_code=422,
            detail="Template must contain the {{transcription}} placeholder.",
        )

    template_id = await PromptService.create(
        title=body.title,
        description=body.description,
        template=body.template,
        category=body.category,
        created_by=user["id"],
    )
    created = await PromptService.get_by_id(template_id)
    return created


@router.put("/v1/prompts/{template_id}", response_model=PromptTemplateAdminOut)
async def update_prompt(template_id: str, body: PromptTemplateUpdate, user: dict = Depends(require_admin)):
    """Update an existing prompt template."""
    existing = await PromptService.get_by_id(template_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Prompt template not found")

    if body.template is not None and "{{transcription}}" not in body.template:
        raise HTTPException(
            status_code=422,
            detail="Template must contain the {{transcription}} placeholder.",
        )

    await PromptService.update(template_id, **body.model_dump(exclude_unset=True))
    updated = await PromptService.get_by_id(template_id)
    return updated


@router.delete("/v1/prompts/{template_id}", status_code=200)
async def delete_prompt(template_id: str, user: dict = Depends(require_admin)):
    """Soft-delete a prompt template (sets is_active=FALSE)."""
    existing = await PromptService.get_by_id(template_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Prompt template not found")

    await PromptService.soft_delete(template_id)
    return {"message": "Prompt template deactivated", "id": template_id}
