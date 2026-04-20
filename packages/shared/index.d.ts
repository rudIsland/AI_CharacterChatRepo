export type ChatRole = "user" | "assistant";
export type AiModelProvider = "gpt" | "gemini" | "local_ai";

export interface CharacterSummary {
  character_id: string;
  character_name: string;
  character_description: string;
}

export interface ChatSessionSummary {
  chat_session_id: string;
  character_id: string;
  guest_id: string;
  ai_model_provider: AiModelProvider;
  created_at: string;
}

export interface ChatMessage {
  message_id: string;
  role: ChatRole;
  message_text: string;
  created_at: string;
}

export interface ChatMessageCreateResponse {
  chat_session_id: string;
  user_message: ChatMessage;
  assistant_message: ChatMessage;
}

export interface ChatMessageListResponse {
  chat_session_id: string;
  message_list: ChatMessage[];
}

export interface AiModelOption {
  ai_model_provider: AiModelProvider;
  ai_model_name: string;
  ai_model_label: string;
}

export interface AiModelOptionListResponse {
  ai_model_option_list: AiModelOption[];
}

export interface ChatApiClient {
  fetchAiModelOptionList(): Promise<AiModelOptionListResponse>;
  fetchCharacterList(): Promise<CharacterSummary[]>;
  createChatSession(
    characterId: string,
    guestId: string,
    aiModelProvider?: AiModelProvider
  ): Promise<ChatSessionSummary>;
  listChatSessionByGuestId(guestId: string): Promise<ChatSessionSummary[]>;
  fetchChatMessageList(chatSessionId: string): Promise<ChatMessageListResponse>;
  createChatMessage(
    chatSessionId: string,
    userMessageText: string,
    aiModelProvider?: AiModelProvider
  ): Promise<ChatMessageCreateResponse>;
}

export function createChatApiClient(params: { apiBaseUrl: string }): ChatApiClient;
