"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  createChatMessage,
  createChatSession,
  fetchAiModelOptionList,
  fetchCharacterList,
  fetchChatMessageList,
  listChatSessionByGuestId,
} from "@/features/chat/chat-api-client";
import {
  AiModelOption,
  AiModelProvider,
  CharacterSummary,
  ChatMessage,
  ChatSessionSummary,
} from "@/features/chat/chat-types";

const guestIdStorageKey = "guest_id";
const defaultAiModelOptionList: AiModelOption[] = [
  {
    ai_model_provider: "gpt",
    ai_model_name: "gpt-4.1-mini",
    ai_model_label: "GPT (gpt-4.1-mini)",
  },
  {
    ai_model_provider: "gemini",
    ai_model_name: "gemini-2.0-flash",
    ai_model_label: "Gemini (gemini-2.0-flash)",
  },
  {
    ai_model_provider: "local_ai",
    ai_model_name: "llama3.1",
    ai_model_label: "Local AI (llama3.1)",
  },
];

type ChatMessageView = ChatMessage & {
  isPending?: boolean;
};

function createGuestId(): string {
  return `guest_${crypto.randomUUID().slice(0, 8)}`;
}

function getStoredGuestId(): string {
  if (typeof window === "undefined") {
    return "guest_local";
  }

  const foundGuestId = window.localStorage.getItem(guestIdStorageKey);
  if (foundGuestId) {
    return foundGuestId;
  }

  const newGuestId = createGuestId();
  window.localStorage.setItem(guestIdStorageKey, newGuestId);
  return newGuestId;
}

