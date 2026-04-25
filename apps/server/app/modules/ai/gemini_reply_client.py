import httpx

from app.core.app_settings import AppSettings
from app.modules.ai.ai_prompt_builder import AiPromptBuilder
from app.modules.ai.ai_prompt_profile import CharacterPromptProfile, ChatHistoryTurn
from app.modules.ai.ai_reply_cleaner import AiReplyCleaner
from app.modules.ai.ai_reply_result import AiReplyResult, AiTokenUsage


class GeminiReplyClient:
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
        if not self._app_settings.gemini_api_key:
            return None

        request_url = (
            f"{self._app_settings.gemini_api_base_url}"
            f"/models/{self._app_settings.gemini_model_name}:generateContent"
            f"?key={self._app_settings.gemini_api_key}"
        )
        request_payload = {
            "systemInstruction": {
                "parts": [
                    {
                        "text": self._ai_prompt_builder.build_system_prompt(
                            character_prompt_profile
                        )
                    }
                ],
            },
            "contents": self._ai_prompt_builder.build_gemini_content_list(
                chat_history
            ),
            "generationConfig": {"temperature": 0.7},
        }

        try:
            async with httpx.AsyncClient(timeout=30) as http_client:
                response = await http_client.post(request_url, json=request_payload)
                response.raise_for_status()
        except Exception:
            return None

        response_body = response.json()
        response_candidate_list = response_body.get("candidates", [])
        if not response_candidate_list:
            return None

        response_part_list = response_candidate_list[0].get("content", {}).get(
            "parts", []
        )
        if not response_part_list:
            return None

        response_text = response_part_list[0].get("text")
        if not isinstance(response_text, str):
            return None

        clean_response_text = self._ai_reply_cleaner.clean_reply_text(response_text)
        if not clean_response_text:
            return None

        return AiReplyResult(
            reply_text=clean_response_text,
            token_usage=self._build_token_usage(response_body.get("usageMetadata")),
        )

    def _build_token_usage(self, usage_body: object) -> AiTokenUsage | None:
        if not isinstance(usage_body, dict):
            return None

        input_token_count = self._read_token_count(usage_body, "promptTokenCount")
        output_token_count = self._read_token_count(usage_body, "candidatesTokenCount")
        total_token_count = self._read_token_count(usage_body, "totalTokenCount")

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
        field_name: str,
    ) -> int | None:
        field_value = usage_body.get(field_name)
        if isinstance(field_value, int):
            return field_value
        return None
