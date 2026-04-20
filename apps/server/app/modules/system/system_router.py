from fastapi import APIRouter

from app.core.app_settings import get_app_settings
from app.modules.system.system_schema import (
    AiModelOption,
    AiModelOptionListResponse,
    EchoRequest,
    EchoResponse,
    HealthResponse,
    PingResponse,
)

system_router = APIRouter(tags=["system"])


@system_router.get("/health", response_model=HealthResponse)
def get_system_health() -> HealthResponse:
    return HealthResponse(status="ok", service_name="ai-character-chat-api")


@system_router.get("/ping", response_model=PingResponse)
def get_system_ping() -> PingResponse:
    return PingResponse(message="pong")


@system_router.post("/echo", response_model=EchoResponse)
def post_message_echo(request_body: EchoRequest) -> EchoResponse:
    message = request_body.message
    return EchoResponse(message=message, message_length=len(message))


@system_router.get("/ai-model-options", response_model=AiModelOptionListResponse)
def get_ai_model_option_list() -> AiModelOptionListResponse:
    app_settings = get_app_settings()
    ai_model_option_list = [
        AiModelOption(
            ai_model_provider="gpt",
            ai_model_name=app_settings.openai_model_name,
            ai_model_label=f"GPT ({app_settings.openai_model_name})",
        ),
        AiModelOption(
            ai_model_provider="gemini",
            ai_model_name=app_settings.gemini_model_name,
            ai_model_label=f"Gemini ({app_settings.gemini_model_name})",
        ),
        AiModelOption(
            ai_model_provider="local_ai",
            ai_model_name=app_settings.local_ai_model_name,
            ai_model_label=f"Local AI ({app_settings.local_ai_model_name})",
        ),
    ]
    return AiModelOptionListResponse(ai_model_option_list=ai_model_option_list)
