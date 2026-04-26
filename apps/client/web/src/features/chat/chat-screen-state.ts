import { useEffect, useMemo, useRef, useState } from "react";

import {
  buildApiAssetUrl,
  createChatMessage,
  createChatSession,
  fetchDailyRequestUsage,
  fetchAiModelOptionList,
  fetchCharacterList,
  fetchChatMessageList,
} from "@/features/chat/chat-api-client";
import type {
  AiModelOption,
  AiModelProvider,
  CharacterSummary,
  ChatMessage,
  ClientDailyRequestUsageResponse,
} from "@/features/chat/chat-types";

const guestIdStorageKey = "guest_id";
const defaultTokenLimitCount = 50_000;
const serverWakeNoticeDelayMs = 2_500;

export type ChatMessageView = ChatMessage & {
  isPending?: boolean;
};

function createGuestId(): string {
  return `guest_${crypto.randomUUID().slice(0, 8)}`;
}

function getStoredGuestId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const storedGuestId = window.localStorage.getItem(guestIdStorageKey);
  if (storedGuestId) {
    return storedGuestId;
  }

  const newGuestId = createGuestId();
  window.localStorage.setItem(guestIdStorageKey, newGuestId);
  return newGuestId;
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallbackMessage;
}

export function useChatScreenState() {
  const [characterList, setCharacterList] = useState<CharacterSummary[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [selectedCharacterRefreshCount, setSelectedCharacterRefreshCount] =
    useState(0);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [guestId, setGuestId] = useState("");
  const [messageList, setMessageList] = useState<ChatMessageView[]>([]);
  const [aiModelOptionList, setAiModelOptionList] = useState<AiModelOption[]>([]);
  const [selectedAiModelProvider, setSelectedAiModelProvider] =
    useState<AiModelProvider | "">("");
  const [userMessageText, setUserMessageText] = useState("");
  const [isLoadingCharacterList, setIsLoadingCharacterList] = useState(true);
  const [isServerWakeNoticeVisible, setIsServerWakeNoticeVisible] =
    useState(false);
  const [isOpeningSession, setIsOpeningSession] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usedTokenCount, setUsedTokenCount] = useState(0);
  const [tokenLimitCount, setTokenLimitCount] = useState(defaultTokenLimitCount);
  const [dailyRequestUsage, setDailyRequestUsage] =
    useState<ClientDailyRequestUsageResponse | null>(null);
  const isSendingMessageRef = useRef(false);

  const selectedCharacter = useMemo(
    () =>
      characterList.find(
        (character) => character.character_id === selectedCharacterId
      ) ?? null,
    [characterList, selectedCharacterId]
  );

  const selectedCharacterImageUrl = selectedCharacter
    ? buildApiAssetUrl(selectedCharacter.character_image_url)
    : "";

  const buildCharacterImageUrl = (character: CharacterSummary): string => {
    return buildApiAssetUrl(character.character_image_url);
  };

  const refreshChatMessageListAction = async (chatSessionId: string) => {
    const messageListFromServer = await fetchChatMessageList(chatSessionId);
    setMessageList(messageListFromServer.message_list);
    setUsedTokenCount(messageListFromServer.used_token_count ?? 0);
    setTokenLimitCount(
      messageListFromServer.token_limit_count ?? defaultTokenLimitCount
    );
  };

  const refreshDailyRequestUsageAction = async () => {
    try {
      const dailyRequestUsageFromServer = await fetchDailyRequestUsage();
      setDailyRequestUsage(dailyRequestUsageFromServer);
    } catch (error) {
      setDailyRequestUsage(null);
    }
  };

  useEffect(() => {
    setGuestId(getStoredGuestId());
    void refreshDailyRequestUsageAction();
  }, []);

  useEffect(() => {
    if (!isLoadingCharacterList || characterList.length > 0) {
      setIsServerWakeNoticeVisible(false);
      return;
    }

    const wakeNoticeTimer = window.setTimeout(() => {
      setIsServerWakeNoticeVisible(true);
    }, serverWakeNoticeDelayMs);

    return () => {
      window.clearTimeout(wakeNoticeTimer);
    };
  }, [characterList.length, isLoadingCharacterList]);

  useEffect(() => {
    const loadAiModelList = async () => {
      try {
        const aiModelListResponse = await fetchAiModelOptionList();
        const aiModelListFromServer = aiModelListResponse.ai_model_option_list;

        setAiModelOptionList(aiModelListFromServer);
        setSelectedAiModelProvider(
          aiModelListFromServer[0]?.ai_model_provider ?? ""
        );
      } catch (error) {
        setAiModelOptionList([]);
        setSelectedAiModelProvider("");
        setErrorMessage("AI 모델 목록을 불러오지 못했습니다. 서버 상태를 확인해 주세요.");
      }
    };

    void loadAiModelList();
  }, []);

  useEffect(() => {
    const loadCharacterList = async () => {
      try {
        setIsLoadingCharacterList(true);
        const characterListFromServer = await fetchCharacterList();

        setCharacterList(characterListFromServer);
        setSelectedCharacterId(characterListFromServer[0]?.character_id ?? "");
      } catch (error) {
        setErrorMessage("캐릭터 목록을 불러오지 못했습니다. 서버 상태를 확인해 주세요.");
      } finally {
        setIsLoadingCharacterList(false);
      }
    };

    void loadCharacterList();
  }, []);

  useEffect(() => {
    if (!guestId || !selectedCharacterId || !selectedAiModelProvider) {
      return;
    }

    let shouldUpdateScreen = true;

    const openSelectedCharacterSession = async () => {
      try {
        setIsOpeningSession(true);
        setErrorMessage(null);

        const openedChatSession = await createChatSession(
          selectedCharacterId,
          guestId,
          selectedAiModelProvider
        );
        if (!shouldUpdateScreen) {
          return;
        }

        setActiveSessionId(openedChatSession.chat_session_id);
        setSelectedAiModelProvider(openedChatSession.ai_model_provider);

        const messageListFromServer = await fetchChatMessageList(
          openedChatSession.chat_session_id
        );
        if (!shouldUpdateScreen) {
          return;
        }

        setMessageList(messageListFromServer.message_list);
        setUsedTokenCount(messageListFromServer.used_token_count ?? 0);
        setTokenLimitCount(
          messageListFromServer.token_limit_count ?? defaultTokenLimitCount
        );
      } catch (error) {
        if (shouldUpdateScreen) {
          setErrorMessage("이 캐릭터의 대화를 불러오지 못했습니다.");
        }
      } finally {
        if (shouldUpdateScreen) {
          setIsOpeningSession(false);
        }
      }
    };

    void openSelectedCharacterSession();

    return () => {
      shouldUpdateScreen = false;
    };
  }, [
    guestId,
    selectedCharacterId,
    selectedAiModelProvider,
    selectedCharacterRefreshCount,
  ]);

  const selectCharacterAction = (characterId: string) => {
    setSelectedCharacterId(characterId);
    setSelectedCharacterRefreshCount(
      (previousRefreshCount) => previousRefreshCount + 1
    );
    setActiveSessionId(null);
    setMessageList([]);
    setUsedTokenCount(0);
    setTokenLimitCount(defaultTokenLimitCount);
    setErrorMessage(null);
  };

  const sendMessageAction = async () => {
    const cleanMessageText = userMessageText.trim();
    if (
      !cleanMessageText ||
      !selectedCharacterId ||
      !selectedAiModelProvider ||
      isOpeningSession ||
      usedTokenCount >= tokenLimitCount ||
      isSendingMessageRef.current
    ) {
      return;
    }

    let chatSessionId = activeSessionId;

    try {
      isSendingMessageRef.current = true;
      setIsSendingMessage(true);
      setErrorMessage(null);

      const temporaryCreatedAt = new Date().toISOString();
      const temporaryUserMessageId = `temp-user-${Date.now()}`;
      const temporaryAssistantMessageId = `temp-assistant-${Date.now()}`;
      const temporaryUserMessage: ChatMessageView = {
        message_id: temporaryUserMessageId,
        role: "user",
        message_text: cleanMessageText,
        created_at: temporaryCreatedAt,
      };
      const temporaryAssistantMessage: ChatMessageView = {
        message_id: temporaryAssistantMessageId,
        role: "assistant",
        message_text: "...",
        created_at: temporaryCreatedAt,
        isPending: true,
      };

      setMessageList((previousMessageList) => [
        ...previousMessageList,
        temporaryUserMessage,
        temporaryAssistantMessage,
      ]);
      setUserMessageText("");

      if (!chatSessionId) {
        const openedChatSession = await createChatSession(
          selectedCharacterId,
          guestId,
          selectedAiModelProvider
        );
        chatSessionId = openedChatSession.chat_session_id;
        setActiveSessionId(chatSessionId);
      }

      const createdMessage = await createChatMessage(
        chatSessionId,
        cleanMessageText,
        selectedAiModelProvider
      );

      setMessageList((previousMessageList) =>
        previousMessageList.map((message) => {
          if (message.message_id === temporaryUserMessageId) {
            return createdMessage.user_message;
          }
          if (message.message_id === temporaryAssistantMessageId) {
            return createdMessage.assistant_message;
          }
          return message;
        })
      );
      setUsedTokenCount(createdMessage.used_token_count ?? 0);
      setTokenLimitCount(
        createdMessage.token_limit_count ?? defaultTokenLimitCount
      );
      await refreshDailyRequestUsageAction();
    } catch (error) {
      if (chatSessionId) {
        try {
          await refreshChatMessageListAction(chatSessionId);
        } catch (refreshError) {
          // 서버 상태 동기화도 실패하면 임시 실패 메시지를 유지합니다.
        }
      }

      setErrorMessage(
        getErrorMessage(error, "메시지를 보내지 못했습니다. 다시 시도해 주세요.")
      );
      setMessageList((previousMessageList) =>
        previousMessageList.map((message) => {
          if (message.isPending) {
            return {
              ...message,
              message_text: "답변을 받지 못했습니다. 다시 시도해 주세요.",
              isPending: false,
            };
          }
          return message;
        })
      );
    } finally {
      isSendingMessageRef.current = false;
      setIsSendingMessage(false);
    }
  };

  return {
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
    isServerWakeNoticeVisible,
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
  };
}
