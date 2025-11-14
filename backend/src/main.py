from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import base, data, nlp, user, conversation, message, personal_projects, auth, project_admin, maturity
from helpers.config import get_settings
from stores.llm.LLMProviderFactory import LLMProviderFactory
from stores.vectordb.VectorDBProviderFactory import VectorDBProviderFactory
from stores.llm.templates.template_parser import TemplateParser
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select

from helpers.metrics import setup_metrics
from models.UserModel import UserModel
from models.db_schemes import User, UserRole
from helpers.security import hash_password

app = FastAPI()

setup_metrics(app)

async def startup_span():
    settings = get_settings()

    postgres_conn = f"postgresql+asyncpg://{settings.POSTGRES_USERNAME}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_MAIN_DATABASE}"

    app.db_engine = create_async_engine(postgres_conn)
    app.db_client = sessionmaker(
        app.db_engine, class_=AsyncSession, expire_on_commit=False
    )

    llm_provider_factory = LLMProviderFactory(settings)
    vectordb_provider_factory = VectorDBProviderFactory(config=settings, db_client=app.db_client)

    # generation client
    app.generation_client = llm_provider_factory.create(provider=settings.GENERATION_BACKEND)
    app.generation_client.set_generation_model(model_id = settings.GENERATION_MODEL_ID)

    # embedding client
    app.embedding_client = llm_provider_factory.create(provider=settings.EMBEDDING_BACKEND)
    app.embedding_client.set_embedding_model(model_id=settings.EMBEDDING_MODEL_ID,
                                             embedding_size=settings.EMBEDDING_MODEL_SIZE)
    
    
    # vector db client
    app.vectordb_client = vectordb_provider_factory.create(
        provider=settings.VECTOR_DB_BACKEND
    )
    await app.vectordb_client.connect()

    app.template_parser = TemplateParser(
        language=settings.PRIMARY_LANG,
        default_language=settings.DEFAULT_LANG,
    )
    
    # Créer un admin par défaut s'il n'existe pas
    await create_default_admin(app.db_client)


async def shutdown_span():
    app.db_engine.dispose()
    await app.vectordb_client.disconnect()

async def create_default_admin(db_client):
    """
    Crée un administrateur par défaut s'il n'existe pas.
    Email: admin@gmail.com
    Password: Admin10
    """
    try:
        user_model = await UserModel.create_instance(db_client=db_client)
        
        # Vérifier si un admin existe déjà
        async with db_client() as session:
            async with session.begin():
                query = select(User).where(User.user_role == UserRole.ADMIN)
                result = await session.execute(query)
                admin_exists = result.scalar_one_or_none() is not None
        
        if admin_exists:
            print("✓ Un administrateur existe déjà dans la base de données.")
            return
        
        # Vérifier si l'email admin@gmail.com existe déjà
        existing_user = await user_model.get_user_by_email("admin@gmail.com")
        if existing_user:
            print(f"✓ L'utilisateur admin@gmail.com existe déjà (ID: {existing_user.user_id})")
            return
        
        # Créer l'admin par défaut
        admin_user = User(
            first_name="Admin",
            last_name="System",
            user_role=UserRole.ADMIN,
            email="admin@gmail.com",
            password_hash=hash_password("Admin10"),
            email_verified=True,  # Email vérifié pour pouvoir se connecter directement
            email_verification_token=None,
        )
        
        created_admin = await user_model.create_user(admin_user)
        print("=" * 60)
        print("✓ ADMIN PAR DÉFAUT CRÉÉ AVEC SUCCÈS")
        print("=" * 60)
        print(f"  Email: admin@gmail.com")
        print(f"  Mot de passe: Admin10")
        print(f"  ID: {created_admin.user_id}")
        print(f"  Rôle: ADMIN")
        print(f"  Email vérifié: Oui")
        print("=" * 60)
        print("⚠️  IMPORTANT: Changez le mot de passe après la première connexion !")
        print("=" * 60)
        
    except Exception as e:
        print(f"⚠️  Erreur lors de la création de l'admin par défaut: {e}")
        import traceback
        traceback.print_exc()

app.on_event("startup")(startup_span)
app.on_event("shutdown")(shutdown_span)

# CORS middleware to allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(base.base_router)
app.include_router(data.data_router)
app.include_router(nlp.nlp_router)
app.include_router(user.user_router)
app.include_router(conversation.conversation_router)
app.include_router(message.message_router)
app.include_router(personal_projects.personal_projects_router)
app.include_router(auth.auth_router)
app.include_router(project_admin.projects_admin_router)
app.include_router(maturity.maturity_router)
