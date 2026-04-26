import type { KeyboardEvent } from "react";

import { ChatAiModelSelect } from "@/features/chat/chat-ai-model-select";
import { USER_MESSAGE_MAX_LENGTH } from "@/features/chat/chat-types";
import type { AiModelOption, AiModelProvider } from "@/features/chat/chat-types";

type ChatInputFormProps = {
  aiModelOptionList: AiModelOption[];
  selectedAiModelProvider: AiModelProvider | "";
  userMessageText: string;
  isOpeningSession: boolean;
  isSendingMessage: boolean;
  isChatInputDisabled: boolean;
  onAiModelProviderChange: (aiModelProvider: AiModelProvider) => void;
  onUserMessageChange: (messageText: string) => void;
  onMessageSend: () => void;
};

export function ChatInputForm({
  aiModelOptionList,
  selectedAiModelProvider,
  userMessageText,
  isOpeningSession,
  isSendingMessage,
  isChatInputDisabled,
  onAiModelProviderChange,
  onUserMessageChange,
  onMessageSend,
}: ChatInputFormProps) {
  const userMessageKeyDownHandle = (
    event: KeyboardEvent<HTMLTextAreaElement>
  ) => {
    const shouldInsertLineBreak =
      event.key === "Enter" && (event.shiftKey || event.altKey);

    if (
      event.key !== "Enter" ||
      shouldInsertLineBreak ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    event.preventDefault();
    onMessageSend();
  };

  return (
    <form
      className="mt-3 flex shrink-0 flex-col gap-1"
      onSubmit={(event) => {
        event.preventDefault();
        onMessageSend();
      }}
    >
      <div className="flex flex-row items-end gap-2">
        <ChatAiModelSelect
          aiModelOptionList={aiModelOptionList}
          selectedAiModelProvider={selectedAiModelProvider}
          isDisabled={
            isOpeningSession || isSendingMessage || aiModelOptionList.length === 0
          }
          onAiModelProviderChange={onAiModelProviderChange}
        />

        <textarea
          className="max-h-28 min-h-10 flex-1 resize-none rounded-2xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm leading-5 text-white outline-none ring-emerald-500 transition focus:bg-slate-700 focus:ring-2 placeholder:text-slate-500"
          placeholder="메시지를 입력하세요..."
          value={userMessageText}
          onChange={(event) => onUserMessageChange(event.target.value)}
          onKeyDown={userMessageKeyDownHandle}
          rows={1}
          maxLength={USER_MESSAGE_MAX_LENGTH}
          disabled={isChatInputDisabled}
        />
        <button
          type="submit"
          className="h-10 shrink-0 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          disabled={isChatInputDisabled}
        >
          {isSendingMessage ? "..." : "보내기"}
        </button>
      </div>
      <p className="self-end text-xs font-medium text-slate-500">
        {userMessageText.length} / {USER_MESSAGE_MAX_LENGTH}
      </p>
    </form>
  );
}
