from app.core.app_settings import AppSettings
from app.modules.ai.ai_prompt_builder import AiPromptBuilder
from app.modules.ai.ai_prompt_profile import CharacterPromptProfile, ChatHistoryTurn
from app.modules.ai.ai_reply_cleaner import AiReplyCleaner
from app.modules.ai.ai_reply_fallback import AiReplyFallback
from app.modules.ai.ai_reply_result import AiReplyResult
from app.modules.ai.gemini_reply_client import GeminiReplyClient
from app.modules.ai.local_ai_reply_client import LocalAiReplyClient
from app.modules.ai.openai_reply_client import OpenAiReplyClient
from app.modules.chat.chat_schema import AiModelProvider


class AiReplyService:
    def __init__(self, app_settings: AppSettings) -> None:
        ai_reply_cleaner = AiReplyCleaner()
        ai_prompt_builder = AiPromptBuilder(ai_reply_cleaner=ai_reply_cleaner)

        self._ai_reply_cleaner = ai_reply_cleaner
        self._ai_reply_fallback = AiReplyFallback()
        self._openai_reply_client = OpenAiReplyClient(
            app_settings=app_settings,
            ai_prompt_builder=ai_prompt_builder,
            ai_reply_cleaner=ai_reply_cleaner,
        )
        self._gemini_reply_client = GeminiReplyClient(
            app_settings=app_settings,
            ai_prompt_builder=ai_prompt_builder,
            ai_reply_cleaner=ai_reply_cleaner,
        )
        self._local_ai_reply_client = LocalAiReplyClient(
            app_settings=app_settings,
            ai_prompt_builder=ai_prompt_builder,
            ai_reply_cleaner=ai_reply_cleaner,
        )

    async def generate_character_reply(
        self,
        character_prompt_profile: CharacterPromptProfile,
        chat_history: list[ChatHistoryTurn],
        ai_model_provider: AiModelProvider,
    ) -> AiReplyResult:
        last_user_message = self._ai_reply_fallback.find_last_user_message(
            chat_history
        )
        ai_reply_result = await self._request_selected_ai_reply(
            character_prompt_profile=character_prompt_profile,
            chat_history=chat_history,
            ai_model_provider=ai_model_provider,
        )

        if ai_reply_result:
            if self._ai_reply_cleaner.is_same_as_user_message(
                reply_text=ai_reply_result.reply_text,
                last_user_message=last_user_message,
            ):
                return AiReplyResult(
                    reply_text=self._ai_reply_fallback.create_echo_guard_reply(
                        character_prompt_profile.character_name
                    )
                )
            return ai_reply_result

        return AiReplyResult(
            reply_text=self._ai_reply_fallback.create_fallback_reply(
                character_name=character_prompt_profile.character_name,
                chat_history=chat_history,
            )
        )

    async def _request_selected_ai_reply(
        self,
        character_prompt_profile: CharacterPromptProfile,
        chat_history: list[ChatHistoryTurn],
        ai_model_provider: AiModelProvider,
    ) -> AiReplyResult | None:
        if ai_model_provider == "gemini":
            return await self._gemini_reply_client.request_reply(
                character_prompt_profile=character_prompt_profile,
                chat_history=chat_history,
            )

        if ai_model_provider == "local_ai":
            return await self._local_ai_reply_client.request_reply(
                character_prompt_profile=character_prompt_profile,
                chat_history=chat_history,
            )

        return await self._openai_reply_client.request_reply(
            character_prompt_profile=character_prompt_profile,
            chat_history=chat_history,
        )
