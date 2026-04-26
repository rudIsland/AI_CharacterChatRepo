import type { ClientDailyRequestUsageResponse } from "@/features/chat/chat-types";

type ChatDailyRequestUsageProps = {
  dailyRequestUsage: ClientDailyRequestUsageResponse | null;
};

function formatLimitText(count: number, limit: number): string {
  if (limit === 0) {
    return `${count.toLocaleString("ko-KR")} / 무제한`;
  }
  return `${count.toLocaleString("ko-KR")} / ${limit.toLocaleString("ko-KR")}`;
}

export function ChatDailyRequestUsage({
  dailyRequestUsage,
}: ChatDailyRequestUsageProps) {
  if (!dailyRequestUsage) {
    return null;
  }

  return (
    <div className="mt-2 grid gap-2 text-xs font-medium text-slate-400 sm:grid-cols-2">
      <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
        <span className="text-slate-500">내 일일 요청</span>
        <span className="ml-2 text-slate-200">
          {formatLimitText(
            dailyRequestUsage.client_daily_request_count,
            dailyRequestUsage.client_daily_request_limit
          )}
        </span>
      </div>
      <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
        <span className="text-slate-500">전체 일일 요청</span>
        <span className="ml-2 text-slate-200">
          {formatLimitText(
            dailyRequestUsage.daily_request_count,
            dailyRequestUsage.daily_request_limit
          )}
        </span>
      </div>
    </div>
  );
}
