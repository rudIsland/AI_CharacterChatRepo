from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ConversationCreate(BaseModel):
    character_id: str = Field(min_length=1)
    title: str | None = None


class ConversationRead(BaseModel):
    id: str
    character_id: str
    title: str
    created_at: datetime
    updated_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class MessageRead(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
