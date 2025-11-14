from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta, timezone

from helpers.security import hash_password, verify_password, create_token, decode_token
from helpers.email_service import generate_verification_token, generate_reset_token, send_verification_email, send_password_reset_email
from helpers.config import get_settings
from models.UserModel import UserModel
from models.db_schemes import User, UserRole

auth_router = APIRouter(
    prefix="/api/v1/auth",
    tags=["api_v1", "auth"],
)


class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    role: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@auth_router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: Request, payload: RegisterRequest):
    user_model = await UserModel.create_instance(db_client=request.app.db_client)
    settings = get_settings()

    existing = await user_model.get_user_by_email(payload.email)
    if existing is not None:
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"signal": "email_already_exists"})

    try:
        role = UserRole(payload.role) if payload.role in [r.value for r in UserRole] else (UserRole[payload.role.upper()] if payload.role else UserRole.USER)
    except Exception:
        role = UserRole.USER

    # Générer un token de vérification
    verification_token = generate_verification_token()

    record = User(
        first_name=payload.first_name,
        last_name=payload.last_name,
        user_role=role,
        email=payload.email,
        password_hash=hash_password(payload.password),
        email_verified=False,
        email_verification_token=verification_token,
    )
    created = await user_model.create_user(record)

    # Envoyer l'email de vérification
    await send_verification_email(settings, payload.email, payload.first_name, verification_token)

    # Ne pas retourner les tokens - l'utilisateur doit d'abord vérifier son email
    return {
        "user_id": created.user_id,
        "email": created.email,
        "message": "Un email de vérification a été envoyé. Veuillez vérifier votre boîte de réception."
    }


@auth_router.post("/login")
async def login(request: Request, payload: LoginRequest):
    user_model = await UserModel.create_instance(db_client=request.app.db_client)
    user = await user_model.get_user_by_email(payload.email)
    if user is None or not verify_password(payload.password, user.password_hash):
        return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"signal": "invalid_credentials"})
    
    # Vérifier si l'email est vérifié
    if not user.email_verified:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"signal": "email_not_verified", "message": "Veuillez vérifier votre adresse email avant de vous connecter."}
        )
    
    access = create_token({"sub": str(user.user_id), "email": user.email, "role": user.user_role.value}, refresh=False)
    print(f"Token créé avec le rôle: {user.user_role.value}")  # Debug
    refresh = create_token({"sub": str(user.user_id)}, refresh=True)
    return {"access_token": access, "refresh_token": refresh}


class RefreshRequest(BaseModel):
    refresh_token: str


@auth_router.post("/refresh")
async def refresh_token(request: Request, payload: RefreshRequest):
    try:
        data = decode_token(payload.refresh_token)
        if data.get("type") != "refresh":
            return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"signal": "invalid_token_type"})
        user_id = data.get("sub")
        
        # Récupérer les informations complètes de l'utilisateur
        user_model = await UserModel.create_instance(db_client=request.app.db_client)
        user = await user_model.get_user_by_id(int(user_id))
        if user is None:
            return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"signal": "user_not_found"})
        
        # Créer un nouveau access token avec toutes les informations
        access = create_token({"sub": str(user.user_id), "email": user.email, "role": user.user_role.value}, refresh=False)
        print(f"Token refresh créé avec le rôle: {user.user_role.value}")  # Debug
        return {"access_token": access}
    except Exception:
        return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"signal": "invalid_token"})


@auth_router.post("/verify-email")
async def verify_email(request: Request, payload: VerifyEmailRequest):
    """Vérifie l'email de l'utilisateur avec le token"""
    user_model = await UserModel.create_instance(db_client=request.app.db_client)
    
    # Trouver l'utilisateur avec ce token
    async with request.app.db_client() as session:
        async with session.begin():
            from sqlalchemy.future import select
            query = select(User).where(User.email_verification_token == payload.token)
            result = await session.execute(query)
            user = result.scalar_one_or_none()
    
    if user is None:
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"signal": "invalid_token"})
    
    if user.email_verified:
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"signal": "email_already_verified"})
    
    # Marquer l'email comme vérifié et supprimer le token
    await user_model.update_user(
        user.user_id,
        email_verified=True,
        email_verification_token=None
    )
    
    return {"message": "Email vérifié avec succès"}


@auth_router.post("/resend-verification")
async def resend_verification(request: Request, payload: ResendVerificationRequest):
    """Renvoyer l'email de vérification"""
    user_model = await UserModel.create_instance(db_client=request.app.db_client)
    settings = get_settings()
    
    user = await user_model.get_user_by_email(payload.email)
    if user is None:
        # Ne pas révéler si l'email existe ou non pour la sécurité
        return {"message": "Si cet email existe, un email de vérification a été envoyé."}
    
    if user.email_verified:
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"signal": "email_already_verified"})
    
    # Générer un nouveau token
    verification_token = generate_verification_token()
    await user_model.update_user(user.user_id, email_verification_token=verification_token)
    
    # Envoyer l'email
    await send_verification_email(settings, payload.email, user.first_name, verification_token)
    
    return {"message": "Un email de vérification a été envoyé."}


@auth_router.post("/forgot-password")
async def forgot_password(request: Request, payload: ForgotPasswordRequest):
    """Demande de réinitialisation de mot de passe"""
    user_model = await UserModel.create_instance(db_client=request.app.db_client)
    settings = get_settings()
    
    user = await user_model.get_user_by_email(payload.email)
    if user is None:
        # Ne pas révéler si l'email existe ou non pour la sécurité
        return {"message": "Si cet email existe, un email de réinitialisation a été envoyé."}
    
    # Générer un token de réinitialisation
    reset_token = generate_reset_token()
    reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    
    await user_model.update_user(
        user.user_id,
        password_reset_token=reset_token,
        password_reset_expires=reset_expires
    )
    
    # Envoyer l'email
    await send_password_reset_email(settings, payload.email, user.first_name, reset_token)
    
    return {"message": "Si cet email existe, un email de réinitialisation a été envoyé."}


@auth_router.post("/reset-password")
async def reset_password(request: Request, payload: ResetPasswordRequest):
    """Réinitialise le mot de passe avec le token"""
    user_model = await UserModel.create_instance(db_client=request.app.db_client)
    
    # Trouver l'utilisateur avec ce token
    async with request.app.db_client() as session:
        async with session.begin():
            from sqlalchemy.future import select
            query = select(User).where(User.password_reset_token == payload.token)
            result = await session.execute(query)
            user = result.scalar_one_or_none()
    
    if user is None:
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"signal": "invalid_token"})
    
    # Vérifier si le token n'a pas expiré
    if user.password_reset_expires is None or user.password_reset_expires < datetime.now(timezone.utc):
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"signal": "token_expired"})
    
    # Vérifier la longueur du mot de passe
    if len(payload.new_password) < 6:
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"signal": "password_too_short"})
    
    # Mettre à jour le mot de passe et supprimer le token
    await user_model.update_user(
        user.user_id,
        password_hash=hash_password(payload.new_password),
        password_reset_token=None,
        password_reset_expires=None
    )
    
    return {"message": "Mot de passe réinitialisé avec succès"}


