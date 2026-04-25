import { useEffect, useMemo, useState } from "react";

import {
  buildApiAssetUrl,
  createChatMessage,
  createChatSession,
  fetchAiModelOptionList,
  fetchCharacterList,
  fetchChatMessageList,
} from "@/features/chat/chat-api-client";
import {
  AiModelOption,
  AiModelProvider,
  CharacterSummary,
  ChatMessage,
} from "@/features/chat/chat-types";

const guestIdStorageKey = "guest_id";
const defaultTokenLimitCount = 50_000;

// 서버 응답을 기다리는 동안 화면에 먼저 보여주는 임시 메시지입니다.
export type ChatMessageView = ChatMessage & {
  // true이면 아직 서버 확정 응답으로 교체되지 않은 대기 메시지입니다.
  isPending?: boolean;
};

function createGuestId(): string {
  return `guest_${crypto.randomUUID().slice(0, 8)}`;
}

function getStoredGuestId(): string {
  // 같은 브라우저에서는 같은 guest_id를 써서 캐릭터별 대화를 이어갑니다.
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
  // 서버에서 받은 목록과 화면에서 선택한 값을 관리합니다.
  const [characterList, setCharacterList] = useState<CharacterSummary[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [guestId, setGuestId] = useState("");
  const [messageList, setMessageList] = useState<ChatMessageView[]>([]);
  const [aiModelOptionList, setAiModelOptionList] = useState<AiModelOption[]>([]);
  const [selectedAiModelProvider, setSelectedAiModelProvider] =
    useState<AiModelProvider | "">("");
  const [userMessageText, setUserMessageText] = useState("");
  const [isLoadingCharacterList, setIsLoadingCharacterList] = useState(true);
  const [isOpeningSession, setIsOpeningSession] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usedTokenCount, setUsedTokenCount] = useState(0);
  const [tokenLimitCount, setTokenLimitCount] = useState(defaultTokenLimitCount);

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

  useEffect(() => {
    setGuestId(getStoredGuestId());
  }, []);

  useEffect(() => {
    const loadAiModelList = async () => {
      try {
        // AI 모델 목록은 클라이언트에 고정하지 않고 서버에서 받아옵니다.
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
        // 캐릭터도 서버에서 받아오며, 첫 번째 캐릭터를 기본 선택합니다.
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
        // 캐릭터를 선택하면 해당 캐릭터의 단일 세션을 열거나 새로 만듭니다.
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
  }, [guestId, selectedCharacterId, selectedAiModelProvider]);

  const selectCharacterAction = (characterId: string) => {
    // 클릭한 캐릭터의 기존 대화를 바로 열 수 있도록 선택값을 바꿉니다.
    setSelectedCharacterId(characterId);
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
      usedTokenCount >= tokenLimitCount
    ) {
      return;
    }

    try {
      setIsSendingMessage(true);
      setErrorMessage(null);

      const temporaryCreatedAt = new Date().toISOString();
      const temporaryUserMessageId = `temp-user-${Date.now()}`;
      const temporaryAssistantMessageId = `temp-assistant-${Date.now()}`;

      // 서버 응답 전까지 사용자가 보낸 메시지와 대기 중인 AI 답변을 먼저 보여줍니다.
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

      let chatSessionId = activeSessionId;
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

      // 서버에서 확정된 메시지로 임시 메시지를 교체합니다.
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
    } catch (error) {
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
    isOpeningSession,
    isSendingMessage,
    usedTokenCount,
    tokenLimitCount,
    errorMessage,
    setSelectedAiModelProvider,
    setUserMessageText,
    selectCharacterAction,
    sendMessageAction,
  };
}
