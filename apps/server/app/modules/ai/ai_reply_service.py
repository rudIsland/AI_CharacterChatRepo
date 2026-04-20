from dataclasses import dataclass
import re

import httpx

from app.core.app_settings import AppSettings
from app.modules.chat.chat_schema import AiModelProvider


@dataclass(frozen=True)
class ChatHistoryTurn:
    role: str
    message_text: str


class AiReplyService:
    def __init__(self, app_settings: AppSettings) -> None:
        self._app_settings = app_settings

    async def generate_character_reply(
        self,
        character_name: str,
        character_description: str,
        character_prompt: str,
        chat_history: list[ChatHistoryTurn],
        ai_model_provider: AiModelProvider,
    ) -> str:
        last_user_message = self._find_last_user_message(chat_history)
        provider_reply_text = await self._request_provider_reply(
            character_name=character_name,
            character_description=character_description,
            character_prompt=character_prompt,
            chat_history=chat_history,
            ai_model_provider=ai_model_provider,
        )

        if provider_reply_text:
            if self._is_echo_reply(provider_reply_text, last_user_message):
                return self._create_echo_guard_reply(character_name)
            return provider_reply_text

        if ai_model_provider == "local_ai":
            return self._create_local_ai_error_reply()

        return self._create_fallback_reply(
            character_name=character_name,
            chat_history=chat_history,
        )

    async def _request_provider_reply(
        self,
        character_name: str,
        character_description: str,
        character_prompt: str,
        chat_history: list[ChatHistoryTurn],
        ai_model_provider: AiModelProvider,
    ) -> str | None:
        if ai_model_provider == "gemini":
            return await self._request_gemini_reply(
                character_name=character_name,
                character_description=character_description,
                character_prompt=character_prompt,
                chat_history=chat_history,
            )

        if ai_model_provider == "local_ai":
            return await self._request_local_ai_reply(
                character_name=character_name,
                character_description=character_description,
                character_prompt=character_prompt,
                chat_history=chat_history,
            )

        return await self._request_openai_reply(
            character_name=character_name,
            character_description=character_description,
            character_prompt=character_prompt,
            chat_history=chat_history,
        )

    async def _request_openai_reply(
        self,
        character_name: str,
        character_description: str,
        character_prompt: str,
        chat_history: list[ChatHistoryTurn],
    ) -> str | None:
        if not self._app_settings.openai_api_key:
            return None

        request_messages = self._build_openai_message_list(
            character_name=character_name,
            character_description=character_description,
            character_prompt=character_prompt,
            chat_history=chat_history,
        )
        request_payload = {
            "model": self._app_settings.openai_model_name,
            "messages": request_messages,
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

        response_data = response.json()
        choice_list = response_data.get("choices", [])
        if not choice_list:
            return None

        first_choice = choice_list[0]
        message_data = first_choice.get("message", {})
        message_content = message_data.get("content")
        if not isinstance(message_content, str):
            return None

        return self._normalize_reply_text(message_content)

    async def _request_gemini_reply(
        self,
        character_name: str,
        character_description: str,
        character_prompt: str,
        chat_history: list[ChatHistoryTurn],
    ) -> str | None:
        if not self._app_settings.gemini_api_key:
            return None

        request_url = (
            f"{self._app_settings.gemini_api_base_url}"
            f"/models/{self._app_settings.gemini_model_name}:generateContent"
            f"?key={self._app_settings.gemini_api_key}"
        )
        system_prompt = self._build_system_prompt(
            character_name=character_name,
            character_description=character_description,
            character_prompt=character_prompt,
        )
        request_content_list = self._build_gemini_content_list(chat_history)
        request_payload = {
            "systemInstruction": {
                "parts": [{"text": system_prompt}],
            },
            "contents": request_content_list,
            "generationConfig": {"temperature": 0.7},
        }
        try:
            async with httpx.AsyncClient(timeout=30) as http_client:
                response = await http_client.post(request_url, json=request_payload)
                response.raise_for_status()
        except Exception:
            return None

        response_data = response.json()
        candidate_list = response_data.get("candidates", [])
        if not candidate_list:
            return None

        first_candidate = candidate_list[0]
        content_data = first_candidate.get("content", {})
        part_list = content_data.get("parts", [])
        if not part_list:
            return None

        first_part = part_list[0]
        message_text = first_part.get("text")
        if not isinstance(message_text, str):
            return None

        return self._normalize_reply_text(message_text)

    async def _request_local_ai_reply(
        self,
        character_name: str,
        character_description: str,
        character_prompt: str,
        chat_history: list[ChatHistoryTurn],
    ) -> str | None:
        full_request_messages = self._build_openai_message_list(
            character_name=character_name,
            character_description=character_description,
            character_prompt=character_prompt,
            chat_history=chat_history,
        )
        request_messages = self._limit_message_list_for_local_ai(
            message_list=full_request_messages,
            history_message_limit=self._app_settings.local_ai_history_message_limit,
        )

        openai_compatible_reply = await self._request_openai_compatible_local_ai_reply(
            request_messages=request_messages,
        )
        if openai_compatible_reply:
            return openai_compatible_reply

        return await self._request_ollama_local_ai_reply(
            request_messages=request_messages
        )

    async def _request_openai_compatible_local_ai_reply(
        self,
        request_messages: list[dict[str, str]],
    ) -> str | None:
        request_payload = {
            "model": self._app_settings.local_ai_model_name,
            "messages": request_messages,
            "temperature": 0.7,
            "max_tokens": self._app_settings.local_ai_max_tokens,
            "think": False,
        }
        request_headers = {"Content-Type": "application/json"}
        if self._app_settings.local_ai_api_key:
            request_headers["Authorization"] = (
                f"Bearer {self._app_settings.local_ai_api_key}"
            )

        request_url = f"{self._app_settings.local_ai_api_base_url}/chat/completions"
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

        response_data = response.json()
        choice_list = response_data.get("choices", [])
        if not choice_list:
            return None

        first_choice = choice_list[0]
        message_data = first_choice.get("message", {})
        message_content = message_data.get("content")
        if not isinstance(message_content, str):
            return None

        return self._normalize_reply_text(message_content)

    async def _request_ollama_local_ai_reply(
        self,
        request_messages: list[dict[str, str]],
    ) -> str | None:
        local_ai_base_url = self._app_settings.local_ai_api_base_url.rstrip("/")
        if local_ai_base_url.endswith("/v1"):
            local_ai_base_url = local_ai_base_url[: -len("/v1")]

        request_url = f"{local_ai_base_url}/api/chat"
        request_payload = {
            "model": self._app_settings.local_ai_model_name,
            "messages": request_messages,
            "stream": False,
            "think": False,
            "options": {
                "temperature": 0.7,
                "num_predict": self._app_settings.local_ai_max_tokens,
                "num_ctx": self._app_settings.local_ai_num_ctx,
            },
        }
        request_headers = {"Content-Type": "application/json"}
        if self._app_settings.local_ai_api_key:
            request_headers["Authorization"] = (
                f"Bearer {self._app_settings.local_ai_api_key}"
            )

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

        response_data = response.json()
        message_data = response_data.get("message", {})
        message_content = message_data.get("content")
        if not isinstance(message_content, str):
            return None

        return self._normalize_reply_text(message_content)

    def _build_openai_message_list(
        self,
        character_name: str,
        character_description: str,
        character_prompt: str,
        chat_history: list[ChatHistoryTurn],
    ) -> list[dict[str, str]]:
        system_prompt = self._build_system_prompt(
            character_name=character_name,
            character_description=character_description,
            character_prompt=character_prompt,
        )
        message_list: list[dict[str, str]] = [
            {"role": "system", "content": system_prompt}
        ]

        for chat_turn in chat_history:
            if chat_turn.role == "user":
                user_message_text = chat_turn.message_text.strip()
                if user_message_text:
                    message_list.append({"role": "user", "content": user_message_text})
                continue

            if chat_turn.role == "assistant":
                clean_assistant_message_text = self._normalize_reply_text(
                    chat_turn.message_text
                )
                if clean_assistant_message_text:
                    message_list.append(
                        {
                            "role": "assistant",
                            "content": clean_assistant_message_text,
                        }
                    )

        return message_list

    def _limit_message_list_for_local_ai(
        self,
        message_list: list[dict[str, str]],
        history_message_limit: int,
    ) -> list[dict[str, str]]:
        if history_message_limit <= 0:
            return message_list[:1]

        if len(message_list) <= 1:
            return message_list

        system_message = message_list[0]
        history_message_list = message_list[1:]
        limited_history_message_list = history_message_list[-history_message_limit:]
        return [system_message, *limited_history_message_list]

    def _build_system_prompt(
        self,
        character_name: str,
        character_description: str,
        character_prompt: str,
    ) -> str:
        return (
            f"You are {character_name}. "
            f"Character description: {character_description}\n"
            f"Role-play rules: {character_prompt}\n"
            "You must reply in Korean by default.\n"
            "Only use another language when the user explicitly requests it.\n"
            "Do not mix Korean and English in one sentence unless the user asks for translation.\n"
            "Use natural Korean sentences, not romanized Korean.\n"
            "Output only the final assistant message.\n"
            "Do not output analysis notes or chain-of-thought.\n"
            "Never include commands like /no_think or tags like <think>.\n"
            "Do not repeat the user message verbatim.\n"
            "Keep your reply natural, warm, and under 5 sentences."
        )

    def _build_gemini_content_list(
        self,
        chat_history: list[ChatHistoryTurn],
    ) -> list[dict[str, object]]:
        content_list: list[dict[str, object]] = []
        for chat_turn in chat_history:
            if chat_turn.role == "user":
                gemini_role = "user"
                message_text = chat_turn.message_text.strip()
            elif chat_turn.role == "assistant":
                gemini_role = "model"
                message_text = self._normalize_reply_text(chat_turn.message_text) or ""
            else:
                continue

            if not message_text:
                continue

            content_list.append(
                {
                    "role": gemini_role,
                    "parts": [{"text": message_text}],
                }
            )

        if not content_list:
            content_list.append({"role": "user", "parts": [{"text": "Hello"}]})

        return content_list

    def _normalize_reply_text(self, reply_text: str) -> str | None:
        normalized_text = reply_text.strip()
        if not normalized_text:
            return None

        normalized_text = re.sub(
            pattern=r"<think>.*?</think>",
            repl="",
            string=normalized_text,
            flags=re.IGNORECASE | re.DOTALL,
        ).strip()
        if not normalized_text:
            return None

        line_list = [
            line.strip()
            for line in normalized_text.replace("\r\n", "\n").split("\n")
            if line.strip()
        ]
        filtered_line_list = [
            line_text
            for line_text in line_list
            if not self._contains_reasoning_marker(line_text)
        ]
        normalized_text = " ".join(filtered_line_list).strip()
        if not normalized_text:
            return None

        if self._contains_reasoning_marker(normalized_text):
            return None

        return normalized_text

    def _contains_reasoning_marker(self, text_value: str) -> bool:
        lower_text_value = text_value.lower()
        reasoning_marker_list = [
            "/no_think",
            "<think>",
            "okay, the user",
            "the user said",
            "the user asked",
            "the user greeted",
            "which translates to",
            "let me think",
            "i need to",
            "i should",
            "my role is",
            "first, i'll",
            "first i will",
            "i'll answer",
            "internal reasoning",
            "analysis:",
            "사용자가",
            "번역하면",
        ]
        return any(marker in lower_text_value for marker in reasoning_marker_list)

    def _find_last_user_message(self, chat_history: list[ChatHistoryTurn]) -> str:
        for chat_turn in reversed(chat_history):
            if chat_turn.role != "user":
                continue
            return chat_turn.message_text.strip()
        return ""

    def _normalize_for_echo_compare(self, text_value: str) -> str:
        return re.sub(r"[^0-9a-z\uAC00-\uD7A3]+", "", text_value.casefold())

    def _is_echo_reply(self, reply_text: str, last_user_message: str) -> bool:
        if not last_user_message:
            return False

        normalized_reply = self._normalize_for_echo_compare(reply_text)
        normalized_user_message = self._normalize_for_echo_compare(last_user_message)
        if not normalized_reply or not normalized_user_message:
            return False

        return normalized_reply == normalized_user_message

    def _create_echo_guard_reply(self, character_name: str) -> str:
        return (
            f"{character_name}: 방금 답변이 반복돼서 다시 말할게요. "
            f"제 이름은 {character_name}예요. 편하게 이어서 물어봐 주세요."
        )

    def _create_fallback_reply(
        self,
        character_name: str,
        chat_history: list[ChatHistoryTurn],
    ) -> str:
        last_user_message = self._find_last_user_message(chat_history)
        if not last_user_message:
            return f"{character_name}: 만나서 반가워요. 오늘은 어떤 이야기를 해볼까요?"

        return (
            f"{character_name}: '{last_user_message}'라고 말해줘서 고마워요. "
            "조금만 더 이야기해 주면 자연스럽게 이어서 답할게요."
        )

    def _create_local_ai_error_reply(self) -> str:
        return (
            "Local AI 응답에 실패했어요. "
            f"현재 LOCAL_AI_MODEL_NAME은 '{self._app_settings.local_ai_model_name}' 입니다. "
            "`ollama list`로 설치된 모델명을 확인하고 .env 값을 맞춰주세요."
        )
