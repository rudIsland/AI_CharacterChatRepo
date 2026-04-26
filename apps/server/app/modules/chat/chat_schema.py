from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

# 클라이언트가 선택할 수 있는 AI 제공자 이름입니다.
AiModelProvider = Literal["gpt", "gemini", "local_ai"]

# 한 대화 세션에서 사용할 수 있는 전체 토큰 할당량입니다.
CHAT_SESSION_TOKEN_LIMIT_COUNT = 20_000
USER_MESSAGE_MAX_LENGTH = 500


class ChatSessionCreateRequest(BaseModel):
    character_id: str = Field(
        min_length=1,
        max_length=50,
        description="대화를 시작할 캐릭터의 고유 ID입니다.",
    )
    guest_id: str = Field(
        default="guest",
        min_length=1,
        max_length=50,
        description="로그인 없이 사용자를 구분하기 위한 임시 사용자 ID입니다.",
    )
    ai_model_provider: AiModelProvider = Field(
        default="gpt",
        description="이 대화에서 사용할 AI 제공자입니다.",
    )


class ChatSessionSummary(BaseModel):
    chat_session_id: str = Field(description="대화 세션을 구분하는 고유 ID입니다.")
    character_id: str = Field(description="이 세션에서 대화하는 캐릭터의 고유 ID입니다.")
    guest_id: str = Field(description="이 세션을 가진 임시 사용자 ID입니다.")
    ai_model_provider: AiModelProvider = Field(
        description="이 세션에서 마지막으로 선택한 AI 제공자입니다."
    )
    created_at: datetime = Field(description="세션이 처음 만들어진 시간입니다.")


class ChatMessage(BaseModel):
    message_id: str = Field(description="메시지를 구분하는 고유 ID입니다.")
    role: Literal["user", "assistant"] = Field(
        description="메시지를 보낸 주체입니다. user는 사용자, assistant는 AI입니다."
    )
    message_text: str = Field(description="채팅창에 보여줄 실제 메시지 내용입니다.")
    input_token_count: int | None = Field(
        default=None,
        description="AI 응답 생성에 사용된 입력 토큰 수입니다.",
    )
    output_token_count: int | None = Field(
        default=None,
        description="AI가 생성한 출력 토큰 수입니다.",
    )
    total_token_count: int | None = Field(
        default=None,
        description="입력과 출력을 합친 전체 토큰 수입니다.",
    )
    created_at: datetime = Field(description="메시지가 저장된 시간입니다.")


class ChatMessageCreateRequest(BaseModel):
    user_message_text: str = Field(
        min_length=1,
        max_length=USER_MESSAGE_MAX_LENGTH,
        description="사용자가 새로 보낸 메시지 내용입니다.",
    )
    ai_model_provider: AiModelProvider | None = Field(
        default=None,
        description="이번 메시지부터 사용할 AI 제공자입니다. 없으면 세션의 기존 값을 사용합니다.",
    )


class ChatSessionMessageCreateResponse(BaseModel):
    chat_session_id: str = Field(description="메시지가 추가된 대화 세션 ID입니다.")
    user_message: ChatMessage = Field(description="서버에 저장된 사용자 메시지입니다.")
    assistant_message: ChatMessage = Field(description="AI가 생성하고 서버에 저장한 답변입니다.")
    used_token_count: int = Field(description="이 세션에서 지금까지 사용한 누적 토큰 수입니다.")
    token_limit_count: int = Field(description="이 세션에서 사용할 수 있는 전체 토큰 한도입니다.")


class ChatSessionMessageListResponse(BaseModel):
    chat_session_id: str = Field(description="메시지 목록을 조회한 대화 세션 ID입니다.")
    message_list: list[ChatMessage] = Field(
        description="이 세션에 저장된 사용자와 AI 메시지 목록입니다."
    )
    used_token_count: int = Field(description="이 세션에서 지금까지 사용한 누적 토큰 수입니다.")
    token_limit_count: int = Field(description="이 세션에서 사용할 수 있는 전체 토큰 한도입니다.")
