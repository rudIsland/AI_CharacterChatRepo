"use client";

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
    selectedAiModelProvider,
    userMessageText,
    isLoadingCharacterList,
    isOpeningSession,
    isSendingMessage,
    usedTokenCount,
    tokenLimitCount,
    dailyRequestUsage,
    errorMessage,
    setSelectedAiModelProvider,
    setUserMessageText,
    selectCharacterAction,
    sendMessageAction,
  } = useChatScreenState();

  const isChatInputDisabled =
    !selectedCharacterId ||
    !selectedAiModelProvider ||
    isOpeningSession ||
    isSendingMessage ||
    usedTokenCount >= tokenLimitCount;

  return (
    <main className="h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_left,_#1e293b,_transparent_55%),radial-gradient(circle_at_bottom_right,_#0f172a,_transparent_45%),#020617] px-3 py-3 sm:px-4">
      <section className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-panel sm:p-4">
        <ChatCharacterList
          characterList={characterList}
          selectedCharacterId={selectedCharacterId}
          isLoadingCharacterList={isLoadingCharacterList}
          buildCharacterImageUrl={buildCharacterImageUrl}
          onCharacterSelect={selectCharacterAction}
        />

        <section className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
          <ChatCharacterProfile
            selectedCharacter={selectedCharacter}
            selectedCharacterImageUrl={selectedCharacterImageUrl}
          />

          <section className="flex min-h-0 flex-col rounded-2xl border border-slate-800 bg-slate-900 p-3">
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
              selectedAiModelProvider={selectedAiModelProvider}
              userMessageText={userMessageText}
              isOpeningSession={isOpeningSession}
              isSendingMessage={isSendingMessage}
              isChatInputDisabled={isChatInputDisabled}
              onAiModelProviderChange={setSelectedAiModelProvider}
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
