export function formatCreatedAt(createdAt: string): string {
  // 메시지 말풍선에는 시:분만 짧게 보여줍니다.
  const date = new Date(createdAt);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatSessionCreatedAt(createdAt: string): string {
  // 세션 목록에는 월/일만 보여줘서 목록을 작게 유지합니다.
  const date = new Date(createdAt);
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}
