from app.modules.ai.ai_prompt_profile import CharacterPromptProfile, ChatHistoryTurn
from app.modules.ai.ai_reply_service import AiReplyService
from app.modules.character.character_data import find_character_profile_by_id
from app.modules.chat.chat_schema import (
    AiModelProvider,
    CHAT_SESSION_TOKEN_LIMIT_COUNT,
    ChatMessage,
    ChatSessionMessageCreateResponse,
    ChatSessionMessageListResponse,
    ChatSessionSummary,
)
from app.modules.chat.chat_store import InMemoryChatStore, StoredChatMessage, StoredChatSession


class ChatSessionNotFoundError(Exception):
    pass


class ChatSessionTokenLimitExceededError(Exception):
    pass


class ChatService:
    def __init__(
        self,
        chat_store: InMemoryChatStore,
        ai_reply_service: AiReplyService,
    ) -> None:
        # 채팅 세션과 메시지를 저장하고 조회하는 저장소입니다.
        self._chat_store = chat_store
        # 캐릭터 설정과 대화 이력을 받아 AI 답변을 생성하는 서비스입니다.
        self._ai_reply_service = ai_reply_service

    async def create_chat_session(
        self,
        character_id: str,
        guest_id: str,
        ai_model_provider: AiModelProvider,
    ) -> ChatSessionSummary:
        # 없는 캐릭터로 세션을 만들 수 없도록 먼저 확인합니다.
        character = find_character_profile_by_id(character_id)
        if character is None:
            raise ValueError(f"Character not found: {character_id}")

        # 한 사용자는 캐릭터 하나당 하나의 세션만 사용합니다.
        # 이미 있으면 새로 만들지 않고 기존 세션을 돌려줍니다.
        existing_chat_session = (
            self._chat_store.find_chat_session_by_guest_id_and_character_id(
                guest_id=guest_id,
                character_id=character_id,
            )
        )
        if existing_chat_session is not None:
            self._chat_store.update_chat_session_ai_model_provider(
                chat_session_id=existing_chat_session.chat_session_id,
                ai_model_provider=ai_model_provider,
            )
            return self._build_chat_session_summary(existing_chat_session)

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
        # 세션이 없으면 라우터에서 404로 처리할 수 있게 예외를 던집니다.
        chat_session = self._chat_store.find_chat_session_by_id(chat_session_id)
        if chat_session is None:
            raise ChatSessionNotFoundError(chat_session_id)

        message_list = self._chat_store.list_chat_message_by_session_id(chat_session_id)
        return ChatSessionMessageListResponse(
            chat_session_id=chat_session_id,
            message_list=[
                self._build_chat_message(chat_message) for chat_message in message_list
            ],
            used_token_count=self._calculate_used_token_count(message_list),
            token_limit_count=CHAT_SESSION_TOKEN_LIMIT_COUNT,
        )

    async def create_chat_message(
        self,
        chat_session_id: str,
        user_message_text: str,
        ai_model_provider: AiModelProvider | None,
    ) -> ChatSessionMessageCreateResponse:
        # 메시지는 항상 기존 세션 안에 추가합니다.
        chat_session = self._chat_store.find_chat_session_by_id(chat_session_id)
        if chat_session is None:
            raise ChatSessionNotFoundError(chat_session_id)

        current_used_token_count = self._calculate_used_token_count(
            chat_session.message_list
        )
        if current_used_token_count >= CHAT_SESSION_TOKEN_LIMIT_COUNT:
            raise ChatSessionTokenLimitExceededError(chat_session_id)

        character = find_character_profile_by_id(chat_session.character_id)
        if character is None:
            raise ValueError(f"Character not found: {chat_session.character_id}")

        user_message = self._chat_store.append_chat_message(
            chat_session_id=chat_session_id,
            role="user",
            message_text=user_message_text,
        )

        # 방금 저장한 사용자 메시지까지 포함해서 AI에게 대화 맥락을 보냅니다.
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

        # 요청에서 모델을 바꾸면 세션의 현재 모델도 같이 갱신합니다.
        selected_ai_model_provider = ai_model_provider or chat_session.ai_model_provider
        self._chat_store.update_chat_session_ai_model_provider(
            chat_session_id=chat_session_id,
            ai_model_provider=selected_ai_model_provider,
        )
        character_prompt_profile = CharacterPromptProfile(
            character_name=character.character_name,
            character_description=character.character_description,
            character_gender=character.character_gender,
            character_age_range=character.character_age_range,
            character_background=character.character_background,
            character_personality=character.character_personality,
            character_speaking_style=character.character_speaking_style,
            character_user_relationship=character.character_user_relationship,
            character_response_rule=character.character_response_rule,
            character_prompt_summary=character.character_prompt_summary,
            character_prompt=character.character_prompt,
        )
        assistant_reply_result = await self._ai_reply_service.generate_character_reply(
            character_prompt_profile=character_prompt_profile,
            chat_history=history_turn_list,
            ai_model_provider=selected_ai_model_provider,
        )
        token_usage = assistant_reply_result.token_usage

        # AI 답변도 같은 세션의 메시지로 저장합니다.
        assistant_message = self._chat_store.append_chat_message(
            chat_session_id=chat_session_id,
            role="assistant",
            message_text=assistant_reply_result.reply_text,
            input_token_count=(
                token_usage.input_token_count if token_usage is not None else None
            ),
            output_token_count=(
                token_usage.output_token_count if token_usage is not None else None
            ),
            total_token_count=(
                token_usage.total_token_count if token_usage is not None else None
            ),
        )

        return ChatSessionMessageCreateResponse(
            chat_session_id=chat_session_id,
            user_message=self._build_chat_message(user_message),
            assistant_message=self._build_chat_message(assistant_message),
            used_token_count=self._calculate_used_token_count(
                chat_session.message_list
            ),
            token_limit_count=CHAT_SESSION_TOKEN_LIMIT_COUNT,
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
            input_token_count=chat_message.input_token_count,
            output_token_count=chat_message.output_token_count,
            total_token_count=chat_message.total_token_count,
            created_at=chat_message.created_at,
        )

    def _calculate_used_token_count(
        self,
        message_list: list[StoredChatMessage],
    ) -> int:
        used_token_count = 0
        for message in message_list:
            if message.total_token_count is not None:
                used_token_count += message.total_token_count
                continue

            if message.input_token_count is not None:
                used_token_count += message.input_token_count
            if message.output_token_count is not None:
                used_token_count += message.output_token_count

        return used_token_count
