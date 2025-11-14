from fastapi import APIRouter, Depends, Request, status, Header
from fastapi.responses import JSONResponse
from typing import Optional

from helpers.config import get_settings, Settings
from helpers.admin_auth import require_admin
from models.ProjectModel import ProjectModel


projects_admin_router = APIRouter(
    prefix="/api/v1/projects",
    tags=["api_v1", "projects"],
)


@projects_admin_router.get("/")
async def list_all_projects(request: Request, page: int = 1, page_size: int = 50, app_settings: Settings = Depends(get_settings), authorization: str | None = Header(default=None)):
    try:
        token_data, error = require_admin(authorization)
        if error is not None:
            return error

        model = await ProjectModel.create_instance(db_client=request.app.db_client)
        projects, total_pages = await model.get_all_projects(page=page, page_size=page_size)
        return [
            {
                "project_id": p.project_id,
                "project_uuid": str(p.project_uuid),
                "nom_projet": p.nom_projet,
                "description_projet": p.description_projet,
                "user_id": p.user_id,
                "created_at": p.created_at.isoformat() if getattr(p, "created_at", None) else None,
                "updated_at": p.updated_at.isoformat() if getattr(p, "updated_at", None) else None,
            }
            for p in projects
        ]
    except Exception as e:
        print(f"Erreur dans list_all_projects: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"signal": "internal_error", "error": str(e)}
        )



