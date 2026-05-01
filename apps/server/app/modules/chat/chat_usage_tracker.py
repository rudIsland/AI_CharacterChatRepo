from fastapi import Request

from app.core.app_settings import get_app_settings
from app.modules.chat.daily_request_limiter import DailyRequestLimiter

app_settings = get_app_settings()

daily_request_limiter = DailyRequestLimiter(daily_request_limit=app_settings.daily_ai_request_limit, daily_request_limit_per_ip=app_settings.daily_ai_request_limit_per_ip)


def get_request_ip_address(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        forwarded_ip_address = forwarded_for.split(",")[0].strip()
        if forwarded_ip_address:
            return forwarded_ip_address

    if request.client is None:
        return "unknown"

    return request.client.host
