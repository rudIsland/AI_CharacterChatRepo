from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, Float, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Character(Base):
    __tablename__ = "characters"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    system_prompt: Mapped[str] = mapped_column(Text)
    greeting_message: Mapped[str] = mapped_column(Text, default="")
    model_provider: Mapped[str] = mapped_column(String(50), default="ollama")
    model_name: Mapped[str] = mapped_column(String(100), default="")
    temperature: Mapped[float] = mapped_column(Float, default=0.7)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    conversations: Mapped[list["Conversation"]] = relationship(
        back_populates="character",
        cascade="all, delete-orphan",
    )
    memories: Mapped[list["Memory"]] = relationship(
        back_populates="character",
        cascade="all, delete-orphan",
    )
