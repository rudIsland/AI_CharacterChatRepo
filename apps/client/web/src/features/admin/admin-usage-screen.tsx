"use client";

import { useMemo, useState } from "react";

import {
  fetchAdminDailyRequestUsage,
  resetAdminDailyRequestIpUsage,
  resetAdminDailyRequestUsage,
} from "@/features/chat/chat-api-client";
import type { AdminDailyRequestUsageResponse } from "@/features/chat/chat-types";

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

export function AdminUsageScreen() {
  const [adminApiKey, setAdminApiKey] = useState("");
  const [usage, setUsage] = useState<AdminDailyRequestUsageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sortedIpUsageList = useMemo(() => {
    return [...(usage?.ip_usage_list ?? [])].sort((left, right) => {
      return right.access_count - left.access_count;
    });
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
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "사용량 정보를 불러오지 못했습니다."
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
        error instanceof Error ? error.message : "전체 사용량 초기화에 실패했습니다."
      );
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
      setErrorMessage(
        error instanceof Error ? error.message : "IP 사용량 초기화에 실패했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

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

        <section className="grid gap-3 md:grid-cols-3">
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
            <p className="text-xs font-semibold text-slate-500">접속 IP</p>
            <p className="mt-2 text-xl font-semibold">
              {usage ? sortedIpUsageList.length.toLocaleString("ko-KR") : "-"}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
            <h2 className="text-sm font-semibold">IP 사용량</h2>
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
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="bg-slate-950 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">IP</th>
                  <th className="px-4 py-3 font-semibold">AI 요청</th>
                  <th className="px-4 py-3 font-semibold">접속</th>
                  <th className="px-4 py-3 font-semibold">마지막 접속</th>
                  <th className="px-4 py-3 font-semibold">관리</th>
                </tr>
              </thead>
              <tbody>
                {sortedIpUsageList.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                      표시할 IP가 없습니다.
                    </td>
                  </tr>
                )}

                {sortedIpUsageList.map((ipUsage) => (
                  <tr
                    key={ipUsage.ip_address}
                    className="border-t border-slate-800"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-200">
                      {ipUsage.ip_address}
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
                      <button
                        type="button"
                        className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-60"
                        disabled={isLoading}
                        onClick={() => void resetIpUsageAction(ipUsage.ip_address)}
                      >
                        초기화
                      </button>
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
