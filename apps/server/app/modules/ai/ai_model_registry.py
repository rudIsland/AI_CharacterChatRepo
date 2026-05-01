from dataclasses import dataclass

from app.core.app_settings import AppSettings
from app.modules.chat.chat_schema import AiModelId, AiModelProvider


@dataclass(frozen=True)
class AiModelConfig:
    # 이 목록이 클라이언트 노출과 서버 요청 허용의 단일 기준입니다.
    ai_model_id: AiModelId
    ai_model_provider: AiModelProvider
    ai_model_name_setting_name: str
    ai_model_display_name: str
    required_setting_name_list: tuple[str, ...]
    is_enabled: bool


@dataclass(frozen=True)
class AiModelDefinition:
    # 클라이언트가 선택하고 서버가 세션에 저장하는 고유 ID입니다.
    ai_model_id: AiModelId
    # 실제 API 호출에 사용할 제공자입니다.
    ai_model_provider: AiModelProvider
    # 각 제공자 API에 전달할 실제 모델 이름입니다.
    ai_model_name: str
    # 클라이언트 화면에 보여줄 이름입니다.
    ai_model_label: str
    # 개발자가 이 모델을 서비스에 노출하기로 정했는지 나타냅니다.
    is_enabled: bool
    # API 키, 모델명, 서버 주소처럼 실행에 필요한 설정이 준비되었는지 나타냅니다.
    is_runtime_ready: bool

    @property
    def is_selectable(self) -> bool:
        return self.is_enabled and self.is_runtime_ready


AI_MODEL_CONFIG_LIST: tuple[AiModelConfig, ...] = (
    AiModelConfig(
        ai_model_id="openai_gpt_4_1_mini",
        ai_model_provider="openai",
        ai_model_name_setting_name="openai_model_name",
        ai_model_display_name="GPT-4.1 mini",
        required_setting_name_list=("openai_api_key", "openai_model_name", "openai_api_base_url"),
        is_enabled=True,
    ),
    AiModelConfig(
        ai_model_id="openai_gpt_5_4_mini",
        ai_model_provider="openai",
        ai_model_name_setting_name="openai_gpt_5_4_mini_model_name",
        ai_model_display_name="GPT-5.4 mini",
        required_setting_name_list=("openai_api_key", "openai_gpt_5_4_mini_model_name", "openai_api_base_url"),
        is_enabled=True,
    ),
    AiModelConfig(
        ai_model_id="gemini_3_1_flash_lite",
        ai_model_provider="gemini",
        ai_model_name_setting_name="gemini_3_1_flash_lite_model_name",
        ai_model_display_name="Gemini 3.1 Flash-Lite",
        required_setting_name_list=("gemini_api_key", "gemini_3_1_flash_lite_model_name", "gemini_api_base_url"),
        is_enabled=False,
    ),
    AiModelConfig(
        ai_model_id="gemini_2_5_flash",
        ai_model_provider="gemini",
        ai_model_name_setting_name="gemini_2_5_flash_model_name",
        ai_model_display_name="Gemini 2.5 Flash",
        required_setting_name_list=("gemini_api_key", "gemini_2_5_flash_model_name", "gemini_api_base_url"),
        is_enabled=True,
    ),
    AiModelConfig(
        ai_model_id="gemini_2_5_flash_lite",
        ai_model_provider="gemini",
        ai_model_name_setting_name="gemini_2_5_flash_lite_model_name",
        ai_model_display_name="Gemini 2.5 Flash-Lite",
        required_setting_name_list=("gemini_api_key", "gemini_2_5_flash_lite_model_name", "gemini_api_base_url"),
        is_enabled=True,
    ),
    AiModelConfig(
        ai_model_id="local_ai",
        ai_model_provider="local_ai",
        ai_model_name_setting_name="local_ai_model_name",
        ai_model_display_name="로컬 AI",
        required_setting_name_list=("local_ai_model_name", "local_ai_api_base_url"),
        is_enabled=False,
    ),
)


def list_selectable_ai_model_definitions(app_settings: AppSettings) -> list[AiModelDefinition]:
    return [
        ai_model_definition
        for ai_model_definition in list_all_ai_model_definitions(app_settings)
        if ai_model_definition.is_selectable
    ]


def list_all_ai_model_definitions(app_settings: AppSettings) -> list[AiModelDefinition]:
    return [
        build_ai_model_definition(ai_model_config=ai_model_config, app_settings=app_settings)
        for ai_model_config in AI_MODEL_CONFIG_LIST
    ]


def find_selectable_ai_model_definition_by_id(ai_model_id: AiModelId, app_settings: AppSettings) -> AiModelDefinition | None:
    for ai_model_definition in list_selectable_ai_model_definitions(app_settings):
        if ai_model_definition.ai_model_id == ai_model_id:
            return ai_model_definition
    return None


def is_ai_model_available(ai_model_id: AiModelId, app_settings: AppSettings) -> bool:
    return find_selectable_ai_model_definition_by_id(ai_model_id=ai_model_id, app_settings=app_settings) is not None


def build_ai_model_definition(ai_model_config: AiModelConfig, app_settings: AppSettings) -> AiModelDefinition:
    ai_model_name = read_app_setting_text(app_settings=app_settings, setting_name=ai_model_config.ai_model_name_setting_name)
    return AiModelDefinition(
        ai_model_id=ai_model_config.ai_model_id,
        ai_model_provider=ai_model_config.ai_model_provider,
        ai_model_name=ai_model_name,
        ai_model_label=build_ai_model_label(ai_model_display_name=ai_model_config.ai_model_display_name, ai_model_name=ai_model_name),
        is_enabled=ai_model_config.is_enabled,
        is_runtime_ready=are_required_settings_ready(app_settings=app_settings, setting_name_list=ai_model_config.required_setting_name_list),
    )


def get_unavailable_ai_model_message(ai_model_id: AiModelId) -> str:
    if ai_model_id == "local_ai":
        return "로컬 AI는 배포 환경에서 사용할 수 없습니다."

    return f"현재 사용할 수 없는 AI 모델입니다: {ai_model_id}"


def build_ai_model_label(ai_model_display_name: str, ai_model_name: str) -> str:
    if not ai_model_name:
        return ai_model_display_name
    return f"{ai_model_display_name} ({ai_model_name})"


def are_required_settings_ready(app_settings: AppSettings, setting_name_list: tuple[str, ...]) -> bool:
    return all(read_app_setting_text(app_settings=app_settings, setting_name=setting_name) for setting_name in setting_name_list)


def read_app_setting_text(app_settings: AppSettings, setting_name: str) -> str:
    setting_value = getattr(app_settings, setting_name, None)
    if isinstance(setting_value, str):
        return setting_value.strip()
    return ""
