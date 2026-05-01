from pydantic import BaseModel, Field

from app.modules.chat.chat_schema import AiModelId, AiModelProvider


class HealthResponse(BaseModel):
    status: str = Field(description="서버가 정상 동작 중인지 알려주는 상태값입니다.")
    service_name: str = Field(description="현재 실행 중인 서버 이름입니다.")


class PingResponse(BaseModel):
    message: str = Field(description="서버 연결 확인용 응답 메시지입니다.")


class EchoRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000, description="서버가 그대로 되돌려줄 테스트 메시지입니다.")


class EchoResponse(BaseModel):
    message: str = Field(description="요청에서 받은 메시지를 그대로 담은 값입니다.")
    message_length: int = Field(description="메시지 글자 수입니다.")


class AiModelOption(BaseModel):
    ai_model_id: AiModelId = Field(description="클라이언트가 서버에 전달할 AI 모델 ID입니다.")
    ai_model_provider: AiModelProvider = Field(description="실제 API 호출에 사용할 AI 제공자입니다.")
    ai_model_name: str = Field(description="제공자 API에 전달할 실제 모델 이름입니다.")
    ai_model_label: str = Field(description="클라이언트 화면에 보여줄 모델 표시 이름입니다.")


class AiModelOptionListResponse(BaseModel):
    ai_model_option_list: list[AiModelOption] = Field(description="클라이언트가 선택할 수 있는 AI 모델 옵션 목록입니다.")


class DailyRequestUsageResponse(BaseModel):
    current_date: str = Field(description="요청 수를 집계하는 기준 날짜입니다. KST 기준입니다.")
    daily_request_count: int = Field(description="오늘 전체 AI 요청 수입니다.")
    daily_request_limit: int = Field(description="오늘 전체 AI 요청 한도입니다. 0이면 제한이 없습니다.")
    client_ip_address: str = Field(description="현재 클라이언트의 IP 주소입니다.")
    client_daily_request_count: int = Field(description="현재 클라이언트 IP의 오늘 AI 요청 수입니다.")
    client_daily_request_limit: int = Field(description="현재 클라이언트 IP의 오늘 AI 요청 한도입니다. 0이면 제한이 없습니다.")
