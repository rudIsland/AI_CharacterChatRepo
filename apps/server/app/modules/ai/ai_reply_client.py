from typing import Protocol

from app.modules.ai.ai_prompt_profile import CharacterPromptProfile, ChatHistoryTurn
from app.modules.ai.ai_reply_result import AiReplyResult


class AiReplyClient(Protocol):
    # AI 제공자가 달라도 서비스에서는 이 형태로만 답변 생성을 요청합니다.
    async def request_reply(
        self,
        character_prompt_profile: CharacterPromptProfile,
        chat_history: list[ChatHistoryTurn],
        model_name: str,
    ) -> AiReplyResult | None:
        ...
