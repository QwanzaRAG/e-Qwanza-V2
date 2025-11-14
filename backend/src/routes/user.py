from fastapi import APIRouter, Depends, Request, status, Header
from fastapi.responses import JSONResponse, Response
from typing import Optional
from helpers.config import get_settings, Settings
from models.UserModel import UserModel
from models.db_schemes import User, UserRole
from helpers.security import hash_password
from helpers.admin_auth import require_admin


user_router = APIRouter(
    prefix="/api/v1/users",
    tags=["api_v1", "users"],
)


@user_router.post("/", status_code=status.HTTP_201_CREATED)
async def create_user_endpoint(request: Request, payload: dict, app_settings: Settings = Depends(get_settings), authorization: str | None = Header(default=None)):
    token_data, error = require_admin(authorization)
    if error is not None:
        return error
    user_model = await UserModel.create_instance(db_client=request.app.db_client)

    role_value = payload.get("user_role")
    user_role = None
    if role_value is not None:
        # accepte soit 'ADMIN'/'USER'/'MODERATOR' soit 'admin'/'user'/'moderator'
        try:
            user_role = UserRole(role_value) if role_value in [r.value for r in UserRole] else UserRole[role_value.upper()]
        except Exception:
            return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"signal": "invalid_user_role"})

    # Accepte uniquement un mot de passe en clair et le hash systématiquement
    provided_password = payload.get("password")
    if not provided_password:
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"signal": "password_required"})
    final_password_hash = hash_password(provided_password)

    record = User(
        first_name=payload.get("first_name"),
        last_name=payload.get("last_name"),
        user_role=user_role or UserRole.USER,
        email=payload.get("email"),
        password_hash=final_password_hash,
    )
    created = await user_model.create_user(record)
    return {"user_id": created.user_id, "email": created.email}


@user_router.get("/{user_id}")
async def get_user_endpoint(request: Request, user_id: int):
    user_model = await UserModel.create_instance(db_client=request.app.db_client)
    record = await user_model.get_user_by_id(user_id)
    if record is None:
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"signal": "user_not_found"})
    return {
        "user_id": record.user_id,
        "first_name": record.first_name,
        "last_name": record.last_name,
        "email": record.email,
        "user_role": record.user_role.value if hasattr(record.user_role, "value") else str(record.user_role),
    }


@user_router.get("/")
async def list_users_endpoint(request: Request, page: int = 1, page_size: int = 20, authorization: str | None = Header(default=None)):
    token_data, error = require_admin(authorization)
    if error is not None:
        return error
    
    user_model = await UserModel.create_instance(db_client=request.app.db_client)
    records = await user_model.list_users(page=page, page_size=page_size)
    return [
        {
            "user_id": r.user_id,
            "first_name": r.first_name,
            "last_name": r.last_name,
            "email": r.email,
            "user_role": r.user_role.value if hasattr(r.user_role, "value") else str(r.user_role),
        }
        for r in records
    ]


@user_router.put("/{user_id}")
async def update_user_endpoint(request: Request, user_id: int, payload: dict):
    user_model = await UserModel.create_instance(db_client=request.app.db_client)
    fields = {
        "first_name": payload.get("first_name"),
        "last_name": payload.get("last_name"),
        "email": payload.get("email"),
    }

    # Mise à jour du mot de passe uniquement via "password" en clair
    new_password = payload.get("password")
    if new_password:
        fields["password_hash"] = hash_password(new_password)

    role_value = payload.get("user_role")
    if role_value is not None:
        try:
            fields["user_role"] = UserRole(role_value) if role_value in [r.value for r in UserRole] else UserRole[role_value.upper()]
        except Exception:
            return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"signal": "invalid_user_role"})

    updated = await user_model.update_user(user_id, **fields)
    if updated is None:
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"signal": "user_not_found"})
    return {"signal": "user_update_success", "user_id": updated.user_id}


@user_router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_endpoint(request: Request, user_id: int, authorization: str | None = Header(default=None)):
    token_data, error = require_admin(authorization)
    if error is not None:
        return error
    user_model = await UserModel.create_instance(db_client=request.app.db_client)
    ok = await user_model.delete_user(user_id, vectordb_client=request.app.vectordb_client)
    if not ok:
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"signal": "user_not_found"})
    # Pour une réponse 204 No Content, on retourne Response sans contenu
    return Response(status_code=status.HTTP_204_NO_CONTENT)


