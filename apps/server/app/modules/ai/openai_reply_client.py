import httpx

from app.core.app_settings import AppSettings
from app.modules.ai.ai_prompt_builder import AiPromptBuilder
from app.modules.ai.ai_prompt_profile import CharacterPromptProfile, ChatHistoryTurn
from app.modules.ai.ai_reply_cleaner import AiReplyCleaner
from app.modules.ai.ai_reply_result import AiReplyResult, AiTokenUsage


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
    ) -> AiReplyResult | None:
        if not self._app_settings.openai_api_key:
            return None

        request_payload = {
            "model": self._app_settings.openai_model_name,
            "messages": self._ai_prompt_builder.build_openai_message_list(
                character_prompt_profile=character_prompt_profile,
                chat_history=chat_history,
            ),
            "temperature": 0.7,
        }
        request_headers = {
            "Authorization": f"Bearer {self._app_settings.openai_api_key}",
            "Content-Type": "application/json",
        }
        request_url = f"{self._app_settings.openai_api_base_url}/chat/completions"

        try:
            async with httpx.AsyncClient(timeout=30) as http_client:
                response = await http_client.post(
                    request_url,
                    headers=request_headers,
                    json=request_payload,
                )
                response.raise_for_status()
        except Exception:
            return None

        response_body = response.json()
        response_choice_list = response_body.get("choices", [])
        if not response_choice_list:
            return None

        response_text = response_choice_list[0].get("message", {}).get("content")
        if not isinstance(response_text, str):
            return None

        clean_response_text = self._ai_reply_cleaner.clean_reply_text(response_text)
        if not clean_response_text:
            return None

        return AiReplyResult(
            reply_text=clean_response_text,
            token_usage=self._build_token_usage(response_body.get("usage")),
        )

    def _build_token_usage(self, usage_body: object) -> AiTokenUsage | None:
        if not isinstance(usage_body, dict):
            return None

        input_token_count = self._read_token_count(
            usage_body,
            ["prompt_tokens", "input_tokens"],
        )
        output_token_count = self._read_token_count(
            usage_body,
            ["completion_tokens", "output_tokens"],
        )
        total_token_count = self._read_token_count(usage_body, ["total_tokens"])

        if (
            input_token_count is None
            and output_token_count is None
            and total_token_count is None
        ):
            return None

        return AiTokenUsage(
            input_token_count=input_token_count,
            output_token_count=output_token_count,
            total_token_count=total_token_count,
        )

    def _read_token_count(
        self,
        usage_body: dict[str, object],
        field_name_list: list[str],
    ) -> int | None:
        for field_name in field_name_list:
            field_value = usage_body.get(field_name)
            if isinstance(field_value, int):
                return field_value
        return None
