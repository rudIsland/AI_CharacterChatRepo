from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

AiModelProvider = Literal["gpt", "gemini", "local_ai"]


class ChatSessionCreateRequest(BaseModel):
    character_id: str = Field(min_length=1, max_length=50)
    guest_id: str = Field(default="guest", min_length=1, max_length=50)
    ai_model_provider: AiModelProvider = "gpt"


class ChatSessionSummary(BaseModel):
    chat_session_id: str
    character_id: str
    guest_id: str
    ai_model_provider: AiModelProvider
    created_at: datetime


class ChatMessage(BaseModel):
    message_id: str
    role: Literal["user", "assistant"]
    message_text: str
    created_at: datetime


class ChatMessageCreateRequest(BaseModel):
    user_message_text: str = Field(min_length=1, max_length=2000)
    ai_model_provider: AiModelProvider | None = None


class ChatSessionMessageCreateResponse(BaseModel):
    chat_session_id: str
    user_message: ChatMessage
    assistant_message: ChatMessage


class ChatSessionMessageListResponse(BaseModel):
    chat_session_id: str
    message_list: list[ChatMessage]
