from app.modules.ai.ai_prompt_profile import CharacterPromptProfile, ChatHistoryTurn
from app.modules.ai.ai_reply_cleaner import AiReplyCleaner

DEFAULT_HISTORY_MESSAGE_LIMIT = 12


class AiPromptBuilder:
    def __init__(self, ai_reply_cleaner: AiReplyCleaner) -> None:
        self._ai_reply_cleaner = ai_reply_cleaner

    def build_openai_message_list(
        self,
        character_prompt_profile: CharacterPromptProfile,
        chat_history: list[ChatHistoryTurn],
    ) -> list[dict[str, str]]:
        system_prompt = self.build_system_prompt(character_prompt_profile)
        full_message_list = self._build_chat_message_list(
            system_prompt=system_prompt,
            chat_history=chat_history,
        )
        return self.build_limited_message_list(
            ai_request_message_list=full_message_list,
            history_message_limit=DEFAULT_HISTORY_MESSAGE_LIMIT,
        )

    def build_local_ai_message_list(
        self,
        character_prompt_profile: CharacterPromptProfile,
        chat_history: list[ChatHistoryTurn],
    ) -> list[dict[str, str]]:
        system_prompt = self.build_local_ai_system_prompt(character_prompt_profile)
        return self._build_chat_message_list(
            system_prompt=system_prompt,
            chat_history=chat_history,
        )

    def build_limited_message_list(
        self,
        ai_request_message_list: list[dict[str, str]],
        history_message_limit: int,
    ) -> list[dict[str, str]]:
        if history_message_limit <= 0:
            return ai_request_message_list[:1]

        if len(ai_request_message_list) <= 1:
            return ai_request_message_list

        system_prompt_message = ai_request_message_list[0]
        chat_history_message_list = ai_request_message_list[1:]
        recent_chat_history_message_list = chat_history_message_list[
            -history_message_limit:
        ]
        return [system_prompt_message, *recent_chat_history_message_list]

    def build_gemini_content_list(
        self,
        chat_history: list[ChatHistoryTurn],
    ) -> list[dict[str, object]]:
        gemini_content_list: list[dict[str, object]] = []
        for chat_turn in chat_history[-DEFAULT_HISTORY_MESSAGE_LIMIT:]:
            if chat_turn.role == "user":
                gemini_role = "user"
                message_text = chat_turn.message_text.strip()
            elif chat_turn.role == "assistant":
                gemini_role = "model"
                message_text = (
                    self._ai_reply_cleaner.clean_reply_text(chat_turn.message_text)
                    or ""
                )
            else:
                continue

            if not message_text:
                continue

            gemini_content_list.append(
                {
                    "role": gemini_role,
                    "parts": [{"text": message_text}],
                }
            )

        if not gemini_content_list:
            gemini_content_list.append({"role": "user", "parts": [{"text": "Hello"}]})

        return gemini_content_list

    def build_system_prompt(
        self,
        character_prompt_profile: CharacterPromptProfile,
    ) -> str:
        return (
            f"Role: {character_prompt_profile.character_prompt_summary}\n"
            f"Character detail: {character_prompt_profile.character_prompt}\n"
            f"Response rule: {character_prompt_profile.character_response_rule}\n"
            "Rules: Korean by default. Stay in character. Reply only as the character.\n"
            "No analysis, system talk, repeated user text, <think>, or /no_think.\n"
            "Casual chat: 1-3 short lines, one idea per line. No lists/headings unless asked.\n"
            "Use another language only when the user asks."
        )

    def build_local_ai_system_prompt(
        self,
        character_prompt_profile: CharacterPromptProfile,
    ) -> str:
        # Local AI가 추론 과정을 말하지 않고 캐릭터 답변만 하도록 짧게 지시합니다.
        return (
            f"캐릭터: {character_prompt_profile.character_prompt_summary}\n"
            f"상세 성격: {character_prompt_profile.character_prompt}\n"
            f"응답 규칙: {character_prompt_profile.character_response_rule}\n"
            "규칙:\n"
            "- 한국어 대화체로 캐릭터 최종 답변만 한다.\n"
            "- 분석, 추론, 시스템 설명, 사용자 말 반복, <think>, /no_think 금지.\n"
            "- 일반 대화는 1~3줄, 한 줄 한 생각.\n"
            "- 요청 없으면 번호 목록, 불릿, 제목을 쓰지 않는다."
        )

    def _build_chat_message_list(
        self,
        system_prompt: str,
        chat_history: list[ChatHistoryTurn],
    ) -> list[dict[str, str]]:
        ai_request_message_list: list[dict[str, str]] = [
            {"role": "system", "content": system_prompt}
        ]

        for chat_turn in chat_history:
            if chat_turn.role == "user":
                user_message_text = chat_turn.message_text.strip()
                if user_message_text:
                    ai_request_message_list.append(
                        {"role": "user", "content": user_message_text}
                    )
                continue

            if chat_turn.role == "assistant":
                clean_assistant_message_text = self._ai_reply_cleaner.clean_reply_text(
                    chat_turn.message_text
                )
                if clean_assistant_message_text:
                    ai_request_message_list.append(
                        {
                            "role": "assistant",
                            "content": clean_assistant_message_text,
                        }
                    )

        return ai_request_message_list
