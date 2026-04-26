type ChatTokenUsageProps = {
  usedTokenCount: number;
  tokenLimitCount: number;
};

function formatTokenCount(tokenCount: number): string {
  return tokenCount.toLocaleString("ko-KR");
}

export function ChatTokenUsage({
  usedTokenCount,
  tokenLimitCount,
}: ChatTokenUsageProps) {
  const tokenUsagePercent =
    tokenLimitCount > 0
      ? Math.min(100, Math.round((usedTokenCount / tokenLimitCount) * 100))
      : 0;

  return (
    <div className="pointer-events-none absolute bottom-2 right-3 z-10 w-44 rounded-md border border-slate-700 bg-slate-950/95 px-2 py-1.5 text-[11px] font-medium text-slate-400 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span>토큰</span>
        <span>
          {formatTokenCount(usedTokenCount)} / {formatTokenCount(tokenLimitCount)}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width]"
          style={{ width: `${tokenUsagePercent}%` }}
        />
      </div>
    </div>
  );
}