function formatCreatedAt(createdAt: string): string {
  const date = new Date(createdAt);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatSessionCreatedAt(createdAt: string): string {
  const date = new Date(createdAt);
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

export function ChatScreen() {
  const [characterList, setCharacterList] = useState<CharacterSummary[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [chatSessionList, setChatSessionList] = useState<ChatSessionSummary[]>([]);
  const [guestId, setGuestId] = useState("guest_local");
  const [messageList, setMessageList] = useState<ChatMessageView[]>([]);
  const [aiModelOptionList, setAiModelOptionList] = useState<AiModelOption[]>(
    defaultAiModelOptionList
  );
  const [selectedAiModelProvider, setSelectedAiModelProvider] =
    useState<AiModelProvider>("gpt");
  const [userMessageText, setUserMessageText] = useState("");
  const [isLoadingCharacterList, setIsLoadingCharacterList] = useState(true);
  const [isLoadingSessionList, setIsLoadingSessionList] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedCharacter = useMemo(
    () =>
      characterList.find(
        (character) => character.character_id === selectedCharacterId
      ) ?? null,
    [characterList, selectedCharacterId]
  );
  const aiModelLabelMap = useMemo<Record<AiModelProvider, string>>(() => {
    const fallbackLabelMap: Record<AiModelProvider, string> = {
      gpt: "GPT",
      gemini: "Gemini",
      local_ai: "Local AI",
    };
    for (const aiModelOption of aiModelOptionList) {
      fallbackLabelMap[aiModelOption.ai_model_provider] = aiModelOption.ai_model_label;
    }
    return fallbackLabelMap;
  }, [aiModelOptionList]);

  const formatAiModelProviderLabel = (aiModelProvider: AiModelProvider): string => {
    return aiModelLabelMap[aiModelProvider] ?? aiModelProvider;
  };

  useEffect(() => {
    const localGuestId = getStoredGuestId();
    setGuestId(localGuestId);
  }, []);

  useEffect(() => {
    const loadAiModelOptionList = async () => {
      try {
        const aiModelOptionListResponse = await fetchAiModelOptionList();
        setAiModelOptionList(aiModelOptionListResponse.ai_model_option_list);
      } catch (error) {
        setAiModelOptionList(defaultAiModelOptionList);
      }
    };

    void loadAiModelOptionList();
  }, []);

  useEffect(() => {
    const loadCharacterList = async () => {
      try {
        setIsLoadingCharacterList(true);
        const loadedCharacterList = await fetchCharacterList();
        setCharacterList(loadedCharacterList);

        if (loadedCharacterList.length > 0) {
          setSelectedCharacterId(loadedCharacterList[0].character_id);
        }
      } catch (error) {
        setErrorMessage("Failed to load characters. Check server status.");
      } finally {
        setIsLoadingCharacterList(false);
      }
    };

    void loadCharacterList();
  }, []);

  const loadSessionListAction = async (
    guestIdValue: string,
    characterIdValue: string
  ) => {
    if (!characterIdValue) {
      setChatSessionList([]);
      return;
    }

    try {
      setIsLoadingSessionList(true);
      const guestSessionList = await listChatSessionByGuestId(guestIdValue);
      const filteredSessionList = guestSessionList.filter(
        (session) => session.character_id === characterIdValue
      );
      setChatSessionList(filteredSessionList);
    } catch (error) {
      setErrorMessage("Failed to load session list.");
    } finally {
      setIsLoadingSessionList(false);
    }
  };

  useEffect(() => {
    void loadSessionListAction(guestId, selectedCharacterId);
  }, [guestId, selectedCharacterId]);

  const openSessionAction = async (chatSession: ChatSessionSummary) => {
    try {
      setErrorMessage(null);
      setActiveSessionId(chatSession.chat_session_id);
      setSelectedAiModelProvider(chatSession.ai_model_provider);
      const loadedMessages = await fetchChatMessageList(chatSession.chat_session_id);
      setMessageList(loadedMessages.message_list);
    } catch (error) {
      setErrorMessage("Failed to load messages.");
    }
  };

  const startSessionAction = async () => {
    if (!selectedCharacterId) {
      return;
    }

    try {
      setErrorMessage(null);
      const createdSession = await createChatSession(
        selectedCharacterId,
        guestId,
        selectedAiModelProvider
      );
      setActiveSessionId(createdSession.chat_session_id);
      setSelectedAiModelProvider(createdSession.ai_model_provider);

      const loadedMessages = await fetchChatMessageList(
        createdSession.chat_session_id
      );
      setMessageList(loadedMessages.message_list);
      await loadSessionListAction(guestId, selectedCharacterId);
    } catch (error) {
      setErrorMessage("Failed to start chat session.");
    }
  };

  const selectCharacterAction = (characterId: string) => {
    setSelectedCharacterId(characterId);
    setActiveSessionId(null);
    setMessageList([]);
    setErrorMessage(null);
  };

  const sendMessageAction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanMessageText = userMessageText.trim();
    if (!cleanMessageText || !selectedCharacterId) {
      return;
    }

    try {
      setIsSendingMessage(true);
      setErrorMessage(null);

      const optimisticCreatedAt = new Date().toISOString();
      const optimisticUserMessageId = `temp-user-${Date.now()}`;
      const optimisticAssistantMessageId = `temp-assistant-${Date.now()}`;

      const optimisticUserMessage: ChatMessageView = {
        message_id: optimisticUserMessageId,
        role: "user",
        message_text: cleanMessageText,
        created_at: optimisticCreatedAt,
      };
      const optimisticAssistantMessage: ChatMessageView = {
        message_id: optimisticAssistantMessageId,
        role: "assistant",
        message_text: "...",
        created_at: optimisticCreatedAt,
        isPending: true,
      };
      setMessageList((previousMessageList) => [
        ...previousMessageList,
        optimisticUserMessage,
        optimisticAssistantMessage,
      ]);
      setUserMessageText("");

      let currentSessionId = activeSessionId;
      if (!currentSessionId) {
        const createdSession = await createChatSession(
          selectedCharacterId,
          guestId,
          selectedAiModelProvider
        );
        currentSessionId = createdSession.chat_session_id;
        setActiveSessionId(currentSessionId);
        setSelectedAiModelProvider(createdSession.ai_model_provider);
        await loadSessionListAction(guestId, selectedCharacterId);
      }

      const createdMessage = await createChatMessage(
        currentSessionId,
        cleanMessageText,
        selectedAiModelProvider
      );
      setMessageList((previousMessageList) =>
        previousMessageList.map((message) => {
          if (message.message_id === optimisticUserMessageId) {
            return createdMessage.user_message;
          }
          if (message.message_id === optimisticAssistantMessageId) {
            return createdMessage.assistant_message;
          }
          return message;
        })
      );
    } catch (error) {
      setErrorMessage("Failed to send message. Try again.");
      setMessageList((previousMessageList) =>
        previousMessageList.map((message) => {
          if (message.isPending) {
            return {
              ...message,
              message_text: "Reply failed. Please try again.",
              isPending: false,
            };
          }
          return message;
        })
      );
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dff3ef,_transparent_55%),radial-gradient(circle_at_bottom_right,_#dbeafe,_transparent_45%),#f4f7fb] px-4 py-8 sm:px-8">
      <section className="mx-auto grid w-full max-w-6xl gap-4 rounded-3xl border border-slate-200 bg-card p-4 shadow-panel sm:grid-cols-[280px_1fr] sm:p-6">
        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h1 className="text-lg font-semibold text-slate-900">Character Chat</h1>
          <p className="mt-1 text-sm text-slate-600">
            Stack: TypeScript + React + Next.js + Tailwind
          </p>

          <div className="mt-4 space-y-2">
            {isLoadingCharacterList && (
              <p className="text-sm text-slate-500">Loading characters...</p>
            )}

            {!isLoadingCharacterList &&
              characterList.map((character) => (
                <button
                  key={character.character_id}
                  type="button"
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                    character.character_id === selectedCharacterId
                      ? "border-accent bg-emerald-50 text-slate-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                  onClick={() => selectCharacterAction(character.character_id)}
                >
                  <p className="font-medium">{character.character_name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {character.character_description}
                  </p>
                </button>
              ))}
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-2">
            <p className="px-1 text-xs font-semibold text-slate-600">Session List</p>
            {isLoadingSessionList && (
              <p className="px-1 py-2 text-xs text-slate-500">Loading sessions...</p>
            )}
            {!isLoadingSessionList && chatSessionList.length === 0 && (
              <p className="px-1 py-2 text-xs text-slate-500">
                No saved session for this character.
              </p>
            )}
            <div className="mt-1 max-h-36 space-y-1 overflow-y-auto">
              {chatSessionList.map((session, index) => {
                const isActive = activeSessionId === session.chat_session_id;
                return (
                  <button
                    key={session.chat_session_id}
                    type="button"
                    className={`w-full rounded-lg border px-2 py-2 text-left text-xs transition ${
                      isActive
                        ? "border-accent bg-emerald-50 text-slate-900"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                    }`}
                    onClick={() => void openSessionAction(session)}
                  >
                    <p className="font-semibold">
                      Session {chatSessionList.length - index}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formatSessionCreatedAt(session.created_at)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formatAiModelProviderLabel(session.ai_model_provider)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className="mt-4 w-full rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            onClick={() => void startSessionAction()}
            disabled={!selectedCharacterId}
          >
            Start New Session
          </button>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <header className="border-b border-slate-200 pb-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {selectedCharacter?.character_name ?? "No Character Selected"}
            </h2>
            <p className="text-sm text-slate-600">
              {selectedCharacter?.character_description ??
                "Select a character from the left panel."}
            </p>
          </header>

          <div className="chat-scroll mt-3 h-[460px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
            {messageList.length === 0 && (
              <p className="text-sm text-slate-500">
                Start a session and send your first message.
              </p>
            )}

            <div className="space-y-3">
              {messageList.map((message) => (
                <article
                  key={message.message_id}
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    message.role === "user"
                      ? "ml-auto bg-slate-900 text-white"
                      : "mr-auto border border-emerald-200 bg-emerald-50 text-slate-800"
                  } ${message.isPending ? "animate-pulse" : ""}`}
                >
                  <p>{message.message_text}</p>
                  <p
                    className={`mt-1 text-[11px] ${
                      message.role === "user" ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {message.isPending ? "waiting..." : formatCreatedAt(message.created_at)}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => void sendMessageAction(event)}
          >
            <select
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-accent transition focus:ring-2 sm:w-60"
              value={selectedAiModelProvider}
              onChange={(event) =>
                setSelectedAiModelProvider(event.target.value as AiModelProvider)
              }
              disabled={!selectedCharacterId || isSendingMessage}
            >
              {aiModelOptionList.map((aiModelOption) => (
                <option
                  key={aiModelOption.ai_model_provider}
                  value={aiModelOption.ai_model_provider}
                >
                  {aiModelOption.ai_model_label}
                </option>
              ))}
            </select>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-accent transition focus:ring-2"
              placeholder="Type your message..."
              value={userMessageText}
              onChange={(event) => setUserMessageText(event.target.value)}
              disabled={!selectedCharacterId || isSendingMessage}
            />
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              disabled={!selectedCharacterId || isSendingMessage}
            >
              {isSendingMessage ? "Sending..." : "Send"}
            </button>
          </form>

          {errorMessage && (
            <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </p>
          )}
        </section>
      </section>
    </main>
  );
}
