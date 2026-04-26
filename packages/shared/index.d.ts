export type ChatRole = "user" | "assistant";
export type AiModelProvider = "gpt" | "gemini" | "local_ai";
export const USER_MESSAGE_MAX_LENGTH: 500;

export interface CharacterSummary {
  character_id: string;
  character_name: string;
  character_description: string;
  character_gender: string;
  character_age_range: string;
  character_background: string;
  character_personality: string;
  character_image_url: string;
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
  input_token_count?: number | null;
  output_token_count?: number | null;
  total_token_count?: number | null;
  created_at: string;
}

export interface ChatMessageCreateResponse {
  chat_session_id: string;
  user_message: ChatMessage;
  assistant_message: ChatMessage;
  used_token_count: number;
  token_limit_count: number;
}

export interface ChatMessageListResponse {
  chat_session_id: string;
  message_list: ChatMessage[];
  used_token_count: number;
  token_limit_count: number;
}

export interface AiModelOption {
  ai_model_provider: AiModelProvider;
  ai_model_name: string;
  ai_model_label: string;
}

export interface AiModelOptionListResponse {
  ai_model_option_list: AiModelOption[];
}

export interface ClientDailyRequestUsageResponse {
  current_date: string;
  daily_request_count: number;
  daily_request_limit: number;
  client_ip_address: string;
  client_daily_request_count: number;
  client_daily_request_limit: number;
}

export interface DailyRequestIpUsage {
  ip_address: string;
  daily_request_count: number;
  daily_request_limit: number;
  access_count: number;
  last_access_at: string | null;
}

export interface AdminDailyRequestUsageResponse {
  current_date: string;
  admin_client_ip_address: string;
  daily_request_count: number;
  daily_request_limit: number;
  daily_request_limit_per_ip: number;
  daily_request_count_by_ip: Record<string, number>;
  access_count_by_ip: Record<string, number>;
  last_access_at_by_ip: Record<string, string>;
  ip_usage_list: DailyRequestIpUsage[];
}

export interface ChatApiClient {
  fetchDailyRequestUsage(): Promise<ClientDailyRequestUsageResponse>;
  fetchAdminDailyRequestUsage(
    adminApiKey: string
  ): Promise<AdminDailyRequestUsageResponse>;
  resetAdminDailyRequestUsage(
    adminApiKey: string
  ): Promise<AdminDailyRequestUsageResponse>;
  resetAdminDailyRequestIpUsage(
    adminApiKey: string,
    ipAddress: string
  ): Promise<AdminDailyRequestUsageResponse>;
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

export class ChatApiError extends Error {
  statusCode?: number;
  requestPath?: string;
  responseBody?: unknown;
  isTimeout: boolean;
  isNetworkError: boolean;
  cause?: unknown;

  constructor(
    message: string,
    params?: {
      statusCode?: number;
      requestPath?: string;
      responseBody?: unknown;
      isTimeout?: boolean;
      isNetworkError?: boolean;
      cause?: unknown;
    }
  );
}

export function createChatApiClient(params: {
  apiBaseUrl: string;
  requestTimeoutMs?: number;
  retryCount?: number;
}): ChatApiClient;
