"use client";

import { useEffect, useMemo, useState } from "react";

import {
  fetchAdminDailyRequestUsage,
  resetAdminDailyRequestIpUsage,
  resetAdminDailyRequestUsage,
  updateAdminDailyRequestIpCount,
} from "@/features/chat/chat-api-client";
import type {
  AdminDailyRequestUsageResponse,
  DailyRequestIpUsage,
} from "@/features/chat/chat-types";

type IpUsageDisplayRow = DailyRequestIpUsage & {
  ipBadgeClassName: string;
  ipBadgeLabel: string;
};

function formatLimitText(count: number, limit: number): string {
  if (limit === 0) {
    return `${count.toLocaleString("ko-KR")} / 무제한`;
  }
  return `${count.toLocaleString("ko-KR")} / ${limit.toLocaleString("ko-KR")}`;
}

function formatLastAccessAt(lastAccessAt: string | null): string {
  if (!lastAccessAt) {
    return "-";
  }

  return new Date(lastAccessAt).toLocaleString("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallbackMessage;
}

function isAdminAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return statusCode === 401 || statusCode === 404;
}

function buildIpUsageDisplayRowList(
  usage: AdminDailyRequestUsageResponse | null
): IpUsageDisplayRow[] {
  const sortedIpUsageList = [...(usage?.ip_usage_list ?? [])].sort(
    (left, right) => {
      if (left.is_admin_client !== right.is_admin_client) {
        return left.is_admin_client ? -1 : 1;
      }
      return right.access_count - left.access_count;
    }
  );

  return sortedIpUsageList.map((ipUsage) => {
    if (ipUsage.is_admin_client) {
      return {
        ...ipUsage,
        ipBadgeClassName:
          "border-emerald-600/50 bg-emerald-950/70 text-emerald-200",
        ipBadgeLabel: "관리자 IP",
      };
    }

    return {
      ...ipUsage,
      ipBadgeClassName: "border-slate-600 bg-slate-800 text-slate-300",
      ipBadgeLabel: "외부 IP",
    };
  });
}

