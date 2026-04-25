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

function removeTrailingSlash(url) {
  return url.replace(/\/+$/, "");
}

async function requestJson(apiBaseUrl, requestPath, requestInit) {
  const response = await fetch(`${apiBaseUrl}${requestPath}`, requestInit);
  if (!response.ok) {
    const responseText = await response.text();
    let responseMessage = responseText;
    try {
      const responseBody = JSON.parse(responseText);
      if (typeof responseBody.detail === "string") {
        responseMessage = responseBody.detail;
      }
    } catch (error) {
      responseMessage = responseText;
    }
    throw new Error(responseMessage || `Request failed: ${response.status}`);
  }
  return await response.json();
}

/**
 * @param {{ apiBaseUrl: string }} params
 */
export function createChatApiClient(params) {
  const apiBaseUrl = removeTrailingSlash(params.apiBaseUrl);

  return {
    /** @returns {Promise<AiModelOptionListResponse>} */
    fetchAiModelOptionList() {
      return requestJson(apiBaseUrl, "/ai-model-options");
    },

    /** @returns {Promise<CharacterSummary[]>} */
    fetchCharacterList() {
      return requestJson(apiBaseUrl, "/characters");
    },

    /**
     * @param {string} characterId
     * @param {string} guestId
     * @param {AiModelProvider} [aiModelProvider]
     * @returns {Promise<ChatSessionSummary>}
     */
    createChatSession(characterId, guestId, aiModelProvider) {
      return requestJson(apiBaseUrl, "/chat-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            character_id: characterId,
            guest_id: guestId,
            ...(aiModelProvider ? { ai_model_provider: aiModelProvider } : {}),
          }),
        });
    },

    /**
     * @param {string} guestId
     * @returns {Promise<ChatSessionSummary[]>}
     */
    listChatSessionByGuestId(guestId) {
      const query = encodeURIComponent(guestId);
      return requestJson(apiBaseUrl, `/chat-sessions?guest_id=${query}`);
    },

    /**
     * @param {string} chatSessionId
     * @returns {Promise<ChatMessageListResponse>}
     */
    fetchChatMessageList(chatSessionId) {
      return requestJson(
        apiBaseUrl,
        `/chat-sessions/${chatSessionId}/messages`
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
        }
      );
    },
  };
}
