import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, func, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    widget_config: Mapped[dict | None] = mapped_column(Text, nullable=True)  # JSON stored as text
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    users: Mapped[list["User"]] = relationship("User", back_populates="tenant")
    knowledge_sources: Mapped[list["KnowledgeSource"]] = relationship("KnowledgeSource", back_populates="tenant")
    llm_config: Mapped["TenantLLMConfig | None"] = relationship("TenantLLMConfig", back_populates="tenant", uselist=False)