export function AdminUsageScreen() {
  const [adminApiKey, setAdminApiKey] = useState("");
  const [usage, setUsage] = useState<AdminDailyRequestUsageResponse | null>(null);
  const [requestCountTextByIp, setRequestCountTextByIp] = useState<
    Record<string, string>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const ipUsageDisplayRowList = useMemo(() => {
    return buildIpUsageDisplayRowList(usage);
  }, [usage]);

  useEffect(() => {
    const nextRequestCountTextByIp: Record<string, string> = {};
    for (const ipUsage of usage?.ip_usage_list ?? []) {
      nextRequestCountTextByIp[ipUsage.ip_address] = String(
        ipUsage.daily_request_count
      );
    }
    setRequestCountTextByIp(nextRequestCountTextByIp);
  }, [usage]);

  const loadUsageAction = async (apiKey = adminApiKey) => {
    const cleanApiKey = apiKey.trim();
    if (!cleanApiKey) {
      setErrorMessage("관리자 키를 입력해 주세요.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const usageFromServer = await fetchAdminDailyRequestUsage(cleanApiKey);
      setUsage(usageFromServer);
    } catch (error) {
      setUsage(null);
      setRequestCountTextByIp({});
      setErrorMessage(
        getErrorMessage(error, "사용량 정보를 불러오지 못했습니다.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetAllUsageAction = async () => {
    const cleanApiKey = adminApiKey.trim();
    if (!cleanApiKey) {
      setErrorMessage("관리자 키를 입력해 주세요.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const usageFromServer = await resetAdminDailyRequestUsage(cleanApiKey);
      setUsage(usageFromServer);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "전체 사용량 초기화에 실패했습니다.")
      );
      if (isAdminAuthError(error)) {
        setUsage(null);
        setRequestCountTextByIp({});
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetIpUsageAction = async (ipAddress: string) => {
    const cleanApiKey = adminApiKey.trim();
    if (!cleanApiKey) {
      setErrorMessage("관리자 키를 입력해 주세요.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const usageFromServer = await resetAdminDailyRequestIpUsage(
        cleanApiKey,
        ipAddress
      );
      setUsage(usageFromServer);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "IP 사용량 초기화에 실패했습니다."));
      if (isAdminAuthError(error)) {
        setUsage(null);
        setRequestCountTextByIp({});
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateIpRequestCountAction = async (ipAddress: string) => {
    const cleanApiKey = adminApiKey.trim();
    if (!cleanApiKey) {
      setErrorMessage("관리자 키를 입력해 주세요.");
      return;
    }

    const requestCountText = requestCountTextByIp[ipAddress]?.trim() ?? "";
    const requestCount = Number(requestCountText);
    if (
      !requestCountText ||
      !Number.isInteger(requestCount) ||
      requestCount < 0
    ) {
      setErrorMessage("AI 요청 수는 0 이상의 정수로 입력해 주세요.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const usageFromServer = await updateAdminDailyRequestIpCount(
        cleanApiKey,
        ipAddress,
        requestCount
      );
      setUsage(usageFromServer);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "IP 사용량 조절에 실패했습니다."));
      if (isAdminAuthError(error)) {
        setUsage(null);
        setRequestCountTextByIp({});
      }
    } finally {
      setIsLoading(false);
    }
  };

  const adminIpAddress =
    usage?.admin_client_ip_address ?? usage?.client_ip_address ?? "-";

  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-4 text-slate-100">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="flex flex-col gap-3 border-b border-slate-800 pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">서버 관리</h1>
            <p className="mt-1 text-sm text-slate-400">
              {usage ? `${usage.current_date} 기준` : "사용량 대기 중"}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="h-10 min-w-72 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none ring-emerald-500 transition focus:ring-2"
              type="password"
              placeholder="관리자 키"
              value={adminApiKey}
              onChange={(event) => setAdminApiKey(event.target.value)}
            />
            <button
              type="button"
              className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              disabled={isLoading}
              onClick={() => void loadUsageAction()}
            >
              새로고침
            </button>
          </div>
        </header>

        {errorMessage && (
          <p className="rounded-lg border border-rose-900 bg-rose-950 px-3 py-2 text-sm text-rose-300">
            {errorMessage}
          </p>
        )}

        <section className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-semibold text-slate-500">관리자 접속 IP</p>
            <p className="mt-2 break-all font-mono text-lg font-semibold">
              {adminIpAddress}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-semibold text-slate-500">전체 AI 요청</p>
            <p className="mt-2 text-xl font-semibold">
              {usage
                ? formatLimitText(
                    usage.daily_request_count,
                    usage.daily_request_limit
                  )
                : "-"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-semibold text-slate-500">IP별 한도</p>
            <p className="mt-2 text-xl font-semibold">
              {usage?.daily_request_limit_per_ip === 0
                ? "무제한"
                : usage?.daily_request_limit_per_ip.toLocaleString("ko-KR") ?? "-"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-semibold text-slate-500">접속 IP 수</p>
            <p className="mt-2 text-xl font-semibold">
              {usage ? ipUsageDisplayRowList.length.toLocaleString("ko-KR") : "-"}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
            <h2 className="text-sm font-semibold">IP별 사용량</h2>
            <button
              type="button"
              className="rounded-md border border-rose-800 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-950 disabled:opacity-60"
              disabled={isLoading || !usage}
              onClick={() => void resetAllUsageAction()}
            >
              전체 초기화
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-slate-950 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">IP 구분</th>
                  <th className="px-4 py-3 font-semibold">AI 요청</th>
                  <th className="px-4 py-3 font-semibold">접속</th>
                  <th className="px-4 py-3 font-semibold">마지막 접속</th>
                  <th className="px-4 py-3 font-semibold">AI 사용량 조절</th>
                </tr>
              </thead>
              <tbody>
                {ipUsageDisplayRowList.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                      표시할 IP가 없습니다.
                    </td>
                  </tr>
                )}

                {ipUsageDisplayRowList.map((ipUsage) => (
                  <tr
                    key={ipUsage.ip_address}
                    className="border-t border-slate-800"
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-slate-200">
                          {ipUsage.ip_address}
                        </span>
                        <span
                          className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${ipUsage.ipBadgeClassName}`}
                        >
                          {ipUsage.ipBadgeLabel}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {formatLimitText(
                        ipUsage.daily_request_count,
                        ipUsage.daily_request_limit
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {ipUsage.access_count.toLocaleString("ko-KR")}
                    </td>
                    <td className="px-4 py-3">
                      {formatLastAccessAt(ipUsage.last_access_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          className="h-9 w-24 rounded-md border border-slate-700 bg-slate-950 px-2 text-sm text-white outline-none ring-emerald-500 transition focus:ring-2"
                          type="number"
                          min={0}
                          step={1}
                          value={requestCountTextByIp[ipUsage.ip_address] ?? ""}
                          onChange={(event) =>
                            setRequestCountTextByIp((previousMap) => ({
                              ...previousMap,
                              [ipUsage.ip_address]: event.target.value,
                            }))
                          }
                        />
                        <button
                          type="button"
                          className="h-9 rounded-md border border-emerald-700 px-3 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-950 disabled:opacity-60"
                          disabled={isLoading}
                          onClick={() =>
                            void updateIpRequestCountAction(ipUsage.ip_address)
                          }
                        >
                          적용
                        </button>
                        <button
                          type="button"
                          className="h-9 rounded-md border border-slate-700 px-3 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-60"
                          disabled={isLoading}
                          onClick={() => void resetIpUsageAction(ipUsage.ip_address)}
                        >
                          초기화
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
