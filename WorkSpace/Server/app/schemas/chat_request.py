from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    character_id: str = Field(min_length=1)
    conversation_id: str | None = None
    user_message: str = Field(min_length=1)
