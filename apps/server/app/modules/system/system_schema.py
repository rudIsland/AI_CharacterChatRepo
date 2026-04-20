from pydantic import BaseModel, Field

from app.modules.chat.chat_schema import AiModelProvider


class HealthResponse(BaseModel):
    status: str
    service_name: str


class PingResponse(BaseModel):
    message: str


class EchoRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)


class EchoResponse(BaseModel):
    message: str
    message_length: int


class AiModelOption(BaseModel):
    ai_model_provider: AiModelProvider
    ai_model_name: str
    ai_model_label: str


class AiModelOptionListResponse(BaseModel):
    ai_model_option_list: list[AiModelOption]
