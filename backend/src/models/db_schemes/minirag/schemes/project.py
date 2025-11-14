from .minirag_base import SQLAlchemyBase
from sqlalchemy import Column, Integer, DateTime, func, ForeignKey, String, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
import uuid
from sqlalchemy.orm import relationship

class Project(SQLAlchemyBase):

    __tablename__ = "projects"
    
    project_id = Column(Integer, primary_key=True, autoincrement=True)
    project_uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False)
    
    nom_projet = Column(String(255), nullable=True)
    description_projet = Column(Text, nullable=True)
    visibility = Column(
        Enum('private', 'public', name='project_visibility'),
        nullable=False,
        server_default='private'
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    user_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False
    )
    chunks = relationship("DataChunk", back_populates="project", cascade="all, delete-orphan")
    assets = relationship("Asset", back_populates="project", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="project", cascade="all, delete-orphan")
    user = relationship("User", back_populates="projects")
