from app.modules.ai.ai_reply_service import AiReplyService, ChatHistoryTurn
from app.modules.character.character_data import find_character_profile_by_id
from app.modules.chat.chat_schema import (
    AiModelProvider,
    ChatMessage,
    ChatSessionMessageCreateResponse,
    ChatSessionMessageListResponse,
    ChatSessionSummary,
)
from app.modules.chat.chat_store import InMemoryChatStore, StoredChatMessage, StoredChatSession


class ChatSessionNotFoundError(Exception):
    pass


class ChatService:
    def __init__(
        self,
        chat_store: InMemoryChatStore,
        ai_reply_service: AiReplyService,
    ) -> None:
        self._chat_store = chat_store
        self._ai_reply_service = ai_reply_service

    async def create_chat_session(
        self,
        character_id: str,
        guest_id: str,
        ai_model_provider: AiModelProvider,
    ) -> ChatSessionSummary:
        character = find_character_profile_by_id(character_id)
        if character is None:
            raise ValueError(f"Character not found: {character_id}")

        chat_session = self._chat_store.create_chat_session(
            character_id=character_id,
            guest_id=guest_id,
            ai_model_provider=ai_model_provider,
        )
        return self._build_chat_session_summary(chat_session)

    def list_chat_session_by_guest_id(self, guest_id: str) -> list[ChatSessionSummary]:
        chat_session_list = self._chat_store.list_chat_session_by_guest_id(guest_id)
        return [
            self._build_chat_session_summary(chat_session)
            for chat_session in chat_session_list
        ]

    def list_chat_message_by_session_id(
        self,
        chat_session_id: str,
    ) -> ChatSessionMessageListResponse:
        chat_session = self._chat_store.find_chat_session_by_id(chat_session_id)
        if chat_session is None:
            raise ChatSessionNotFoundError(chat_session_id)

        message_list = self._chat_store.list_chat_message_by_session_id(chat_session_id)
        return ChatSessionMessageListResponse(
            chat_session_id=chat_session_id,
            message_list=[
                self._build_chat_message(chat_message) for chat_message in message_list
            ],
        )

    async def create_chat_message(
        self,
        chat_session_id: str,
        user_message_text: str,
        ai_model_provider: AiModelProvider | None,
    ) -> ChatSessionMessageCreateResponse:
        chat_session = self._chat_store.find_chat_session_by_id(chat_session_id)
        if chat_session is None:
            raise ChatSessionNotFoundError(chat_session_id)

        character = find_character_profile_by_id(chat_session.character_id)
        if character is None:
            raise ValueError(f"Character not found: {chat_session.character_id}")

        user_message = self._chat_store.append_chat_message(
            chat_session_id=chat_session_id,
            role="user",
            message_text=user_message_text,
        )

        current_message_list = self._chat_store.list_chat_message_by_session_id(
            chat_session_id
        )
        history_turn_list = [
            ChatHistoryTurn(
                role=message.role,
                message_text=message.message_text,
            )
            for message in current_message_list
        ]

        selected_ai_model_provider = ai_model_provider or chat_session.ai_model_provider
        self._chat_store.update_chat_session_ai_model_provider(
            chat_session_id=chat_session_id,
            ai_model_provider=selected_ai_model_provider,
        )
        assistant_reply_text = await self._ai_reply_service.generate_character_reply(
            character_name=character.character_name,
            character_description=character.character_description,
            character_prompt=character.character_prompt,
            chat_history=history_turn_list,
            ai_model_provider=selected_ai_model_provider,
        )
        assistant_message = self._chat_store.append_chat_message(
            chat_session_id=chat_session_id,
            role="assistant",
            message_text=assistant_reply_text,
        )

        return ChatSessionMessageCreateResponse(
            chat_session_id=chat_session_id,
            user_message=self._build_chat_message(user_message),
            assistant_message=self._build_chat_message(assistant_message),
        )

    def _build_chat_session_summary(
        self,
        chat_session: StoredChatSession,
    ) -> ChatSessionSummary:
        return ChatSessionSummary(
            chat_session_id=chat_session.chat_session_id,
            character_id=chat_session.character_id,
            guest_id=chat_session.guest_id,
            ai_model_provider=chat_session.ai_model_provider,
            created_at=chat_session.created_at,
        )

    def _build_chat_message(
        self,
        chat_message: StoredChatMessage,
    ) -> ChatMessage:
        return ChatMessage(
            message_id=chat_message.message_id,
            role=chat_message.role,
            message_text=chat_message.message_text,
            created_at=chat_message.created_at,
        )
