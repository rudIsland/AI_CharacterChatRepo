from app.core.app_settings import AppSettings
from app.modules.ai.ai_http_client import post_json_or_none
from app.modules.ai.ai_prompt_builder import AiPromptBuilder
from app.modules.ai.ai_prompt_profile import CharacterPromptProfile, ChatHistoryTurn
from app.modules.ai.ai_reply_cleaner import AiReplyCleaner
from app.modules.ai.ai_reply_result import AiReplyResult, AiTokenUsage
from app.modules.ai.ai_token_usage_reader import (
    build_ai_token_usage,
    create_ai_token_usage,
    read_ai_token_count,
)


class LocalAiReplyClient:
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
        # 로컬 AI는 Ollama 형식을 먼저 시도하고 실패하면 OpenAI 호환 형식으로 재시도합니다.
        full_message_list = self._ai_prompt_builder.build_local_ai_message_list(character_prompt_profile=character_prompt_profile, chat_history=chat_history)
        limited_message_list = self._ai_prompt_builder.build_limited_message_list(ai_request_message_list=full_message_list, history_message_limit=self._app_settings.local_ai_history_message_limit)

        local_ai_reply_result = await self._request_ollama_chat_reply(ai_request_message_list=limited_message_list, model_name=model_name)
        if local_ai_reply_result:
            return local_ai_reply_result

        return await self._request_openai_style_reply(ai_request_message_list=limited_message_list, model_name=model_name)

    async def _request_openai_style_reply(self, ai_request_message_list: list[dict[str, str]], model_name: str) -> AiReplyResult | None:
        request_payload = {
            "model": model_name,
            "messages": ai_request_message_list,
            "temperature": 0.45,
            "max_tokens": self._app_settings.local_ai_max_tokens,
            "think": False,
        }
        request_url = f"{self._app_settings.local_ai_api_base_url}/chat/completions"
        response_body = await post_json_or_none(
            request_name="local_ai_openai_style_reply",
            request_url=request_url,
            request_payload=request_payload,
            request_headers=self._build_local_ai_request_headers(),
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

    async def _request_ollama_chat_reply(self, ai_request_message_list: list[dict[str, str]], model_name: str) -> AiReplyResult | None:
        request_payload = {
            "model": model_name,
            "messages": ai_request_message_list,
            "stream": False,
            "think": False,
            "options": {
                "temperature": 0.45,
                "top_p": 0.85,
                "repeat_penalty": 1.15,
                "num_predict": self._app_settings.local_ai_max_tokens,
                "num_ctx": self._app_settings.local_ai_num_ctx,
            },
        }
        request_url = f"{self._build_ollama_base_url()}/api/chat"
        response_body = await post_json_or_none(
            request_name="local_ai_ollama_reply",
            request_url=request_url,
            request_payload=request_payload,
            request_headers=self._build_local_ai_request_headers(),
        )
        if response_body is None:
            return None

        response_text = response_body.get("message", {}).get("content")
        if not isinstance(response_text, str):
            return None

        clean_response_text = self._ai_reply_cleaner.clean_reply_text(response_text)
        if not clean_response_text:
            return None

        return AiReplyResult(reply_text=clean_response_text, token_usage=self._build_ollama_token_usage(response_body))

    def _build_ollama_base_url(self) -> str:
        local_ai_server_url = self._app_settings.local_ai_api_base_url.rstrip("/")
        if local_ai_server_url.endswith("/v1"):
            return local_ai_server_url[: -len("/v1")]
        return local_ai_server_url

    def _build_local_ai_request_headers(self) -> dict[str, str]:
        request_headers = {"Content-Type": "application/json"}
        if self._app_settings.local_ai_api_key:
            request_headers["Authorization"] = f"Bearer {self._app_settings.local_ai_api_key}"
        return request_headers

    def _build_ollama_token_usage(self, response_body: dict[str, object]) -> AiTokenUsage | None:
        input_token_count = read_ai_token_count(response_body, ["prompt_eval_count"])
        output_token_count = read_ai_token_count(response_body, ["eval_count"])
        total_token_count = None
        if input_token_count is not None and output_token_count is not None:
            total_token_count = input_token_count + output_token_count

        return create_ai_token_usage(input_token_count=input_token_count, output_token_count=output_token_count, total_token_count=total_token_count)
