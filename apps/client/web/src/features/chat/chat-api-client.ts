import { createChatApiClient } from "@ai-character-chat/shared";
import type {
  AiModelOptionListResponse,
  AdminDailyRequestUsageResponse,
  AiModelProvider,
  CharacterSummary,
  ChatMessageCreateResponse,
  ChatMessageListResponse,
  ChatSessionSummary,
  ClientDailyRequestUsageResponse,
} from "@ai-character-chat/shared";

function getRequiredApiBaseUrl(): string {
  // 클라이언트가 호출할 서버 주소는 .env에서만 가져옵니다.
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is required. Set it in apps/client/web/.env."
    );
  }
  return apiBaseUrl;
}

const chatApiClient = createChatApiClient({
  apiBaseUrl: getRequiredApiBaseUrl(),
});

export function buildApiAssetUrl(assetUrl: string): string {
  // 서버가 "/static/..."처럼 상대 경로를 주면 API 서버 주소를 붙여 실제 이미지 주소로 만듭니다.
  if (assetUrl.startsWith("http://") || assetUrl.startsWith("https://")) {
    return assetUrl;
  }

  const apiBaseUrl = getRequiredApiBaseUrl().replace(/\/+$/, "");
  const cleanAssetUrl = assetUrl.startsWith("/") ? assetUrl : `/${assetUrl}`;
  return `${apiBaseUrl}${cleanAssetUrl}`;
}

export async function fetchAiModelOptionList(): Promise<AiModelOptionListResponse> {
  // AI 모델 목록은 서버가 관리하므로 클라이언트는 목록을 요청해서 사용합니다.
  return chatApiClient.fetchAiModelOptionList();
}

export async function fetchDailyRequestUsage(): Promise<ClientDailyRequestUsageResponse> {
  return chatApiClient.fetchDailyRequestUsage();
}

export async function fetchAdminDailyRequestUsage(
  adminApiKey: string
): Promise<AdminDailyRequestUsageResponse> {
  return chatApiClient.fetchAdminDailyRequestUsage(adminApiKey);
}

export async function resetAdminDailyRequestUsage(
  adminApiKey: string
): Promise<AdminDailyRequestUsageResponse> {
  return chatApiClient.resetAdminDailyRequestUsage(adminApiKey);
}

export async function resetAdminDailyRequestIpUsage(
  adminApiKey: string,
  ipAddress: string
): Promise<AdminDailyRequestUsageResponse> {
  return chatApiClient.resetAdminDailyRequestIpUsage(adminApiKey, ipAddress);
}

export async function updateAdminDailyRequestIpCount(
  adminApiKey: string,
  ipAddress: string,
  dailyRequestCount: number
): Promise<AdminDailyRequestUsageResponse> {
  return chatApiClient.updateAdminDailyRequestIpCount(
    adminApiKey,
    ipAddress,
    dailyRequestCount
  );
}

export async function fetchCharacterList(): Promise<CharacterSummary[]> {
  // 캐릭터 정보도 서버가 관리하므로 서버에서 받아옵니다.
  return chatApiClient.fetchCharacterList();
}

export async function createChatSession(
  characterId: string,
  guestId: string,
  aiModelProvider?: AiModelProvider
): Promise<ChatSessionSummary> {
  // 서버는 guestId와 characterId 기준으로 기존 세션을 열거나 새로 만듭니다.
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
  // 선택된 세션의 기존 대화 내역을 불러옵니다.
  return chatApiClient.fetchChatMessageList(chatSessionId);
}

export async function createChatMessage(
  chatSessionId: string,
  userMessageText: string,
  aiModelProvider?: AiModelProvider
): Promise<ChatMessageCreateResponse> {
  // 사용자의 새 메시지를 서버로 보내고, 서버가 만든 AI 답변까지 함께 받습니다.
  return chatApiClient.createChatMessage(
    chatSessionId,
    userMessageText,
    aiModelProvider
  );
}
