import { createChatApiClient } from "@ai-character-chat/shared";
import type {
  AiModelId,
  AiModelOptionListResponse,
  AdminDailyRequestUsageResponse,
  CharacterSummary,
  ChatMessageCreateResponse,
  ChatMessageListResponse,
  ChatSessionSummary,
  ClientDailyRequestUsageResponse,
} from "@ai-character-chat/shared";

function getRequiredApiBaseUrl(): string {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is required. Set it in apps/client/mobile/.env.");
  }
  return apiBaseUrl;
}

const chatApiClient = createChatApiClient({
  apiBaseUrl: getRequiredApiBaseUrl(),
});

export async function fetchAiModelOptionList(): Promise<AiModelOptionListResponse> {
  return chatApiClient.fetchAiModelOptionList();
}

export async function fetchDailyRequestUsage(): Promise<ClientDailyRequestUsageResponse> {
  return chatApiClient.fetchDailyRequestUsage();
}

export async function fetchAdminDailyRequestUsage(adminApiKey: string): Promise<AdminDailyRequestUsageResponse> {
  return chatApiClient.fetchAdminDailyRequestUsage(adminApiKey);
}

export async function resetAdminDailyRequestUsage(adminApiKey: string): Promise<AdminDailyRequestUsageResponse> {
  return chatApiClient.resetAdminDailyRequestUsage(adminApiKey);
}

export async function resetAdminDailyRequestIpUsage(adminApiKey: string, ipAddress: string): Promise<AdminDailyRequestUsageResponse> {
  return chatApiClient.resetAdminDailyRequestIpUsage(adminApiKey, ipAddress);
}

export async function fetchCharacterList(): Promise<CharacterSummary[]> {
  return chatApiClient.fetchCharacterList();
}

export async function createChatSession(characterId: string, guestId: string, aiModelId?: AiModelId): Promise<ChatSessionSummary> {
  return chatApiClient.createChatSession(characterId, guestId, aiModelId);
}

export async function listChatSessionByGuestId(guestId: string): Promise<ChatSessionSummary[]> {
  return chatApiClient.listChatSessionByGuestId(guestId);
}

export async function fetchChatMessageList(chatSessionId: string): Promise<ChatMessageListResponse> {
  return chatApiClient.fetchChatMessageList(chatSessionId);
}

export async function createChatMessage(chatSessionId: string, userMessageText: string, aiModelId?: AiModelId): Promise<ChatMessageCreateResponse> {
  return chatApiClient.createChatMessage(chatSessionId, userMessageText, aiModelId);
}
