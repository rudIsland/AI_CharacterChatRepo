import httpx

from app.core.app_settings import AppSettings
from app.modules.ai.ai_prompt_builder import AiPromptBuilder
from app.modules.ai.ai_prompt_profile import CharacterPromptProfile, ChatHistoryTurn
from app.modules.ai.ai_reply_cleaner import AiReplyCleaner
from app.modules.ai.ai_reply_result import AiReplyResult, AiTokenUsage


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
    ) -> AiReplyResult | None:
        full_message_list = self._ai_prompt_builder.build_local_ai_message_list(
            character_prompt_profile=character_prompt_profile,
            chat_history=chat_history,
        )
        limited_message_list = self._ai_prompt_builder.build_limited_message_list(
            ai_request_message_list=full_message_list,
            history_message_limit=self._app_settings.local_ai_history_message_limit,
        )

        local_ai_reply_result = await self._request_ollama_chat_reply(
            ai_request_message_list=limited_message_list
        )
        if local_ai_reply_result:
            return local_ai_reply_result

        return await self._request_openai_style_reply(
            ai_request_message_list=limited_message_list,
        )

    async def _request_openai_style_reply(
        self,
        ai_request_message_list: list[dict[str, str]],
    ) -> AiReplyResult | None:
        request_payload = {
            "model": self._app_settings.local_ai_model_name,
            "messages": ai_request_message_list,
            "temperature": 0.45,
            "max_tokens": self._app_settings.local_ai_max_tokens,
            "think": False,
        }
        request_url = f"{self._app_settings.local_ai_api_base_url}/chat/completions"

        try:
            async with httpx.AsyncClient(timeout=30) as http_client:
                response = await http_client.post(
                    request_url,
                    headers=self._build_local_ai_request_headers(),
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
            token_usage=self._build_openai_style_token_usage(response_body.get("usage")),
        )

    async def _request_ollama_chat_reply(
        self,
        ai_request_message_list: list[dict[str, str]],
    ) -> AiReplyResult | None:
        request_payload = {
            "model": self._app_settings.local_ai_model_name,
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

        try:
            async with httpx.AsyncClient(timeout=30) as http_client:
                response = await http_client.post(
                    request_url,
                    headers=self._build_local_ai_request_headers(),
                    json=request_payload,
                )
                response.raise_for_status()
        except Exception:
            return None

        response_body = response.json()
        response_text = response_body.get("message", {}).get("content")
        if not isinstance(response_text, str):
            return None

        clean_response_text = self._ai_reply_cleaner.clean_reply_text(response_text)
        if not clean_response_text:
            return None

        return AiReplyResult(
            reply_text=clean_response_text,
            token_usage=self._build_ollama_token_usage(response_body),
        )

    def _build_ollama_base_url(self) -> str:
        local_ai_server_url = self._app_settings.local_ai_api_base_url.rstrip("/")
        if local_ai_server_url.endswith("/v1"):
            return local_ai_server_url[: -len("/v1")]
        return local_ai_server_url

    def _build_local_ai_request_headers(self) -> dict[str, str]:
        request_headers = {"Content-Type": "application/json"}
        if self._app_settings.local_ai_api_key:
            request_headers["Authorization"] = (
                f"Bearer {self._app_settings.local_ai_api_key}"
            )
        return request_headers

    def _build_openai_style_token_usage(self, usage_body: object) -> AiTokenUsage | None:
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

        return self._create_token_usage(
            input_token_count=input_token_count,
            output_token_count=output_token_count,
            total_token_count=total_token_count,
        )

    def _build_ollama_token_usage(
        self,
        response_body: dict[str, object],
    ) -> AiTokenUsage | None:
        input_token_count = self._read_token_count(response_body, ["prompt_eval_count"])
        output_token_count = self._read_token_count(response_body, ["eval_count"])
        total_token_count = None
        if input_token_count is not None and output_token_count is not None:
            total_token_count = input_token_count + output_token_count

        return self._create_token_usage(
            input_token_count=input_token_count,
            output_token_count=output_token_count,
            total_token_count=total_token_count,
        )

    def _create_token_usage(
        self,
        input_token_count: int | None,
        output_token_count: int | None,
        total_token_count: int | None,
    ) -> AiTokenUsage | None:
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
        response_body: dict[str, object],
        field_name_list: list[str],
    ) -> int | None:
        for field_name in field_name_list:
            field_value = response_body.get(field_name)
            if isinstance(field_value, int):
                return field_value
        return None
