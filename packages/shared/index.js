/**
 * @typedef {'user' | 'assistant'} ChatRole
 */

/**
 * @typedef {'gpt' | 'gemini' | 'local_ai'} AiModelProvider
 */

/**
 * @typedef {{
 *   character_id: string;
 *   character_name: string;
 *   character_description: string;
 *   character_gender: string;
 *   character_age_range: string;
 *   character_background: string;
 *   character_personality: string;
 *   character_image_url: string;
 * }} CharacterSummary
 */

/**
 * @typedef {{
 *   chat_session_id: string;
 *   character_id: string;
 *   guest_id: string;
 *   ai_model_provider: AiModelProvider;
 *   created_at: string;
 * }} ChatSessionSummary
 */

/**
 * @typedef {{
 *   message_id: string;
 *   role: ChatRole;
 *   message_text: string;
 *   input_token_count?: number | null;
 *   output_token_count?: number | null;
 *   total_token_count?: number | null;
 *   created_at: string;
 * }} ChatMessage
 */

/**
 * @typedef {{
 *   chat_session_id: string;
 *   user_message: ChatMessage;
 *   assistant_message: ChatMessage;
 *   used_token_count: number;
 *   token_limit_count: number;
 * }} ChatMessageCreateResponse
 */

/**
 * @typedef {{
 *   ai_model_provider: AiModelProvider;
 *   ai_model_name: string;
 *   ai_model_label: string;
 * }} AiModelOption
 */

/**
 * @typedef {{
 *   ai_model_option_list: AiModelOption[];
 * }} AiModelOptionListResponse
 */

/**
 * @typedef {{
 *   chat_session_id: string;
 *   message_list: ChatMessage[];
 *   used_token_count: number;
 *   token_limit_count: number;
 * }} ChatMessageListResponse
 */

/**
 * @typedef {{
 *   current_date: string;
 *   daily_request_count: number;
 *   daily_request_limit: number;
 *   client_ip_address: string;
 *   client_daily_request_count: number;
 *   client_daily_request_limit: number;
 * }} ClientDailyRequestUsageResponse
 */

/**
 * @typedef {{
 *   ip_address: string;
 *   daily_request_count: number;
 *   daily_request_limit: number;
 *   access_count: number;
 *   last_access_at: string | null;
 * }} DailyRequestIpUsage
 */

/**
 * @typedef {{
 *   current_date: string;
 *   daily_request_count: number;
 *   daily_request_limit: number;
 *   daily_request_limit_per_ip: number;
 *   daily_request_count_by_ip: Record<string, number>;
 *   access_count_by_ip: Record<string, number>;
 *   last_access_at_by_ip: Record<string, string>;
 *   ip_usage_list: DailyRequestIpUsage[];
 * }} AdminDailyRequestUsageResponse
 */

export const USER_MESSAGE_MAX_LENGTH = 500;

const DEFAULT_REQUEST_TIMEOUT_MS = 45_000;
const DEFAULT_RETRY_COUNT = 2;
const RETRY_DELAY_MS = 300;

export class ChatApiError extends Error {
  /**
   * @param {string} message
   * @param {{
   *   statusCode?: number;
   *   requestPath?: string;
   *   responseBody?: unknown;
   *   isTimeout?: boolean;
   *   isNetworkError?: boolean;
   *   cause?: unknown;
   * }} [params]
   */
  constructor(message, params = {}) {
    super(message);
    this.name = "ChatApiError";
    this.statusCode = params.statusCode;
    this.requestPath = params.requestPath;
    this.responseBody = params.responseBody;
    this.isTimeout = Boolean(params.isTimeout);
    this.isNetworkError = Boolean(params.isNetworkError);
    this.cause = params.cause;
  }
}

function removeTrailingSlash(url) {
  return url.replace(/\/+$/, "");
}

function getRequiredApiBaseUrl(apiBaseUrl) {
  if (typeof apiBaseUrl !== "string" || !apiBaseUrl.trim()) {
    throw new Error("apiBaseUrl is required.");
  }
  return removeTrailingSlash(apiBaseUrl.trim());
}

