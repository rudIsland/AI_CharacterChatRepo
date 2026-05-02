from fastapi import APIRouter, Query, Request

from app.core.app_settings import get_app_settings
from app.exceptions.app_exception import AppException, TooManyRequestsException
from app.modules.ai.ai_reply_service import AiReplyService
from app.modules.chat.chat_schema import (
    ChatMessageCreateRequest,
    ChatSessionCreateRequest,
    ChatSessionMessageCreateResponse,
    ChatSessionMessageListResponse,
    ChatSessionSummary,
)
from app.modules.chat.chat_service import ChatService
from app.modules.chat.chat_store_factory import create_chat_store
from app.modules.chat.chat_usage_tracker import (
    daily_request_limiter,
    get_request_ip_address,
)

chat_router = APIRouter(prefix="/chat-sessions", tags=["chat"])

app_settings = get_app_settings()
chat_store = create_chat_store(app_settings)
ai_reply_service = AiReplyService(app_settings=app_settings)
chat_service = ChatService(
    chat_store=chat_store,
    ai_reply_service=ai_reply_service,
    app_settings=app_settings,
)


@chat_router.post("", response_model=ChatSessionSummary)
async def create_chat_session(request_body: ChatSessionCreateRequest) -> ChatSessionSummary:
    return await chat_service.create_chat_session(
        character_id=request_body.character_id,
        guest_id=request_body.guest_id,
        ai_model_id=request_body.ai_model_id,
    )


@chat_router.get("", response_model=list[ChatSessionSummary])
def get_chat_session_list(guest_id: str = Query(min_length=1, max_length=50)) -> list[ChatSessionSummary]:
    return chat_service.list_chat_session_by_guest_id(guest_id)


@chat_router.get("/{chat_session_id}/messages", response_model=ChatSessionMessageListResponse)
def get_chat_message_list(chat_session_id: str) -> ChatSessionMessageListResponse:
    return chat_service.list_chat_message_by_session_id(chat_session_id)


@chat_router.post("/{chat_session_id}/messages", response_model=ChatSessionMessageCreateResponse)
async def create_chat_message(
    request: Request,
    chat_session_id: str,
    request_body: ChatMessageCreateRequest,
) -> ChatSessionMessageCreateResponse:
    ip_address = get_request_ip_address(request)
    limit_result = daily_request_limiter.increase_request_count(ip_address)
    if not limit_result.is_allowed:
        raise TooManyRequestsException(limit_result.error_message or "AI 요청 한도를 초과했습니다.")

    try:
        return await chat_service.create_chat_message(
            chat_session_id=chat_session_id,
            user_message_text=request_body.user_message_text,
            ai_model_id=request_body.ai_model_id,
        )
    except Exception:
        daily_request_limiter.decrease_request_count(ip_address)
        raise
