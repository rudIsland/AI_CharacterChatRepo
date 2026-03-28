from pydantic import BaseModel


class ChatResponse(BaseModel):
    conversation_id: str
    character_id: str
    provider: str
    model_name: str
    reply: str
    assistant_message_id: str