function getRequestOptions(params) {
  return {
    requestTimeoutMs: params.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
    retryCount: params.retryCount ?? DEFAULT_RETRY_COUNT,
  };
}

function buildRequestHeaders(requestInit) {
  const headers = new Headers(requestInit?.headers ?? {});
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  return headers;
}

function buildAdminRequestHeaders(adminApiKey) {
  return {
    "Content-Type": "application/json",
    "X-Admin-Api-Key": adminApiKey,
  };
}

function getRequestMethod(requestInit) {
  return (requestInit?.method ?? "GET").toUpperCase();
}

function createTimeoutController(timeoutMs) {
  if (typeof AbortController === "undefined") {
    return {
      signal: undefined,
      clear() {},
      isTimeout() {
        return false;
      },
    };
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);
  return {
    signal: abortController.signal,
    clear() {
      clearTimeout(timeoutId);
    },
    isTimeout() {
      return abortController.signal.aborted;
    },
  };
}

async function parseResponseBody(response) {
  const responseText = await response.text();
  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch (error) {
    return responseText;
  }
}

function getFastApiValidationMessage(detailList) {
  const messageList = detailList
    .map((detail) => {
      if (!detail || typeof detail !== "object") {
        return "";
      }

      const message = typeof detail.msg === "string" ? detail.msg : "";
      const location = Array.isArray(detail.loc)
        ? detail.loc.filter((item) => item !== "body").join(".")
        : "";

      if (location && message) {
        return `${location}: ${message}`;
      }
      return message;
    })
    .filter(Boolean);

  return messageList.join(", ");
}

function getErrorMessageFromResponse(responseBody, fallbackMessage) {
  if (typeof responseBody === "string") {
    return responseBody;
  }

  if (!responseBody || typeof responseBody !== "object") {
    return fallbackMessage;
  }

  const detail = responseBody.detail;
  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return getFastApiValidationMessage(detail) || fallbackMessage;
  }

  return fallbackMessage;
}

function shouldRetryRequest(error, method) {
  if (method !== "GET") {
    return false;
  }

  if (error instanceof ChatApiError) {
    return (
      error.isTimeout ||
      error.isNetworkError ||
      error.statusCode === 429 ||
      error.statusCode === 500 ||
      error.statusCode === 502 ||
      error.statusCode === 503 ||
      error.statusCode === 504
    );
  }

  return false;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function requestJsonOnce(apiBaseUrl, requestPath, requestInit, timeoutMs) {
  const timeoutController = createTimeoutController(timeoutMs);

  try {
    const response = await fetch(`${apiBaseUrl}${requestPath}`, {
      ...requestInit,
      headers: buildRequestHeaders(requestInit),
      signal: timeoutController.signal,
    });
    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      const fallbackMessage = `Request failed: ${response.status}`;
      throw new ChatApiError(
        getErrorMessageFromResponse(responseBody, fallbackMessage),
        {
          statusCode: response.status,
          requestPath,
          responseBody,
        }
      );
    }

    return responseBody;
  } catch (error) {
    if (error instanceof ChatApiError) {
      throw error;
    }

    if (timeoutController.isTimeout()) {
      throw new ChatApiError("서버 응답 시간이 초과되었습니다.", {
        requestPath,
        isTimeout: true,
        cause: error,
      });
    }

    throw new ChatApiError("서버에 연결하지 못했습니다.", {
      requestPath,
      isNetworkError: true,
      cause: error,
    });
  } finally {
    timeoutController.clear();
  }
}

async function requestJson(apiBaseUrl, requestPath, requestInit, options) {
  const method = getRequestMethod(requestInit);
  const retryCount = method === "GET" ? options.retryCount : 0;

  for (let attemptIndex = 0; attemptIndex <= retryCount; attemptIndex += 1) {
    try {
      return await requestJsonOnce(
        apiBaseUrl,
        requestPath,
        requestInit,
        options.requestTimeoutMs
      );
    } catch (error) {
      const isLastAttempt = attemptIndex >= retryCount;
      if (isLastAttempt || !shouldRetryRequest(error, method)) {
        throw error;
      }
      await delay(RETRY_DELAY_MS * (attemptIndex + 1));
    }
  }
}

