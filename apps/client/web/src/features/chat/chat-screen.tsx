"use client";

import { AiModelProvider } from "@/features/chat/chat-types";
import { formatCreatedAt } from "@/features/chat/chat-format";
import { useChatScreenState } from "@/features/chat/chat-screen-state";

function AiModelIcon({ provider }: { provider?: string }) {
  if (provider === "gemini") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
    );
  }
  if (provider === "local_ai") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>
    );
  }
  // 기본 아이콘 (GPT 등)
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
  );
}

function formatTokenCount(tokenCount: number): string {
  return tokenCount.toLocaleString("ko-KR");
}

export function ChatScreen() {
  // 화면 동작은 useChatScreenState가 담당하고, 이 파일은 배치와 표시만 담당합니다.
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

  const tokenUsagePercent =
    tokenLimitCount > 0
      ? Math.min(100, Math.round((usedTokenCount / tokenLimitCount) * 100))
      : 0;

  return (
    <main className="h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_left,_#1e293b,_transparent_55%),radial-gradient(circle_at_bottom_right,_#0f172a,_transparent_45%),#020617] px-3 py-3 sm:px-4">
      <section className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-panel sm:p-4">

        {/* 위쪽 영역: 캐릭터가 늘어나도 가로 스크롤로 선택할 수 있습니다. */}
        <section className="shrink-0 rounded-2xl border border-slate-800 bg-slate-800/50 p-2">
          {isLoadingCharacterList && (
            <p className="text-sm text-slate-400">캐릭터를 불러오는 중입니다...</p>
          )}

          {!isLoadingCharacterList && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {characterList.map((character) => {
                const isSelected = character.character_id === selectedCharacterId;
                return (
                  <button
                    key={character.character_id}
                    type="button"
                    className={`flex min-w-48 items-center gap-2 rounded-xl border p-2 text-left transition ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-950/30 text-white"
                        : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600 hover:bg-slate-700"
                    }`}
                    onClick={() => selectCharacterAction(character.character_id)}
                  >
                    <img
                      src={buildCharacterImageUrl(character)}
                      alt={`${character.character_name} 초상화`}
                      className="h-10 w-10 shrink-0 rounded-lg border border-slate-700 bg-slate-900 object-cover"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">
                        {character.character_name}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-xs text-slate-400">
                        {character.character_description}
                      </span>
                      <span className="mt-1 block text-[11px] text-slate-500">
                        {character.character_gender} · {character.character_age_range}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* 왼쪽 영역: 선택한 캐릭터의 이미지와 설정 정보를 보여줍니다. */}
          <aside className="min-h-0 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-800/50 p-3">
            {selectedCharacter && selectedCharacterImageUrl ? (
              <div className="flex min-h-0 flex-col gap-3">
                <img
                  src={selectedCharacterImageUrl}
                  alt={`${selectedCharacter.character_name} 초상화`}
                  className="aspect-square w-full max-h-[34vh] rounded-xl border border-slate-700 bg-slate-900 object-cover"
                />

                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    캐릭터
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-white">
                    {selectedCharacter.character_name}
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-slate-300">
                    {selectedCharacter.character_description}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {selectedCharacter.character_gender} · {selectedCharacter.character_age_range}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-2.5">
                  <p className="text-xs font-semibold text-slate-400">배경</p>
                  <p className="mt-1 text-sm leading-5 text-slate-300">
                    {selectedCharacter.character_background}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-2.5">
                  <p className="text-xs font-semibold text-slate-400">성격</p>
                  <p className="mt-1 text-sm leading-5 text-slate-300">
                    {selectedCharacter.character_personality}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">캐릭터를 선택해 주세요.</p>
            )}
          </aside>

          {/* 오른쪽 영역: 선택한 캐릭터와 이어서 대화하는 채팅창입니다. */}
          <section className="flex min-h-0 flex-col rounded-2xl border border-slate-800 bg-slate-900 p-3">
            <header className="shrink-0 border-b border-slate-800 pb-2">
              <h2 className="text-lg font-semibold text-white">
                {selectedCharacter?.character_name ?? "선택된 캐릭터 없음"}
              </h2>
              <p className="text-sm text-slate-400">
                {isOpeningSession
                  ? "이전 메시지를 불러오는 중입니다..."
                  : "마지막 대화에서 이어서 이야기해 보세요."}
              </p>
            </header>

            <div className="relative mt-3 min-h-0 flex-1">
              <div className="chat-scroll flex h-full min-h-0 flex-col overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/50 p-3 pb-9 shadow-inner">
                {!isOpeningSession && messageList.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center space-y-3 opacity-60">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800"
                      aria-hidden="true"
                    />
                    <p className="text-sm font-medium text-slate-400">
                      이 캐릭터에게 첫 메시지를 보내 보세요.
                    </p>
                  </div>
                )}

                {isOpeningSession && (
                  <p className="text-sm text-slate-400">대화를 불러오는 중입니다...</p>
                )}

                <div className="flex flex-col space-y-3">
                  {/* user 메시지는 오른쪽, assistant 메시지는 왼쪽에 배치합니다. */}
                  {messageList.map((message) => {
                    return (
                      <article
                        key={message.message_id}
                        className={`flex w-fit max-w-[82%] flex-col rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed shadow-sm ${
                          message.role === "user"
                            ? "ml-auto rounded-br-sm bg-emerald-600 text-white"
                            : "mr-auto rounded-bl-sm border border-slate-700 bg-slate-800 text-slate-200"
                        } ${message.isPending ? "animate-pulse" : ""}`}
                      >
                        <p className="whitespace-pre-wrap break-words">
                          {message.message_text}
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-slate-400">
                          {message.isPending
                            ? "답변 대기 중..."
                            : formatCreatedAt(message.created_at)}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </div>

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
            </div>

            <form
              className="mt-3 flex shrink-0 flex-row items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessageAction();
              }}
            >
              {/* AI 모델 목록을 아이콘 형태의 선택 버튼으로 보여줍니다. */}
              <div
                className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-300 transition hover:bg-slate-700 focus-within:ring-2 focus-within:ring-emerald-500"
                title="AI 모델 선택"
              >
                <span className="pointer-events-none absolute flex items-center justify-center">
                  <AiModelIcon provider={selectedAiModelProvider} />
                </span>
                <select
                  className="h-full w-full cursor-pointer appearance-none bg-transparent text-transparent outline-none [&>option]:text-slate-900"
                  value={selectedAiModelProvider}
                  onChange={(event) =>
                    setSelectedAiModelProvider(event.target.value as AiModelProvider)
                  }
                  disabled={isOpeningSession || isSendingMessage || aiModelOptionList.length === 0}
                >
                  {aiModelOptionList.map((aiModelOption) => (
                    <option key={aiModelOption.ai_model_provider} value={aiModelOption.ai_model_provider}>
                      {aiModelOption.ai_model_label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex-1">
                <input
                  className="h-10 w-full rounded-full border border-slate-700 bg-slate-800 pl-4 pr-20 text-sm text-white outline-none ring-emerald-500 transition focus:bg-slate-700 focus:ring-2 placeholder:text-slate-500"
                  placeholder="메시지를 입력하세요..."
                  value={userMessageText}
                  onChange={(event) => setUserMessageText(event.target.value)}
                  disabled={isChatInputDisabled}
                />
                <button
                  type="submit"
                  className="absolute bottom-1 right-1 top-1 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                  disabled={isChatInputDisabled}
                >
                  {isSendingMessage ? "..." : "보내기"}
                </button>
              </div>
            </form>

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
