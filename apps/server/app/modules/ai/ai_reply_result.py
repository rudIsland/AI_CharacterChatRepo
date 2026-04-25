from dataclasses import dataclass


@dataclass(frozen=True)
class AiTokenUsage:
    # 모델에 보낸 입력 토큰 수입니다.
    input_token_count: int | None = None
    # 모델이 생성한 출력 토큰 수입니다.
    output_token_count: int | None = None
    # 입력과 출력을 합친 전체 토큰 수입니다.
    total_token_count: int | None = None


@dataclass(frozen=True)
class AiReplyResult:
    # 사용자에게 보여줄 최종 AI 답변입니다.
    reply_text: str
    # AI 제공자가 알려준 토큰 사용량입니다. 제공자가 주지 않으면 None입니다.
    token_usage: AiTokenUsage | None = None
