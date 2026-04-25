from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from threading import Lock

KOREA_TIMEZONE = timezone(timedelta(hours=9))


@dataclass(frozen=True)
class DailyRequestLimitResult:
    is_allowed: bool
    error_message: str | None = None


class DailyRequestLimiter:
    def __init__(
        self,
        daily_request_limit: int,
        daily_request_limit_per_ip: int,
    ) -> None:
        self._daily_request_limit = daily_request_limit
        self._daily_request_limit_per_ip = daily_request_limit_per_ip
        self._current_date = self._get_today()
        self._daily_request_count = 0
        self._daily_request_count_by_ip: dict[str, int] = {}
        self._write_lock = Lock()

    def increase_request_count(self, ip_address: str) -> DailyRequestLimitResult:
        with self._write_lock:
            self._reset_count_if_date_changed()

            current_ip_request_count = self._daily_request_count_by_ip.get(
                ip_address,
                0,
            )
            if (
                self._daily_request_limit_per_ip > 0
                and current_ip_request_count >= self._daily_request_limit_per_ip
            ):
                return DailyRequestLimitResult(
                    is_allowed=False,
                    error_message="오늘 이 IP에서 사용할 수 있는 AI 요청 수를 모두 사용했습니다.",
                )

            if (
                self._daily_request_limit > 0
                and self._daily_request_count >= self._daily_request_limit
            ):
                return DailyRequestLimitResult(
                    is_allowed=False,
                    error_message="오늘 전체 AI 요청 수를 모두 사용했습니다.",
                )

            self._daily_request_count += 1
            self._daily_request_count_by_ip[ip_address] = current_ip_request_count + 1
            return DailyRequestLimitResult(is_allowed=True)

    def decrease_request_count(self, ip_address: str) -> None:
        with self._write_lock:
            self._reset_count_if_date_changed()

            if self._daily_request_count > 0:
                self._daily_request_count -= 1

            current_ip_request_count = self._daily_request_count_by_ip.get(
                ip_address,
                0,
            )
            if current_ip_request_count <= 1:
                self._daily_request_count_by_ip.pop(ip_address, None)
                return

            self._daily_request_count_by_ip[ip_address] = current_ip_request_count - 1

    def _reset_count_if_date_changed(self) -> None:
        today = self._get_today()
        if today == self._current_date:
            return

        self._current_date = today
        self._daily_request_count = 0
        self._daily_request_count_by_ip.clear()

    def _get_today(self) -> date:
        return datetime.now(KOREA_TIMEZONE).date()
