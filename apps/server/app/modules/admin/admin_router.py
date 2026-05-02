from secrets import compare_digest

from fastapi import APIRouter, Header, HTTPException, Request, status

from app.core.app_settings import get_app_settings
from app.modules.admin.admin_schema import (
    DailyRequestIpCountUpdateRequest,
    DailyRequestIpResetRequest,
    DailyRequestUsageResponse,
)
from app.modules.chat.chat_usage_tracker import daily_request_limiter, get_request_ip_address

admin_router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin_api_key(x_admin_api_key: str | None = Header(default=None)) -> None:
    app_settings = get_app_settings()
    if not app_settings.admin_api_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin API is disabled.")

    if x_admin_api_key is None or not compare_digest(x_admin_api_key, app_settings.admin_api_key):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin API key.")


def build_daily_request_usage_response(admin_client_ip_address: str) -> DailyRequestUsageResponse:
    usage_snapshot = daily_request_limiter.get_usage_snapshot()
    ip_address_set = (
        set(usage_snapshot.daily_request_count_by_ip)
        | set(usage_snapshot.access_count_by_ip)
        | set(usage_snapshot.last_access_at_by_ip)
    )
    ip_usage_list = [
        {
            "ip_address": ip_address,
            "is_admin_client": ip_address == admin_client_ip_address,
            "daily_request_count": usage_snapshot.daily_request_count_by_ip.get(ip_address, 0),
            "daily_request_limit": usage_snapshot.daily_request_limit_per_ip,
            "access_count": usage_snapshot.access_count_by_ip.get(ip_address, 0),
            "last_access_at": usage_snapshot.last_access_at_by_ip.get(ip_address).isoformat()
            if usage_snapshot.last_access_at_by_ip.get(ip_address)
            else None,
        }
        for ip_address in sorted(ip_address_set)
    ]

    return DailyRequestUsageResponse(
        current_date=usage_snapshot.current_date.isoformat(),
        admin_client_ip_address=admin_client_ip_address,
        client_ip_address=admin_client_ip_address,
        daily_request_count=usage_snapshot.daily_request_count,
        daily_request_limit=usage_snapshot.daily_request_limit,
        daily_request_limit_per_ip=usage_snapshot.daily_request_limit_per_ip,
        daily_request_count_by_ip=usage_snapshot.daily_request_count_by_ip,
        access_count_by_ip=usage_snapshot.access_count_by_ip,
        last_access_at_by_ip={
            ip_address: last_access_at.isoformat()
            for ip_address, last_access_at in usage_snapshot.last_access_at_by_ip.items()
        },
        ip_usage_list=ip_usage_list,
    )


@admin_router.get("/usage", response_model=DailyRequestUsageResponse)
def get_daily_request_usage(
    request: Request,
    x_admin_api_key: str | None = Header(default=None),
) -> DailyRequestUsageResponse:
    require_admin_api_key(x_admin_api_key)
    admin_client_ip_address = get_request_ip_address(request)
    return build_daily_request_usage_response(admin_client_ip_address)


@admin_router.post("/usage/reset", response_model=DailyRequestUsageResponse)
def reset_daily_request_usage(
    request: Request,
    x_admin_api_key: str | None = Header(default=None),
) -> DailyRequestUsageResponse:
    require_admin_api_key(x_admin_api_key)
    admin_client_ip_address = get_request_ip_address(request)
    daily_request_limiter.reset_usage()
    daily_request_limiter.record_access(admin_client_ip_address)
    return build_daily_request_usage_response(admin_client_ip_address)


@admin_router.post("/usage/ip/reset", response_model=DailyRequestUsageResponse)
def reset_daily_request_ip_usage(
    request: Request,
    request_body: DailyRequestIpResetRequest,
    x_admin_api_key: str | None = Header(default=None),
) -> DailyRequestUsageResponse:
    require_admin_api_key(x_admin_api_key)
    admin_client_ip_address = get_request_ip_address(request)
    daily_request_limiter.reset_ip_usage(request_body.ip_address)
    if request_body.ip_address == admin_client_ip_address:
        daily_request_limiter.record_access(admin_client_ip_address)
    return build_daily_request_usage_response(admin_client_ip_address)


@admin_router.post("/usage/ip/request-count", response_model=DailyRequestUsageResponse)
def update_daily_request_ip_count(
    request: Request,
    request_body: DailyRequestIpCountUpdateRequest,
    x_admin_api_key: str | None = Header(default=None),
) -> DailyRequestUsageResponse:
    require_admin_api_key(x_admin_api_key)
    admin_client_ip_address = get_request_ip_address(request)
    daily_request_limiter.set_ip_request_count(ip_address=request_body.ip_address, request_count=request_body.daily_request_count)
    return build_daily_request_usage_response(admin_client_ip_address)
