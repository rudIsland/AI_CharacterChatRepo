from fastapi import APIRouter, Request

from app.core.app_settings import get_app_settings
from app.modules.ai.ai_model_registry import (
    AiModelDefinition,
    list_selectable_ai_model_definitions,
)
from app.modules.chat.chat_usage_tracker import (
    daily_request_limiter,
    get_request_ip_address,
)
from app.modules.system.system_schema import (
    AiModelOption,
    AiModelOptionListResponse,
    DailyRequestUsageResponse,
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
        build_ai_model_option(ai_model_definition)
        for ai_model_definition in list_selectable_ai_model_definitions(app_settings)
    ]
    return AiModelOptionListResponse(ai_model_option_list=ai_model_option_list)


@system_router.get("/daily-request-usage", response_model=DailyRequestUsageResponse)
def get_daily_request_usage(request: Request) -> DailyRequestUsageResponse:
    client_ip_address = get_request_ip_address(request)
    usage_snapshot = daily_request_limiter.get_usage_snapshot()
    return DailyRequestUsageResponse(
        current_date=usage_snapshot.current_date.isoformat(),
        daily_request_count=usage_snapshot.daily_request_count,
        daily_request_limit=usage_snapshot.daily_request_limit,
        client_ip_address=client_ip_address,
        client_daily_request_count=usage_snapshot.daily_request_count_by_ip.get(client_ip_address, 0),
        client_daily_request_limit=usage_snapshot.daily_request_limit_per_ip,
    )


def build_ai_model_option(ai_model_definition: AiModelDefinition) -> AiModelOption:
    return AiModelOption(
        ai_model_id=ai_model_definition.ai_model_id,
        ai_model_provider=ai_model_definition.ai_model_provider,
        ai_model_name=ai_model_definition.ai_model_name,
        ai_model_label=ai_model_definition.ai_model_label,
    )
