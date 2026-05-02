from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    # 서버 기본 설정
    app_name: str = Field(
        default="AI Character Chat API",
        description="서버 이름입니다. 헬스 체크 응답에서 서비스 식별용으로 사용합니다.",
    )
    admin_api_key: str | None = Field(
        default=None,
        description="관리자용 사용량 조회 API를 호출할 때 사용할 키입니다. 없으면 관리자 API를 비활성화합니다.",
    )

    # OpenAI 설정
    database_url: str | None = Field(
        default=None,
        description="Chat session and message database URL. If empty, the server uses the in-memory store.",
    )

    openai_api_key: str | None = Field(
        default=None,
        description="OpenAI 호출에 사용할 API 키입니다. 없으면 OpenAI 응답 생성을 건너뜁니다.",
    )
    openai_model_name: str = Field(
        default="gpt-4.1-mini",
        min_length=1,
        description="기본 OpenAI 모델 옵션에서 사용할 실제 모델 이름입니다.",
    )
    openai_gpt_5_4_mini_model_name: str = Field(
        default="gpt-5.4-mini",
        min_length=1,
        description="GPT-5.4 mini 모델 옵션에서 사용할 실제 모델 이름입니다.",
    )
    openai_api_base_url: str = Field(
        default="https://api.openai.com/v1",
        description="OpenAI 호환 Chat Completions API의 기본 주소입니다.",
    )

    # Gemini 설정
    gemini_api_key: str | None = Field(
        default=None,
        description="Gemini 호출에 사용할 API 키입니다. 없으면 Gemini 응답 생성을 건너뜁니다.",
    )
    gemini_3_1_flash_lite_model_name: str = Field(
        default="gemini-3.1-flash-lite",
        min_length=1,
        description="Gemini 3.1 Flash-Lite 모델 옵션에서 사용할 실제 모델 이름입니다.",
    )
    gemini_2_5_flash_model_name: str = Field(
        default="gemini-2.5-flash",
        min_length=1,
        description="Gemini 2.5 Flash 모델 옵션에서 사용할 실제 모델 이름입니다.",
    )
    gemini_2_5_flash_lite_model_name: str = Field(
        default="gemini-2.5-flash-lite",
        min_length=1,
        description="Gemini 2.5 Flash-Lite 모델 옵션에서 사용할 실제 모델 이름입니다.",
    )
    gemini_api_base_url: str = Field(
        default="https://generativelanguage.googleapis.com/v1beta",
        description="Gemini Generate Content API의 기본 주소입니다.",
    )

    # Local AI 설정
    local_ai_api_key: str | None = Field(
        default=None,
        description="Local AI 서버가 인증을 요구할 때 사용할 API 키입니다.",
    )
    local_ai_model_name: str = Field(
        default="llama3.1",
        min_length=1,
        description="Local AI 제공자를 선택했을 때 사용할 로컬 모델 이름입니다.",
    )
    local_ai_api_base_url: str = Field(
        default="http://127.0.0.1:11434/v1",
        description="Local AI 서버의 기본 주소입니다. Ollama 호환 주소도 이 값으로 관리합니다.",
    )
    local_ai_max_tokens: int = Field(
        default=180,
        description="Local AI가 한 번에 생성할 최대 토큰 수입니다.",
    )
    local_ai_history_message_limit: int = Field(
        default=12,
        description="Local AI에 함께 보낼 최근 대화 메시지 개수입니다.",
    )
    local_ai_num_ctx: int = Field(
        default=2048,
        description="Local AI 모델이 참고할 수 있는 문맥 길이입니다.",
    )

    # 사용량 제한과 CORS 설정
    daily_ai_request_limit: int = Field(
        default=100,
        ge=0,
        description="하루 동안 전체 사용자가 보낼 수 있는 AI 답변 생성 요청 수입니다. 0이면 제한하지 않습니다.",
    )
    daily_ai_request_limit_per_ip: int = Field(
        default=20,
        ge=0,
        description="하루 동안 한 IP가 보낼 수 있는 AI 답변 생성 요청 수입니다. 0이면 제한하지 않습니다.",
    )
    cors_allow_origins: list[str] = Field(
        default=[
            "https://ai-character-chat-repo.vercel.app",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
        description="브라우저와 모바일 개발 서버에서 API 호출을 허용할 출처 목록입니다.",
        env="CORS_ALLOW_ORIGINS",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_app_settings() -> AppSettings:
    return AppSettings()
