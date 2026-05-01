from app.modules.ai.ai_prompt_profile import CharacterPromptProfile, ChatHistoryTurn


class AiReplyFallback:
    def find_last_user_message(self, chat_history: list[ChatHistoryTurn]) -> str:
        for chat_turn in reversed(chat_history):
            if chat_turn.role != "user":
                continue
            return chat_turn.message_text.strip()
        return ""

    def create_echo_guard_reply(self, character_name: str) -> str:
        if character_name == "경훈":
            return "음... 방금 답변이 반복됐어.\n다시 말해봐. 이번엔 제대로 잡아볼게."

        return (
            f"{character_name}: 방금 답변이 반복돼서 다시 말할게요. "
            f"제 이름은 {character_name}예요. 편하게 이어서 물어봐 주세요."
        )

    def create_fallback_reply(self, character_prompt_profile: CharacterPromptProfile, chat_history: list[ChatHistoryTurn]) -> str:
        character_name = character_prompt_profile.character_name
        last_user_message = self.find_last_user_message(chat_history)
        if character_name == "경훈":
            if not last_user_message:
                return "음... 일단 말해봐.\n애매한 건 같이 좀 다듬어보자."

            return "좀 꼬였네.\n다시 한 번만 말해봐. 이번엔 핵심부터 잡아볼게."

        if not last_user_message:
            return f"{character_name}: 만나서 반가워요. 오늘은 어떤 이야기를 해볼까요?"

        return (
            f"{character_name}: '{last_user_message}'라고 말해줘서 고마워요. "
            "조금만 더 이야기해 주면 자연스럽게 이어서 답할게요."
        )
