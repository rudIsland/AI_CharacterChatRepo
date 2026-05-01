from app.core.app_settings import AppSettings
from app.modules.ai.ai_http_client import post_json_or_none
from app.modules.ai.ai_prompt_builder import AiPromptBuilder
from app.modules.ai.ai_prompt_profile import CharacterPromptProfile, ChatHistoryTurn
from app.modules.ai.ai_reply_cleaner import AiReplyCleaner
from app.modules.ai.ai_reply_result import AiReplyResult
from app.modules.ai.ai_token_usage_reader import build_ai_token_usage


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
        model_name: str,
    ) -> AiReplyResult | None:
        # Gemini 전용 요청/응답 구조는 이 클라이언트 안에서만 처리합니다.
        if not self._app_settings.gemini_api_key:
            return None

        request_url = (
            f"{self._app_settings.gemini_api_base_url}"
            f"/models/{model_name}:generateContent"
            f"?key={self._app_settings.gemini_api_key}"
        )
        request_payload = {
            "systemInstruction": {
                "parts": [
                    {
                        "text": self._ai_prompt_builder.build_system_prompt(character_prompt_profile)
                    }
                ],
            },
            "contents": self._ai_prompt_builder.build_gemini_content_list(character_prompt_profile=character_prompt_profile, chat_history=chat_history),
            "generationConfig": {"temperature": 0.7},
        }
        response_body = await post_json_or_none(request_name="gemini_reply", request_url=request_url, request_payload=request_payload)
        if response_body is None:
            return None

        response_candidate_list = response_body.get("candidates", [])
        if not response_candidate_list:
            return None

        response_part_list = response_candidate_list[0].get("content", {}).get("parts", [])
        if not response_part_list:
            return None

        response_text = response_part_list[0].get("text")
        if not isinstance(response_text, str):
            return None

        clean_response_text = self._ai_reply_cleaner.clean_reply_text(response_text)
        if not clean_response_text:
            return None

        token_usage = build_ai_token_usage(
            usage_body=response_body.get("usageMetadata"),
            input_field_name_list=["promptTokenCount"],
            output_field_name_list=["candidatesTokenCount"],
            total_field_name_list=["totalTokenCount"],
        )
        return AiReplyResult(reply_text=clean_response_text, token_usage=token_usage)
