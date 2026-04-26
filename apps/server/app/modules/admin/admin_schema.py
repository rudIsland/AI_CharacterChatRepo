from pydantic import BaseModel, Field


class DailyRequestIpUsage(BaseModel):
    ip_address: str = Field(description="접속 또는 AI 요청을 보낸 IP 주소입니다.")
    daily_request_count: int = Field(description="오늘 이 IP에서 보낸 AI 요청 수입니다.")
    daily_request_limit: int = Field(description="IP별 일일 AI 요청 한도입니다. 0이면 제한이 없습니다.")
    access_count: int = Field(description="오늘 이 IP에서 서버에 접속한 횟수입니다.")
    last_access_at: str | None = Field(description="이 IP의 마지막 접속 시각입니다.")


class DailyRequestUsageResponse(BaseModel):
    current_date: str = Field(description="요청 수를 집계하는 기준 날짜입니다. KST 기준입니다.")
    client_ip_address: str = Field(description="관리자 페이지에서 현재 API를 호출한 IP 주소입니다.")
    daily_request_count: int = Field(description="오늘 전체 AI 요청 수입니다.")
    daily_request_limit: int = Field(description="오늘 전체 AI 요청 한도입니다. 0이면 제한이 없습니다.")
    daily_request_limit_per_ip: int = Field(description="IP별 오늘 AI 요청 한도입니다. 0이면 제한이 없습니다.")
    daily_request_count_by_ip: dict[str, int] = Field(description="IP별 오늘 AI 요청 수입니다.")
    access_count_by_ip: dict[str, int] = Field(description="IP별 오늘 서버 접속 횟수입니다.")
    last_access_at_by_ip: dict[str, str] = Field(description="IP별 마지막 접속 시각입니다.")
    ip_usage_list: list[DailyRequestIpUsage] = Field(description="관리 UI에서 바로 보여줄 IP별 사용량 목록입니다.")


class DailyRequestIpResetRequest(BaseModel):
    ip_address: str = Field(min_length=1, max_length=100, description="초기화할 IP 주소입니다.")