/**
 * @param {{ apiBaseUrl: string; requestTimeoutMs?: number; retryCount?: number }} params
 */
export function createChatApiClient(params) {
  const apiBaseUrl = getRequiredApiBaseUrl(params.apiBaseUrl);
  const requestOptions = getRequestOptions(params);

  return {
    /** @returns {Promise<AiModelOptionListResponse>} */
    fetchAiModelOptionList() {
      return requestJson(apiBaseUrl, "/ai-model-options", undefined, requestOptions);
    },

    /** @returns {Promise<ClientDailyRequestUsageResponse>} */
    fetchDailyRequestUsage() {
      return requestJson(
        apiBaseUrl,
        "/daily-request-usage",
        undefined,
        requestOptions
      );
    },

    /**
     * @param {string} adminApiKey
     * @returns {Promise<AdminDailyRequestUsageResponse>}
     */
    fetchAdminDailyRequestUsage(adminApiKey) {
      return requestJson(
        apiBaseUrl,
        "/admin/usage",
        {
          headers: buildAdminRequestHeaders(adminApiKey),
        },
        requestOptions
      );
    },

    /**
     * @param {string} adminApiKey
     * @returns {Promise<AdminDailyRequestUsageResponse>}
     */
    resetAdminDailyRequestUsage(adminApiKey) {
      return requestJson(
        apiBaseUrl,
        "/admin/usage/reset",
        {
          method: "POST",
          headers: buildAdminRequestHeaders(adminApiKey),
        },
        requestOptions
      );
    },

    /**
     * @param {string} adminApiKey
     * @param {string} ipAddress
     * @returns {Promise<AdminDailyRequestUsageResponse>}
     */
    resetAdminDailyRequestIpUsage(adminApiKey, ipAddress) {
      return requestJson(
        apiBaseUrl,
        "/admin/usage/ip/reset",
        {
          method: "POST",
          headers: buildAdminRequestHeaders(adminApiKey),
          body: JSON.stringify({ ip_address: ipAddress }),
        },
        requestOptions
      );
    },

    /** @returns {Promise<CharacterSummary[]>} */
    fetchCharacterList() {
      return requestJson(apiBaseUrl, "/characters", undefined, requestOptions);
    },

    /**
     * @param {string} characterId
     * @param {string} guestId
     * @param {AiModelProvider} [aiModelProvider]
     * @returns {Promise<ChatSessionSummary>}
     */
    createChatSession(characterId, guestId, aiModelProvider) {
      return requestJson(
        apiBaseUrl,
        "/chat-sessions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            character_id: characterId,
            guest_id: guestId,
            ...(aiModelProvider ? { ai_model_provider: aiModelProvider } : {}),
          }),
        },
        requestOptions
      );
    },

    /**
     * @param {string} guestId
     * @returns {Promise<ChatSessionSummary[]>}
     */
    listChatSessionByGuestId(guestId) {
      const query = encodeURIComponent(guestId);
      return requestJson(
        apiBaseUrl,
        `/chat-sessions?guest_id=${query}`,
        undefined,
        requestOptions
      );
    },

    /**
     * @param {string} chatSessionId
     * @returns {Promise<ChatMessageListResponse>}
     */
    fetchChatMessageList(chatSessionId) {
      return requestJson(
        apiBaseUrl,
        `/chat-sessions/${chatSessionId}/messages`,
        undefined,
        requestOptions
      );
    },

    /**
     * @param {string} chatSessionId
     * @param {string} userMessageText
     * @param {AiModelProvider} [aiModelProvider]
     * @returns {Promise<ChatMessageCreateResponse>}
     */
    createChatMessage(chatSessionId, userMessageText, aiModelProvider) {
      return requestJson(
        apiBaseUrl,
        `/chat-sessions/${chatSessionId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_message_text: userMessageText,
            ai_model_provider: aiModelProvider ?? null,
          }),
        },
        requestOptions
      );
    },
  };
}
