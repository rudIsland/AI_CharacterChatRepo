import {
  AiModelOptionListResponse,
  AiModelProvider,
  CharacterSummary,
  ChatMessageCreateResponse,
  ChatMessageListResponse,
  ChatSessionSummary,
  createChatApiClient,
} from "@ai-character-chat/shared";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

const chatApiClient = createChatApiClient({
  apiBaseUrl: getApiBaseUrl(),
});

export async function fetchAiModelOptionList(): Promise<AiModelOptionListResponse> {
  return chatApiClient.fetchAiModelOptionList();
}

export async function fetchCharacterList(): Promise<CharacterSummary[]> {
  return chatApiClient.fetchCharacterList();
}

export async function createChatSession(
  characterId: string,
  guestId: string,
  aiModelProvider?: AiModelProvider
): Promise<ChatSessionSummary> {
  return chatApiClient.createChatSession(characterId, guestId, aiModelProvider);
}

export async function listChatSessionByGuestId(
  guestId: string
): Promise<ChatSessionSummary[]> {
  return chatApiClient.listChatSessionByGuestId(guestId);
}

export async function fetchChatMessageList(
  chatSessionId: string
): Promise<ChatMessageListResponse> {
  return chatApiClient.fetchChatMessageList(chatSessionId);
}

export async function createChatMessage(
  chatSessionId: string,
  userMessageText: string,
  aiModelProvider?: AiModelProvider
): Promise<ChatMessageCreateResponse> {
  return chatApiClient.createChatMessage(
    chatSessionId,
    userMessageText,
    aiModelProvider
  );
}
