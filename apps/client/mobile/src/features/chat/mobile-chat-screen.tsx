import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  createChatMessage,
  createChatSession,
  fetchDailyRequestUsage,
  fetchAiModelOptionList,
  fetchCharacterList,
  fetchChatMessageList,
  listChatSessionByGuestId,
} from "./mobile-chat-api-client";
import { USER_MESSAGE_MAX_LENGTH } from "./mobile-chat-types";
import type {
  AiModelId,
  AiModelOption,
  CharacterSummary,
  ChatMessage,
  ChatSessionSummary,
  ClientDailyRequestUsageResponse,
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
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
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

function formatDailyRequestLimitText(count: number, limit: number): string {
  if (limit === 0) {
    return `${count} / 무제한`;
  }
  return `${count} / ${limit}`;
}

export function MobileChatScreen() {
  const [guestId] = useState(createGuestId);
  const [characterList, setCharacterList] = useState<CharacterSummary[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [chatSessionList, setChatSessionList] = useState<ChatSessionSummary[]>([]);
  const [messageList, setMessageList] = useState<ChatMessage[]>([]);
  const [aiModelOptionList, setAiModelOptionList] = useState<AiModelOption[]>([]);
  const [selectedAiModelId, setSelectedAiModelId] = useState<AiModelId | "">("");
  const [userMessageText, setUserMessageText] = useState("");
  const [isLoadingCharacterList, setIsLoadingCharacterList] = useState(false);
  const [isLoadingSessionList, setIsLoadingSessionList] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dailyRequestUsage, setDailyRequestUsage] =
    useState<ClientDailyRequestUsageResponse | null>(null);
  const isSendingMessageRef = useRef(false);

  const selectedCharacter = useMemo(() => characterList.find((character) => character.character_id === selectedCharacterId) ?? null, [characterList, selectedCharacterId]);
  const aiModelLabelMap = useMemo<Record<AiModelId, string>>(() => {
    const fallbackLabelMap = {} as Record<AiModelId, string>;
    for (const aiModelOption of aiModelOptionList) {
      fallbackLabelMap[aiModelOption.ai_model_id] = aiModelOption.ai_model_label;
    }
    return fallbackLabelMap;
  }, [aiModelOptionList]);

  const formatAiModelLabel = (aiModelId: AiModelId): string => {
    return aiModelLabelMap[aiModelId] ?? aiModelId;
  };

  const loadDailyRequestUsageAction = async () => {
    try {
      const usage = await fetchDailyRequestUsage();
      setDailyRequestUsage(usage);
    } catch (error) {
      setDailyRequestUsage(null);
    }
  };

  useEffect(() => {
    void loadDailyRequestUsageAction();
  }, []);

  useEffect(() => {
    const loadAiModelOptionList = async () => {
      try {
        const aiModelOptionListResponse = await fetchAiModelOptionList();
        const loadedAiModelOptionList =
          aiModelOptionListResponse.ai_model_option_list;
        setAiModelOptionList(loadedAiModelOptionList);
        setSelectedAiModelId((currentModelId) => {
          if (
            currentModelId &&
            loadedAiModelOptionList.some((aiModelOption) => aiModelOption.ai_model_id === currentModelId)
          ) {
            return currentModelId;
          }
          return loadedAiModelOptionList[0]?.ai_model_id ?? "";
        });
      } catch (error) {
        setAiModelOptionList([]);
        setSelectedAiModelId("");
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

  const loadSessionListAction = async (guestIdValue: string, characterIdValue: string) => {
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
    setChatSessionList([]);
    setMessageList([]);
    setErrorMessage(null);
  };

  const openChatSessionAction = async (chatSession: ChatSessionSummary) => {
    try {
      setErrorMessage(null);
      setActiveSessionId(chatSession.chat_session_id);
      setSelectedAiModelId(chatSession.ai_model_id);
      const loadedMessages = await fetchChatMessageList(chatSession.chat_session_id);
      setMessageList(loadedMessages.message_list);
    } catch (error) {
      setErrorMessage("메시지를 불러오지 못했습니다.");
    }
  };

  const startSessionAction = async () => {
    if (!selectedCharacterId || !selectedAiModelId) {
      return;
    }

    try {
      setErrorMessage(null);
      const createdSession = await createChatSession(selectedCharacterId, guestId, selectedAiModelId);
      setActiveSessionId(createdSession.chat_session_id);
      setSelectedAiModelId(createdSession.ai_model_id);

      const loadedMessages = await fetchChatMessageList(createdSession.chat_session_id);
      setMessageList(loadedMessages.message_list);
      await loadSessionListAction(guestId, selectedCharacterId);
    } catch (error) {
      setErrorMessage("대화를 시작하지 못했습니다.");
    }
  };

  const sendMessageAction = async () => {
    const cleanMessageText = userMessageText.trim();
    if (
      !cleanMessageText ||
      !selectedCharacterId ||
      !selectedAiModelId ||
      isSendingMessageRef.current
    ) {
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
      isSendingMessageRef.current = true;
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
        const createdSession = await createChatSession(selectedCharacterId, guestId, selectedAiModelId);
        sessionId = createdSession.chat_session_id;
        setActiveSessionId(sessionId);
        setSelectedAiModelId(createdSession.ai_model_id);
        await loadSessionListAction(guestId, selectedCharacterId);
      }

      if (!sessionId) {
        throw new Error("채팅 세션 ID가 생성되지 않았습니다.");
      }

      const createdMessage = await createChatMessage(sessionId, cleanMessageText, selectedAiModelId);
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
      await loadDailyRequestUsageAction();
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
      isSendingMessageRef.current = false;
      setIsSendingMessage(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.screenContainer}>
        <View style={styles.characterPanel}>
          <View style={styles.titleRow}>
            <View style={styles.titleTextGroup}>
              <Text style={styles.titleText}>AI 캐릭터 채팅</Text>
              <Text style={styles.helperText}>게스트 ID: {guestId}</Text>
            </View>
            {isLoadingCharacterList ? (
              <ActivityIndicator size="small" color="#0f766e" />
            ) : null}
          </View>

          <FlatList
            data={characterList}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(character) => character.character_id}
            contentContainerStyle={styles.characterListContent}
            renderItem={({ item: character }) => {
              const isSelected = character.character_id === selectedCharacterId;
              return (
                <Pressable
                  style={[
                    styles.characterButton,
                    isSelected && styles.selectedCharacterButton,
                  ]}
                  onPress={() => selectCharacterAction(character.character_id)}
                >
                  <Text style={styles.characterNameText} numberOfLines={1}>
                    {character.character_name}
                  </Text>
                  <Text
                    style={styles.characterDescriptionText}
                    numberOfLines={1}
                  >
                    {character.character_description}
                  </Text>
                  <Text style={styles.characterMetaText} numberOfLines={1}>
                    {character.character_gender} · {character.character_age_range}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>

        <View style={styles.chatPanel}>
          <View style={styles.chatHeaderRow}>
            <View style={styles.chatHeaderTextGroup}>
              <Text style={styles.chatHeaderText} numberOfLines={1}>
                {selectedCharacter?.character_name ?? "선택된 캐릭터 없음"}
              </Text>
              {dailyRequestUsage ? (
                <Text style={styles.usageText} numberOfLines={1}>
                  내 일일 요청{" "}
                  {formatDailyRequestLimitText(dailyRequestUsage.client_daily_request_count, dailyRequestUsage.client_daily_request_limit)}{" "}
                  · 전체{" "}
                  {formatDailyRequestLimitText(dailyRequestUsage.daily_request_count, dailyRequestUsage.daily_request_limit)}
                </Text>
              ) : null}
            </View>
            <Pressable
              style={[
                styles.startButton,
                (!selectedCharacterId || !selectedAiModelId) &&
                  styles.disabledSendButton,
              ]}
              onPress={() => void startSessionAction()}
              disabled={!selectedCharacterId || !selectedAiModelId}
            >
              <Text style={styles.startButtonText}>대화 열기</Text>
            </Pressable>
          </View>

          {isLoadingSessionList || chatSessionList.length > 0 ? (
            <View style={styles.sessionArea}>
              {isLoadingSessionList ? (
                <ActivityIndicator size="small" color="#0f766e" />
              ) : null}

              {chatSessionList.length > 0 ? (
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
                          {formatAiModelLabel(item.ai_model_id)}
                        </Text>
                      </Pressable>
                    );
                  }}
                />
              ) : null}
            </View>
          ) : null}

          <View style={styles.aiModelRow}>
            {aiModelOptionList.map((aiModelOption) => {
              const isSelected = selectedAiModelId === aiModelOption.ai_model_id;
              return (
                <Pressable
                  key={aiModelOption.ai_model_id}
                  style={[
                    styles.aiModelButton,
                    isSelected && styles.activeAiModelButton,
                  ]}
                  onPress={() => setSelectedAiModelId(aiModelOption.ai_model_id)}
                  disabled={isSendingMessage || !selectedCharacterId}
                >
                  <Text
                    style={[
                      styles.aiModelButtonText,
                      isSelected && styles.activeAiModelButtonText,
                    ]}
                    numberOfLines={1}
                  >
                    {aiModelOption.ai_model_label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <FlatList
            style={styles.messageList}
            contentContainerStyle={[
              styles.messageListContent,
              messageList.length === 0 && styles.emptyMessageListContent,
            ]}
            data={messageList}
            keyExtractor={(message) => message.message_id}
            keyboardShouldPersistTaps="handled"
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

          <View style={styles.messageInputContainer}>
            <View style={styles.messageInputRow}>
              <TextInput
                value={userMessageText}
                onChangeText={setUserMessageText}
                placeholder="메시지를 입력하세요..."
                style={styles.messageInput}
                multiline
                maxLength={USER_MESSAGE_MAX_LENGTH}
                editable={
                  !isSendingMessage &&
                  Boolean(selectedCharacterId) &&
                  Boolean(selectedAiModelId)
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
                  !selectedAiModelId
                }
              >
                <Text style={styles.sendButtonText}>
                  {isSendingMessage ? "..." : "보내기"}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.messageLengthText}>
              {userMessageText.length} / {USER_MESSAGE_MAX_LENGTH}
            </Text>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: "#f1f5f9",
    gap: 8,
  },
  characterPanel: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 8,
    backgroundColor: "#ffffff",
    gap: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  titleTextGroup: {
    flex: 1,
  },
  titleText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  helperText: {
    fontSize: 11,
    color: "#475569",
  },
  characterListContent: {
    gap: 8,
    paddingRight: 2,
  },
  characterButton: {
    width: 178,
    minHeight: 68,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
    minWidth: 78,
    minHeight: 36,
    borderRadius: 10,
    backgroundColor: "#0f766e",
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  startButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  chatPanel: {
    flex: 1,
    minHeight: 0,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 8,
    backgroundColor: "#ffffff",
    gap: 6,
  },
  chatHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chatHeaderTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  chatHeaderText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  usageText: {
    marginTop: 1,
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  sessionArea: {
    minHeight: 46,
    justifyContent: "center",
  },
  sessionListContainer: {
    gap: 6,
    paddingRight: 2,
  },
  sessionButton: {
    minWidth: 96,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  activeSessionButton: {
    borderColor: "#0f766e",
    backgroundColor: "#ecfdf5",
  },
  sessionButtonTitleText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f172a",
  },
  sessionButtonDateText: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
  },
  messageList: {
    flex: 1,
    minHeight: 0,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    backgroundColor: "#f8fafc",
  },
  messageListContent: {
    flexGrow: 1,
    padding: 8,
    gap: 7,
  },
  emptyMessageListContent: {
    justifyContent: "center",
  },
  messageBubble: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: "88%",
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
    fontSize: 15,
    lineHeight: 21,
  },
  userMessageText: {
    color: "#f8fafc",
  },
  assistantMessageText: {
    color: "#0f172a",
  },
  messageTimeText: {
    marginTop: 4,
    fontSize: 10,
    color: "#64748b",
  },
  emptyMessageText: {
    fontSize: 13,
    color: "#64748b",
  },
  messageInputContainer: {
    gap: 3,
  },
  messageInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  aiModelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  aiModelButton: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
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
    maxHeight: 92,
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
    fontSize: 15,
    textAlignVertical: "top",
  },
  sendButton: {
    minHeight: 44,
    minWidth: 62,
    borderRadius: 10,
    backgroundColor: "#0f172a",
    paddingHorizontal: 12,
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
  messageLengthText: {
    alignSelf: "flex-end",
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
  },
  errorText: {
    color: "#be123c",
    fontSize: 12,
  },
});
