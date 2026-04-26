import { useEffect, useRef } from "react";

import { ChatMessageItem } from "@/features/chat/chat-message-item";
import type { ChatMessageView } from "@/features/chat/chat-screen-state";

type ChatMessageListProps = {
  messageList: ChatMessageView[];
  isOpeningSession: boolean;
};

export function ChatMessageList({
  messageList,
  isOpeningSession,
}: ChatMessageListProps) {
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({
      block: "end",
      behavior: "smooth",
    });
  }, [messageList, isOpeningSession]);

  return (
    <div className="chat-scroll flex h-full min-h-0 flex-col overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/50 p-2 pb-8 shadow-inner sm:rounded-2xl sm:p-3 sm:pb-9">
      {!isOpeningSession && messageList.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center space-y-3 opacity-60">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-slate-400">
            캐릭터에게 첫 메시지를 보내 보세요.
          </p>
        </div>
      )}

      {isOpeningSession && (
        <p className="text-sm text-slate-400">
          대화를 불러오는 중입니다...
        </p>
      )}

      <div className="flex flex-col space-y-3">
        {messageList.map((message) => (
          <ChatMessageItem key={message.message_id} message={message} />
        ))}
        <div ref={messageEndRef} aria-hidden="true" />
      </div>
    </div>
  );
}
