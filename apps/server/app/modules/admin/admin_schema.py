from pydantic import BaseModel, Field


class DailyRequestUsageResponse(BaseModel):
    current_date: str = Field(description="요청 수를 집계하는 기준 날짜입니다. KST 기준입니다.")
    daily_request_count: int = Field(description="오늘 전체 AI 요청 수입니다.")
    daily_request_limit: int = Field(description="오늘 전체 AI 요청 한도입니다. 0이면 제한이 없습니다.")
    daily_request_limit_per_ip: int = Field(description="IP당 오늘 AI 요청 한도입니다. 0이면 제한이 없습니다.")
    daily_request_count_by_ip: dict[str, int] = Field(
        description="IP별 오늘 AI 요청 수입니다."
    )
