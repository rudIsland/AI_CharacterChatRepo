from fastapi import APIRouter, Header, HTTPException, status

from app.core.app_settings import get_app_settings
from app.modules.admin.admin_schema import DailyRequestUsageResponse
from app.modules.chat.chat_router import daily_request_limiter

admin_router = APIRouter(prefix="/admin", tags=["admin"])


@admin_router.get("/usage", response_model=DailyRequestUsageResponse)
def get_daily_request_usage(
    x_admin_api_key: str | None = Header(default=None),
) -> DailyRequestUsageResponse:
    app_settings = get_app_settings()
    if not app_settings.admin_api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin API is disabled.",
        )

    if x_admin_api_key != app_settings.admin_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin API key.",
        )

    usage_snapshot = daily_request_limiter.get_usage_snapshot()
    return DailyRequestUsageResponse(
        current_date=usage_snapshot.current_date.isoformat(),
        daily_request_count=usage_snapshot.daily_request_count,
        daily_request_limit=usage_snapshot.daily_request_limit,
        daily_request_limit_per_ip=usage_snapshot.daily_request_limit_per_ip,
        daily_request_count_by_ip=usage_snapshot.daily_request_count_by_ip,
    )
