from fastapi import APIRouter, HTTPException, Query, status

from app.core.app_settings import get_app_settings
from app.modules.ai.ai_reply_service import AiReplyService
from app.modules.chat.chat_schema import (
    ChatMessageCreateRequest,
    ChatSessionCreateRequest,
    ChatSessionMessageCreateResponse,
    ChatSessionMessageListResponse,
    ChatSessionSummary,
)
from app.modules.chat.chat_service import ChatService, ChatSessionNotFoundError
from app.modules.chat.chat_store import InMemoryChatStore

chat_router = APIRouter(prefix="/chat-sessions", tags=["chat"])

chat_store = InMemoryChatStore()
ai_reply_service = AiReplyService(app_settings=get_app_settings())
chat_service = ChatService(chat_store=chat_store, ai_reply_service=ai_reply_service)


@chat_router.post("", response_model=ChatSessionSummary)
async def create_chat_session(
    request_body: ChatSessionCreateRequest,
) -> ChatSessionSummary:
    try:
        return await chat_service.create_chat_session(
            character_id=request_body.character_id,
            guest_id=request_body.guest_id,
            ai_model_provider=request_body.ai_model_provider,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error


@chat_router.get("", response_model=list[ChatSessionSummary])
def get_chat_session_list(guest_id: str = Query(min_length=1, max_length=50)) -> list[ChatSessionSummary]:
    return chat_service.list_chat_session_by_guest_id(guest_id)


@chat_router.get("/{chat_session_id}/messages", response_model=ChatSessionMessageListResponse)
def get_chat_message_list(chat_session_id: str) -> ChatSessionMessageListResponse:
    try:
        return chat_service.list_chat_message_by_session_id(chat_session_id)
    except ChatSessionNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session not found: {chat_session_id}",
        ) from error


@chat_router.post(
    "/{chat_session_id}/messages",
    response_model=ChatSessionMessageCreateResponse,
)
async def create_chat_message(
    chat_session_id: str,
    request_body: ChatMessageCreateRequest,
) -> ChatSessionMessageCreateResponse:
    try:
        return await chat_service.create_chat_message(
            chat_session_id=chat_session_id,
            user_message_text=request_body.user_message_text,
            ai_model_provider=request_body.ai_model_provider,
        )
    except ChatSessionNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session not found: {chat_session_id}",
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
