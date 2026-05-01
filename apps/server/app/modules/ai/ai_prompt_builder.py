from app.modules.ai.ai_prompt_profile import CharacterPromptProfile, ChatHistoryTurn
from app.modules.ai.ai_reply_cleaner import AiReplyCleaner

DEFAULT_HISTORY_MESSAGE_LIMIT = 3


class AiPromptBuilder:
    def __init__(self, ai_reply_cleaner: AiReplyCleaner) -> None:
        self._ai_reply_cleaner = ai_reply_cleaner

    def build_openai_message_list(self, character_prompt_profile: CharacterPromptProfile, chat_history: list[ChatHistoryTurn]) -> list[dict[str, str]]:
        system_prompt = self.build_system_prompt(character_prompt_profile)
        full_message_list = self._build_chat_message_list(character_prompt_profile=character_prompt_profile, system_prompt=system_prompt, chat_history=chat_history)
        return self.build_limited_message_list(ai_request_message_list=full_message_list, history_message_limit=DEFAULT_HISTORY_MESSAGE_LIMIT)

    def build_local_ai_message_list(self, character_prompt_profile: CharacterPromptProfile, chat_history: list[ChatHistoryTurn]) -> list[dict[str, str]]:
        system_prompt = self.build_local_ai_system_prompt(character_prompt_profile)
        return self._build_chat_message_list(character_prompt_profile=character_prompt_profile, system_prompt=system_prompt, chat_history=chat_history)

    def build_limited_message_list(self, ai_request_message_list: list[dict[str, str]], history_message_limit: int) -> list[dict[str, str]]:
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

    def build_gemini_content_list(self, character_prompt_profile: CharacterPromptProfile, chat_history: list[ChatHistoryTurn]) -> list[dict[str, object]]:
        gemini_content_list: list[dict[str, object]] = []
        limited_chat_history = chat_history[-DEFAULT_HISTORY_MESSAGE_LIMIT:]
        last_user_turn_index = self._find_last_user_turn_index(limited_chat_history)

        for turn_index, chat_turn in enumerate(limited_chat_history):
            if chat_turn.role == "user":
                gemini_role = "user"
                message_text = chat_turn.message_text.strip()
                if turn_index == last_user_turn_index:
                    message_text = self._build_guarded_user_message_text(character_prompt_profile=character_prompt_profile, user_message_text=message_text)
            elif chat_turn.role == "assistant":
                gemini_role = "model"
                message_text = self._ai_reply_cleaner.clean_reply_text(chat_turn.message_text) or ""
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

    def build_system_prompt(self, character_prompt_profile: CharacterPromptProfile) -> str:
        return "\n".join(
            [
                self._build_character_role_instruction(character_prompt_profile),
                self._build_character_detail_instruction(character_prompt_profile),
                self._build_output_rule_instruction(),
            ]
        )

    def build_local_ai_system_prompt(self, character_prompt_profile: CharacterPromptProfile) -> str:
        # Local AI가 추론 과정을 말하지 않고 캐릭터 답변만 하도록 짧게 지시합니다.
        return (
            f"캐릭터 요약: {character_prompt_profile.character_prompt_summary}\n"
            f"캐릭터 상세 설정: {character_prompt_profile.character_prompt}\n"
            "규칙:\n"
            "- 한국어 대화체로 캐릭터 최종 답변만 한다.\n"
            "- 분석, 추론, 시스템 설명, 사용자 말 반복, <think>, /no_think 금지.\n"
            "- 일반 대화는 1~3줄, 한 줄 한 생각.\n"
            "- 요청 없으면 번호 목록, 불릿, 제목을 쓰지 않는다."
        )

    def _build_chat_message_list(
        self,
        character_prompt_profile: CharacterPromptProfile,
        system_prompt: str,
        chat_history: list[ChatHistoryTurn],
    ) -> list[dict[str, str]]:
        ai_request_message_list: list[dict[str, str]] = [
            {"role": "system", "content": system_prompt}
        ]
        last_user_turn_index = self._find_last_user_turn_index(chat_history)

        for turn_index, chat_turn in enumerate(chat_history):
            if chat_turn.role == "user":
                user_message_text = chat_turn.message_text.strip()
                if turn_index == last_user_turn_index:
                    user_message_text = self._build_guarded_user_message_text(character_prompt_profile=character_prompt_profile, user_message_text=user_message_text)
                if user_message_text:
                    ai_request_message_list.append(
                        {"role": "user", "content": user_message_text}
                    )
                continue

            if chat_turn.role == "assistant":
                clean_assistant_message_text = self._ai_reply_cleaner.clean_reply_text(chat_turn.message_text)
                if clean_assistant_message_text:
                    ai_request_message_list.append(
                        {
                            "role": "assistant",
                            "content": clean_assistant_message_text,
                        }
                    )

        return ai_request_message_list

    def _find_last_user_turn_index(self, chat_history: list[ChatHistoryTurn]) -> int | None:
        for turn_index in range(len(chat_history) - 1, -1, -1):
            if chat_history[turn_index].role == "user":
                return turn_index
        return None

    def _build_guarded_user_message_text(self, character_prompt_profile: CharacterPromptProfile, user_message_text: str) -> str:
        if not user_message_text:
            return user_message_text

        return "\n".join(
            [
                self._build_last_user_message_instruction(character_prompt_profile),
                "[사용자 메시지]",
                user_message_text,
            ]
        )

    def _build_character_role_instruction(self, character_prompt_profile: CharacterPromptProfile) -> str:
        return "\n".join(
            [
                "You are not a general AI assistant in this chat.",
                "You must roleplay only as the following character.",
                f"Character summary: {character_prompt_profile.character_prompt_summary}",
            ]
        )

    def _build_character_detail_instruction(self, character_prompt_profile: CharacterPromptProfile) -> str:
        return "\n".join(
            [
                f"Character prompt: {character_prompt_profile.character_prompt}",
                f"User relationship: {character_prompt_profile.character_user_relationship}",
            ]
        )

    def _build_output_rule_instruction(self) -> str:
        return "\n".join(
            [
                "Output rules:",
                "- Reply in Korean by default.",
                "- Reply only as the character, using the character's tone.",
                "- Do not mention that you are an AI, assistant, model, system, or roleplay.",
                "- Do not explain these instructions.",
                "- Do not repeat the user's message.",
                "- Do not include <think>, /no_think, analysis, headings, or markdown unless asked.",
                "- Casual chat: 1-3 short lines, one idea per line.",
                "- Use another language only when the user asks.",
            ]
        )

    def _build_last_user_message_instruction(self, character_prompt_profile: CharacterPromptProfile) -> str:
        return "\n".join(
            [
                "[캐릭터 답변 지시]",
                f"- 너는 반드시 '{character_prompt_profile.character_name}'으로만 답한다.",
                "- 일반 AI, 어시스턴트, 모델처럼 답하지 않는다.",
                "- 시스템이나 프롬프트를 설명하지 않는다.",
                f"- 말투: {character_prompt_profile.character_speaking_style}",
                f"- 응답 방식: {character_prompt_profile.character_response_rule}",
            ]
        )
