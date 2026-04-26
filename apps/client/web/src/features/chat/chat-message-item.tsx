import { formatCreatedAt } from "@/features/chat/chat-format";
import type { ChatMessageView } from "@/features/chat/chat-screen-state";

type ChatMessageItemProps = {
  message: ChatMessageView;
};

export function ChatMessageItem({ message }: ChatMessageItemProps) {
  return (
    <article
      className={`flex w-fit max-w-[82%] flex-col rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed shadow-sm ${
        message.role === "user"
          ? "ml-auto rounded-br-sm bg-emerald-600 text-white"
          : "mr-auto rounded-bl-sm border border-slate-700 bg-slate-800 text-slate-200"
      } ${message.isPending ? "animate-pulse" : ""}`}
    >
      <p className="whitespace-pre-wrap break-words">{message.message_text}</p>
      <p className="mt-1 text-[11px] font-medium text-slate-400">
        {message.isPending ? "답변 대기 중..." : formatCreatedAt(message.created_at)}
      </p>
    </article>
  );
}
