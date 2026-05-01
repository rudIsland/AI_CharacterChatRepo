"use client";

import Link from "next/link";

import { ChatCharacterList } from "@/features/chat/chat-character-list";
import { ChatCharacterProfile } from "@/features/chat/chat-character-profile";
import { ChatDailyRequestUsage } from "@/features/chat/chat-daily-request-usage";
import { ChatInputForm } from "@/features/chat/chat-input-form";
import { ChatMessageList } from "@/features/chat/chat-message-list";
import { useChatScreenState } from "@/features/chat/chat-screen-state";
import { ChatTokenUsage } from "@/features/chat/chat-token-usage";

export function ChatScreen() {
  const {
    characterList,
    selectedCharacter,
    selectedCharacterImageUrl,
    buildCharacterImageUrl,
    selectedCharacterId,
    messageList,
    aiModelOptionList,
    selectedAiModelId,
    userMessageText,
    isLoadingCharacterList,
    isServerWakeNoticeVisible,
    isOpeningSession,
    isSendingMessage,
    usedTokenCount,
    tokenLimitCount,
    dailyRequestUsage,
    errorMessage,
    setSelectedAiModelId,
    setUserMessageText,
    selectCharacterAction,
    sendMessageAction,
  } = useChatScreenState();

  const isChatInputDisabled =
    !selectedCharacterId ||
    !selectedAiModelId ||
    isOpeningSession ||
    isSendingMessage ||
    usedTokenCount >= tokenLimitCount;

  return (
    <main className="min-h-dvh overflow-y-auto bg-[radial-gradient(circle_at_top_left,_#1e293b,_transparent_55%),radial-gradient(circle_at_bottom_right,_#0f172a,_transparent_45%),#020617] px-2 py-2 sm:px-4 sm:py-3">
      <Link
        href="/admin/usage"
        className="fixed right-4 top-4 z-50 rounded-md border border-slate-700/50 bg-slate-800/50 px-3 py-1.5 text-xs font-medium text-slate-300 shadow-sm backdrop-blur-md transition-colors hover:bg-slate-700 hover:text-white"
      >
        관리자 접속
      </Link>

      <section className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-panel sm:min-h-[calc(100dvh-1.5rem)] sm:gap-3 sm:rounded-2xl sm:p-4">
        <ChatCharacterList
          characterList={characterList}
          selectedCharacterId={selectedCharacterId}
          isLoadingCharacterList={isLoadingCharacterList}
          buildCharacterImageUrl={buildCharacterImageUrl}
          onCharacterSelect={selectCharacterAction}
        />

        {isServerWakeNoticeVisible && (
          <section className="shrink-0 rounded-xl border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-amber-100">
            <p className="text-sm font-semibold">서버를 깨우는 중입니다.</p>
            <p className="mt-1 text-xs leading-5 text-amber-100/80">
              Render 서버는 첫 접속 시 응답까지 약 1분 정도 걸릴 수 있습니다.
              잠시만 기다려 주세요.
            </p>
          </section>
        )}

        <section className="grid min-h-[560px] flex-1 grid-rows-[minmax(0,1fr)] gap-2 sm:min-h-[640px] sm:gap-3 md:grid-rows-[auto_minmax(0,1fr)] lg:min-h-0 lg:grid-cols-[280px_minmax(0,1fr)] lg:grid-rows-1">
          <div className="hidden md:block lg:min-h-0">
            <ChatCharacterProfile
              selectedCharacter={selectedCharacter}
              selectedCharacterImageUrl={selectedCharacterImageUrl}
            />
          </div>

          <section className="flex min-h-0 flex-col rounded-xl border border-slate-800 bg-slate-900 p-2 sm:rounded-2xl sm:p-3">
            <header className="shrink-0 border-b border-slate-800 pb-2">
              <h2 className="text-lg font-semibold text-white">
                {selectedCharacter?.character_name ?? "선택된 캐릭터 없음"}
              </h2>
              <p className="text-sm text-slate-400">
                {isOpeningSession
                  ? "이전 메시지를 불러오는 중입니다..."
                  : "마지막 대화에 이어서 이야기해 보세요."}
              </p>
              <ChatDailyRequestUsage dailyRequestUsage={dailyRequestUsage} />
            </header>

            <div className="relative mt-3 min-h-0 flex-1">
              <ChatMessageList
                messageList={messageList}
                isOpeningSession={isOpeningSession}
              />
              <ChatTokenUsage
                usedTokenCount={usedTokenCount}
                tokenLimitCount={tokenLimitCount}
              />
            </div>

            <ChatInputForm
              aiModelOptionList={aiModelOptionList}
              selectedAiModelId={selectedAiModelId}
              userMessageText={userMessageText}
              isOpeningSession={isOpeningSession}
              isSendingMessage={isSendingMessage}
              isChatInputDisabled={isChatInputDisabled}
              onAiModelIdChange={setSelectedAiModelId}
              onUserMessageChange={setUserMessageText}
              onMessageSend={sendMessageAction}
            />

            {errorMessage && (
              <p className="mt-2 rounded-lg border border-rose-900 bg-rose-950 px-3 py-2 text-sm text-rose-300">
                {errorMessage}
              </p>
            )}
          </section>
        </section>
      </section>
    </main>
  );
}
