from app.core.app_settings import AppSettings
from app.modules.ai.ai_model_registry import find_selectable_ai_model_definition_by_id
from app.modules.ai.ai_prompt_builder import AiPromptBuilder
from app.modules.ai.ai_prompt_profile import CharacterPromptProfile, ChatHistoryTurn
from app.modules.ai.ai_reply_client import AiReplyClient
from app.modules.ai.ai_reply_cleaner import AiReplyCleaner
from app.modules.ai.ai_reply_fallback import AiReplyFallback
from app.modules.ai.ai_reply_result import AiReplyResult
from app.modules.ai.gemini_reply_client import GeminiReplyClient
from app.modules.ai.local_ai_reply_client import LocalAiReplyClient
from app.modules.ai.openai_reply_client import OpenAiReplyClient
from app.modules.chat.chat_schema import AiModelId, AiModelProvider


class AiReplyService:
    def __init__(self, app_settings: AppSettings) -> None:
        ai_reply_cleaner = AiReplyCleaner()
        ai_prompt_builder = AiPromptBuilder(ai_reply_cleaner=ai_reply_cleaner)

        self._ai_reply_cleaner = ai_reply_cleaner
        self._app_settings = app_settings
        self._ai_reply_fallback = AiReplyFallback()
        # provider가 달라도 아래부터는 공통 인터페이스인 request_reply만 호출합니다.
        self._ai_reply_client_by_provider: dict[AiModelProvider, AiReplyClient] = {
            "openai": OpenAiReplyClient(app_settings=app_settings, ai_prompt_builder=ai_prompt_builder, ai_reply_cleaner=ai_reply_cleaner),
            "gemini": GeminiReplyClient(app_settings=app_settings, ai_prompt_builder=ai_prompt_builder, ai_reply_cleaner=ai_reply_cleaner),
            "local_ai": LocalAiReplyClient(app_settings=app_settings, ai_prompt_builder=ai_prompt_builder, ai_reply_cleaner=ai_reply_cleaner),
        }

    async def generate_character_reply(
        self,
        character_prompt_profile: CharacterPromptProfile,
        chat_history: list[ChatHistoryTurn],
        ai_model_id: AiModelId,
    ) -> AiReplyResult:
        last_user_message = self._ai_reply_fallback.find_last_user_message(chat_history)
        ai_reply_result = await self._request_selected_ai_reply(character_prompt_profile=character_prompt_profile, chat_history=chat_history, ai_model_id=ai_model_id)

        if ai_reply_result:
            if self._ai_reply_cleaner.is_same_as_user_message(reply_text=ai_reply_result.reply_text, last_user_message=last_user_message):
                return AiReplyResult(reply_text=self._ai_reply_fallback.create_echo_guard_reply(character_prompt_profile.character_name))
            return ai_reply_result

        return AiReplyResult(reply_text=self._ai_reply_fallback.create_fallback_reply(character_prompt_profile=character_prompt_profile, chat_history=chat_history))

    async def _request_selected_ai_reply(
        self,
        character_prompt_profile: CharacterPromptProfile,
        chat_history: list[ChatHistoryTurn],
        ai_model_id: AiModelId,
    ) -> AiReplyResult | None:
        ai_model_definition = find_selectable_ai_model_definition_by_id(ai_model_id=ai_model_id, app_settings=self._app_settings)
        if ai_model_definition is None:
            return None

        ai_reply_client = self._ai_reply_client_by_provider.get(ai_model_definition.ai_model_provider)
        if ai_reply_client is None:
            return None

        return await ai_reply_client.request_reply(character_prompt_profile=character_prompt_profile, chat_history=chat_history, model_name=ai_model_definition.ai_model_name)
