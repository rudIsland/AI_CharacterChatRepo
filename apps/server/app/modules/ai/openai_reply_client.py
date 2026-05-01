from app.core.app_settings import AppSettings
from app.modules.ai.ai_http_client import post_json_or_none
from app.modules.ai.ai_prompt_builder import AiPromptBuilder
from app.modules.ai.ai_prompt_profile import CharacterPromptProfile, ChatHistoryTurn
from app.modules.ai.ai_reply_cleaner import AiReplyCleaner
from app.modules.ai.ai_reply_result import AiReplyResult
from app.modules.ai.ai_token_usage_reader import build_ai_token_usage


class OpenAiReplyClient:
    def __init__(
        self,
        app_settings: AppSettings,
        ai_prompt_builder: AiPromptBuilder,
        ai_reply_cleaner: AiReplyCleaner,
    ) -> None:
        self._app_settings = app_settings
        self._ai_prompt_builder = ai_prompt_builder
        self._ai_reply_cleaner = ai_reply_cleaner

    async def request_reply(
        self,
        character_prompt_profile: CharacterPromptProfile,
        chat_history: list[ChatHistoryTurn],
        model_name: str,
    ) -> AiReplyResult | None:
        # OpenAI 호환 Chat Completions 형식으로 답변을 요청합니다.
        if not self._app_settings.openai_api_key:
            return None

        request_payload: dict[str, object] = {
            "model": model_name,
            "messages": self._ai_prompt_builder.build_openai_message_list(character_prompt_profile=character_prompt_profile, chat_history=chat_history),
        }
        if not model_name.startswith("gpt-5"):
            request_payload["temperature"] = 0.7
        request_headers = {
            "Authorization": f"Bearer {self._app_settings.openai_api_key}",
            "Content-Type": "application/json",
        }
        request_url = f"{self._app_settings.openai_api_base_url}/chat/completions"
        response_body = await post_json_or_none(
            request_name="openai_reply",
            request_url=request_url,
            request_payload=request_payload,
            request_headers=request_headers,
        )
        if response_body is None:
            return None

        response_choice_list = response_body.get("choices", [])
        if not response_choice_list:
            return None

        response_text = response_choice_list[0].get("message", {}).get("content")
        if not isinstance(response_text, str):
            return None

        clean_response_text = self._ai_reply_cleaner.clean_reply_text(response_text)
        if not clean_response_text:
            return None

        token_usage = build_ai_token_usage(
            usage_body=response_body.get("usage"),
            input_field_name_list=["prompt_tokens", "input_tokens"],
            output_field_name_list=["completion_tokens", "output_tokens"],
            total_field_name_list=["total_tokens"],
        )
        return AiReplyResult(reply_text=clean_response_text, token_usage=token_usage)
