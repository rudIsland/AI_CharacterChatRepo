import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  createChatMessage,
  createChatSession,
  fetchAiModelOptionList,
  fetchCharacterList,
  fetchChatMessageList,
  listChatSessionByGuestId,
} from "./mobile-chat-api-client";
import {
  AiModelOption,
  AiModelProvider,
  CharacterSummary,
  ChatMessage,
  ChatSessionSummary,
} from "./mobile-chat-types";

function createGuestId(): string {
  return `guest_mobile_${Math.random().toString(36).slice(2, 10)}`;
}

function formatMessageTime(createdAt: string): string {
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

function formatTokenUsageText(message: ChatMessage): string {
  if (
    message.input_token_count == null &&
    message.output_token_count == null &&
    message.total_token_count == null
  ) {
    return "";
  }

  const tokenTextList: string[] = [];
  if (message.input_token_count != null) {
    tokenTextList.push(`입력 ${message.input_token_count}`);
  }
  if (message.output_token_count != null) {
    tokenTextList.push(`출력 ${message.output_token_count}`);
  }
  if (message.total_token_count != null) {
    tokenTextList.push(`합계 ${message.total_token_count}`);
  }
  return tokenTextList.join(" · ");
}

export function MobileChatScreen() {
  const [guestId] = useState(createGuestId);
  const [characterList, setCharacterList] = useState<CharacterSummary[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [chatSessionList, setChatSessionList] = useState<ChatSessionSummary[]>([]);
  const [messageList, setMessageList] = useState<ChatMessage[]>([]);
  const [aiModelOptionList, setAiModelOptionList] = useState<AiModelOption[]>([]);
  const [selectedAiModelProvider, setSelectedAiModelProvider] =
    useState<AiModelProvider | "">("");
  const [userMessageText, setUserMessageText] = useState("");
  const [isLoadingCharacterList, setIsLoadingCharacterList] = useState(false);
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
    const fallbackLabelMap = {} as Record<AiModelProvider, string>;
    for (const aiModelOption of aiModelOptionList) {
      fallbackLabelMap[aiModelOption.ai_model_provider] = aiModelOption.ai_model_label;
    }
    return fallbackLabelMap;
  }, [aiModelOptionList]);

  const formatAiModelProviderLabel = (aiModelProvider: AiModelProvider): string => {
    return aiModelLabelMap[aiModelProvider] ?? aiModelProvider;
  };

  useEffect(() => {
    const loadAiModelOptionList = async () => {
      try {
        const aiModelOptionListResponse = await fetchAiModelOptionList();
        const loadedAiModelOptionList =
          aiModelOptionListResponse.ai_model_option_list;
        setAiModelOptionList(loadedAiModelOptionList);
        setSelectedAiModelProvider((currentProvider) => {
          if (
            currentProvider &&
            loadedAiModelOptionList.some(
              (aiModelOption) =>
                aiModelOption.ai_model_provider === currentProvider
            )
          ) {
            return currentProvider;
          }
          return loadedAiModelOptionList[0]?.ai_model_provider ?? "";
        });
      } catch (error) {
        setAiModelOptionList([]);
        setSelectedAiModelProvider("");
        setErrorMessage("AI 모델 목록을 불러오지 못했습니다.");
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
        setErrorMessage("캐릭터 목록을 불러오지 못했습니다.");
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
      setErrorMessage("대화 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoadingSessionList(false);
    }
  };

  useEffect(() => {
    void loadSessionListAction(guestId, selectedCharacterId);
  }, [guestId, selectedCharacterId]);

  const selectCharacterAction = (characterId: string) => {
    setSelectedCharacterId(characterId);
    setActiveSessionId(null);
    setMessageList([]);
    setErrorMessage(null);
  };

  const openChatSessionAction = async (chatSession: ChatSessionSummary) => {
    try {
      setErrorMessage(null);
      setActiveSessionId(chatSession.chat_session_id);
      setSelectedAiModelProvider(chatSession.ai_model_provider);
      const loadedMessages = await fetchChatMessageList(chatSession.chat_session_id);
      setMessageList(loadedMessages.message_list);
    } catch (error) {
      setErrorMessage("메시지를 불러오지 못했습니다.");
    }
  };

  const startSessionAction = async () => {
    if (!selectedCharacterId || !selectedAiModelProvider) {
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
      setErrorMessage("대화를 시작하지 못했습니다.");
    }
  };

  const sendMessageAction = async () => {
    const cleanMessageText = userMessageText.trim();
    if (!cleanMessageText || !selectedCharacterId || !selectedAiModelProvider) {
      return;
    }

    const optimisticCreatedAt = new Date().toISOString();
    const optimisticUserMessageId = `temp-user-${Date.now()}`;
    const optimisticAssistantMessageId = `temp-assistant-${Date.now()}`;
    const optimisticUserMessage: ChatMessage = {
      message_id: optimisticUserMessageId,
      role: "user",
      message_text: cleanMessageText,
      created_at: optimisticCreatedAt,
    };
    const optimisticAssistantMessage: ChatMessage = {
      message_id: optimisticAssistantMessageId,
      role: "assistant",
      message_text: "...",
      created_at: optimisticCreatedAt,
    };

    try {
      setIsSendingMessage(true);
      setErrorMessage(null);
      setMessageList((previousMessageList) => [
        ...previousMessageList,
        optimisticUserMessage,
        optimisticAssistantMessage,
      ]);
      setUserMessageText("");

      let sessionId = activeSessionId;
      if (!sessionId) {
        const createdSession = await createChatSession(
          selectedCharacterId,
          guestId,
          selectedAiModelProvider
        );
        sessionId = createdSession.chat_session_id;
        setActiveSessionId(sessionId);
        setSelectedAiModelProvider(createdSession.ai_model_provider);
        await loadSessionListAction(guestId, selectedCharacterId);
      }

      if (!sessionId) {
        throw new Error("채팅 세션 ID가 생성되지 않았습니다.");
      }

      const createdMessage = await createChatMessage(
        sessionId,
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
      setErrorMessage("메시지를 보내지 못했습니다.");
      setMessageList((previousMessageList) =>
        previousMessageList.map((message) => {
          if (message.message_id === optimisticAssistantMessageId) {
            return {
              ...message,
              message_text: "답변을 받지 못했습니다. 다시 시도해 주세요.",
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
    <View style={styles.screenContainer}>
      <View style={styles.characterPanel}>
        <Text style={styles.titleText}>AI 캐릭터 채팅</Text>
        <Text style={styles.helperText}>게스트 ID: {guestId}</Text>

        {isLoadingCharacterList && <ActivityIndicator size="small" color="#0f766e" />}

        <View style={styles.characterListContainer}>
          {characterList.map((character) => {
            const isSelected = character.character_id === selectedCharacterId;
            return (
              <Pressable
                key={character.character_id}
                style={[
                  styles.characterButton,
                  isSelected && styles.selectedCharacterButton,
                ]}
                onPress={() => selectCharacterAction(character.character_id)}
              >
                <Text style={styles.characterNameText}>{character.character_name}</Text>
                <Text style={styles.characterDescriptionText}>
                  {character.character_description}
                </Text>
                <Text style={styles.characterMetaText}>
                  {character.character_gender} · {character.character_age_range}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[
            styles.startButton,
            (!selectedCharacterId || !selectedAiModelProvider) &&
              styles.disabledSendButton,
          ]}
          onPress={() => void startSessionAction()}
          disabled={!selectedCharacterId || !selectedAiModelProvider}
        >
          <Text style={styles.startButtonText}>대화 열기</Text>
        </Pressable>
      </View>

      <View style={styles.chatPanel}>
        <Text style={styles.chatHeaderText}>
          {selectedCharacter?.character_name ?? "선택된 캐릭터 없음"}
        </Text>
        <Text style={styles.sessionLabelText}>대화 목록</Text>
        {isLoadingSessionList && (
          <ActivityIndicator size="small" color="#0f766e" />
        )}

        {!isLoadingSessionList && chatSessionList.length === 0 && (
          <Text style={styles.emptySessionText}>
            이 캐릭터의 저장된 대화가 없습니다.
          </Text>
        )}

        {chatSessionList.length > 0 && (
          <FlatList
            data={chatSessionList}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(session) => session.chat_session_id}
            contentContainerStyle={styles.sessionListContainer}
            renderItem={({ item, index }) => {
              const isActive = activeSessionId === item.chat_session_id;
              return (
                <Pressable
                  style={[
                    styles.sessionButton,
                    isActive && styles.activeSessionButton,
                  ]}
                  onPress={() => void openChatSessionAction(item)}
                >
                  <Text style={styles.sessionButtonTitleText}>
                    대화 {chatSessionList.length - index}
                  </Text>
                  <Text style={styles.sessionButtonDateText}>
                    {formatSessionCreatedAt(item.created_at)}
                  </Text>
                  <Text style={styles.sessionButtonDateText}>
                    {formatAiModelProviderLabel(item.ai_model_provider)}
                  </Text>
                </Pressable>
              );
            }}
          />
        )}

        <View style={styles.aiModelRow}>
          {aiModelOptionList.map((aiModelOption) => {
            const isSelected =
              selectedAiModelProvider === aiModelOption.ai_model_provider;
            return (
              <Pressable
                key={aiModelOption.ai_model_provider}
                style={[
                  styles.aiModelButton,
                  isSelected && styles.activeAiModelButton,
                ]}
                onPress={() =>
                  setSelectedAiModelProvider(aiModelOption.ai_model_provider)
                }
                disabled={isSendingMessage || !selectedCharacterId}
              >
                <Text
                  style={[
                    styles.aiModelButtonText,
                    isSelected && styles.activeAiModelButtonText,
                  ]}
                >
                  {aiModelOption.ai_model_label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <FlatList
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          data={messageList}
          keyExtractor={(message) => message.message_id}
          renderItem={({ item }) => {
            const tokenUsageText =
              item.role === "assistant" ? formatTokenUsageText(item) : "";

            return (
              <View
                style={[
                  styles.messageBubble,
                  item.role === "user"
                    ? styles.userMessageBubble
                    : styles.assistantMessageBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    item.role === "user"
                      ? styles.userMessageText
                      : styles.assistantMessageText,
                  ]}
                >
                  {item.message_text}
                </Text>
                <Text style={styles.messageTimeText}>
                  {formatMessageTime(item.created_at)}
                  {tokenUsageText ? ` · ${tokenUsageText}` : ""}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyMessageText}>
              대화를 열고 첫 메시지를 보내 보세요.
            </Text>
          }
        />

        <View style={styles.messageInputRow}>
          <TextInput
            value={userMessageText}
            onChangeText={setUserMessageText}
            placeholder="메시지를 입력하세요..."
            style={styles.messageInput}
            editable={
              !isSendingMessage &&
              Boolean(selectedCharacterId) &&
              Boolean(selectedAiModelProvider)
            }
          />
          <Pressable
            style={[
              styles.sendButton,
              isSendingMessage && styles.disabledSendButton,
            ]}
            onPress={() => void sendMessageAction()}
            disabled={
              isSendingMessage ||
              !selectedCharacterId ||
              !selectedAiModelProvider
            }
          >
            <Text style={styles.sendButtonText}>
              {isSendingMessage ? "..." : "보내기"}
            </Text>
          </Pressable>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f1f5f9",
    gap: 12,
  },
  characterPanel: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#ffffff",
    gap: 8,
  },
  titleText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  helperText: {
    fontSize: 12,
    color: "#475569",
  },
  characterListContainer: {
    gap: 8,
  },
  characterButton: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#f8fafc",
  },
  selectedCharacterButton: {
    borderColor: "#0f766e",
    backgroundColor: "#ecfdf5",
  },
  characterNameText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  characterDescriptionText: {
    marginTop: 2,
    fontSize: 12,
    color: "#475569",
  },
  characterMetaText: {
    marginTop: 2,
    fontSize: 11,
    color: "#64748b",
  },
  startButton: {
    marginTop: 4,
    borderRadius: 10,
    backgroundColor: "#0f766e",
    paddingVertical: 10,
    alignItems: "center",
  },
  startButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  chatPanel: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#ffffff",
    gap: 8,
  },
  chatHeaderText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  sessionLabelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  emptySessionText: {
    fontSize: 12,
    color: "#64748b",
  },
  sessionListContainer: {
    gap: 8,
    paddingBottom: 6,
  },
  sessionButton: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 110,
  },
  activeSessionButton: {
    borderColor: "#0f766e",
    backgroundColor: "#ecfdf5",
  },
  sessionButtonTitleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  sessionButtonDateText: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  messageList: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
  },
  messageListContent: {
    padding: 10,
    gap: 8,
  },
  messageBubble: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: "85%",
  },
  userMessageBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#0f172a",
  },
  assistantMessageBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#99f6e4",
  },
  messageText: {
    fontSize: 14,
  },
  userMessageText: {
    color: "#f8fafc",
  },
  assistantMessageText: {
    color: "#0f172a",
  },
  messageTimeText: {
    marginTop: 4,
    fontSize: 11,
    color: "#64748b",
  },
  emptyMessageText: {
    fontSize: 13,
    color: "#64748b",
  },
  messageInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  aiModelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  aiModelButton: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#f8fafc",
  },
  activeAiModelButton: {
    borderColor: "#0f766e",
    backgroundColor: "#ecfdf5",
  },
  aiModelButtonText: {
    fontSize: 11,
    color: "#334155",
    fontWeight: "600",
  },
  activeAiModelButtonText: {
    color: "#0f766e",
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
  },
  sendButton: {
    borderRadius: 10,
    backgroundColor: "#0f172a",
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledSendButton: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  errorText: {
    color: "#be123c",
    fontSize: 12,
  },
});
