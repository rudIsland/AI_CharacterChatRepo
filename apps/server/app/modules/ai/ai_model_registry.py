from app.core.app_settings import AppSettings
from app.modules.chat.chat_schema import AiModelProvider

# 포트폴리오 배포에서 화면에 보여줄 AI 모델입니다.
# 나중에 모델을 추가하려면 아래 주석을 해제하고, 해당 API 키/서버 설정을 채우면 됩니다.
enabled_ai_model_provider_list: tuple[AiModelProvider, ...] = (
    "gpt",
    "gemini",
    # "local_ai",
)


def get_available_ai_model_provider_list(
    app_settings: AppSettings,
) -> list[AiModelProvider]:
    return [
        ai_model_provider
        for ai_model_provider in enabled_ai_model_provider_list
        if is_ai_model_provider_available(
            ai_model_provider=ai_model_provider,
            app_settings=app_settings,
        )
    ]


def is_ai_model_provider_available(
    ai_model_provider: AiModelProvider,
    app_settings: AppSettings,
) -> bool:
    if ai_model_provider == "gpt":
        return bool(app_settings.openai_api_key and app_settings.openai_model_name)

    if ai_model_provider == "gemini":
        return bool(app_settings.gemini_api_key and app_settings.gemini_model_name)

    if ai_model_provider == "local_ai":
        return False

    return False


def get_unavailable_ai_model_message(ai_model_provider: AiModelProvider) -> str:
    if ai_model_provider == "local_ai":
        return "로컬 AI는 배포 환경에서 사용할 수 없습니다."

    return f"현재 사용할 수 없는 AI 모델입니다: {ai_model_provider}"
