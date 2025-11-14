from .BaseDataModel import BaseDataModel
from .db_schemes import User, Message, Conversation, Project, Asset, DataChunk
from sqlalchemy.future import select
from sqlalchemy import delete


class UserModel(BaseDataModel):

    def __init__(self, db_client: object):
        super().__init__(db_client=db_client)
        self.db_client = db_client

    @classmethod
    async def create_instance(cls, db_client: object):
        instance = cls(db_client)
        return instance

    async def create_user(self, user: User):
        async with self.db_client() as session:
            async with session.begin():
                session.add(user)
            await session.commit()
            await session.refresh(user)
        return user

    async def get_user_by_id(self, user_id: int):
        async with self.db_client() as session:
            async with session.begin():
                query = select(User).where(User.user_id == user_id)
                result = await session.execute(query)
                return result.scalar_one_or_none()

    async def get_user_by_email(self, email: str):
        async with self.db_client() as session:
            async with session.begin():
                query = select(User).where(User.email == email)
                result = await session.execute(query)
                return result.scalar_one_or_none()

    async def list_users(self, page: int = 1, page_size: int = 20):
        async with self.db_client() as session:
            async with session.begin():
                query = select(User).offset((page - 1) * page_size).limit(page_size)
                result = await session.execute(query)
                return result.scalars().all()

    async def update_user(self, user_id: int, **fields):
        async with self.db_client() as session:
            async with session.begin():
                query = select(User).where(User.user_id == user_id)
                result = await session.execute(query)
                record = result.scalar_one_or_none()
                if record is None:
                    return None
                for key, value in fields.items():
                    if hasattr(record, key) and value is not None:
                        setattr(record, key, value)
            await session.commit()
            await session.refresh(record)
            return record

    async def delete_user(self, user_id: int, vectordb_client=None) -> bool:
        async with self.db_client() as session:
            async with session.begin():
                # Vérifier que l'utilisateur existe
                result = await session.execute(select(User).where(User.user_id == user_id))
                user_record = result.scalar_one_or_none()
                if user_record is None:
                    return False
                
                # 1. Supprimer d'abord les messages (qui dépendent des conversations)
                await session.execute(delete(Message).where(Message.message_user_id == user_id))
                
                # 2. Supprimer les conversations des projets de l'utilisateur
                await session.execute(delete(Conversation).where(Conversation.conversation_project_id.in_(
                    select(Project.project_id).where(Project.user_id == user_id)
                )))
                
                # 3. Supprimer les données vectorielles des projets de l'utilisateur
                if vectordb_client:
                    # Récupérer les IDs des projets de l'utilisateur
                    projects_result = await session.execute(
                        select(Project.project_id).where(Project.user_id == user_id)
                    )
                    project_ids = [row[0] for row in projects_result.fetchall()]
                    
                    # Supprimer les collections vectorielles pour chaque projet
                    for project_id in project_ids:
                        try:
                            collection_name = f"collection_384_{project_id}"
                            await vectordb_client.delete_collection(collection_name=collection_name)
                        except Exception as e:
                            # Ignorer les erreurs si la collection n'existe pas
                            pass
                
                # 4. Supprimer les chunks (qui dépendent des assets)
                await session.execute(delete(DataChunk).where(DataChunk.chunk_project_id.in_(
                    select(Project.project_id).where(Project.user_id == user_id)
                )))
                
                # 5. Supprimer les assets (qui dépendent des projets)
                await session.execute(delete(Asset).where(Asset.asset_project_id.in_(
                    select(Project.project_id).where(Project.user_id == user_id)
                )))
                
                # 6. Supprimer les projets
                await session.execute(delete(Project).where(Project.user_id == user_id))
                
                # 7. Enfin, supprimer l'utilisateur
                await session.delete(user_record)
            await session.commit()
            return True
