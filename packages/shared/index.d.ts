export type ChatRole = "user" | "assistant";
export type AiModelProvider = "gpt" | "gemini" | "local_ai";

export interface CharacterSummary {
  /** 캐릭터를 구분하는 고유 ID입니다. */
  character_id: string;
  /** 화면에 보여줄 캐릭터 이름입니다. */
  character_name: string;
  /** 캐릭터를 한 줄로 소개하는 짧은 설명입니다. */
  character_description: string;
  /** 캐릭터의 성별 또는 성별 표현입니다. */
  character_gender: string;
  /** 캐릭터의 나이대입니다. */
  character_age_range: string;
  /** 캐릭터가 어떤 배경을 가진 인물인지 설명하는 내용입니다. */
  character_background: string;
  /** 캐릭터의 말투와 성격을 화면에 보여주기 위한 내용입니다. */
  character_personality: string;
  /** 캐릭터 이미지 파일을 가져올 수 있는 서버 상대 경로입니다. */
  character_image_url: string;
}

export interface ChatSessionSummary {
  /** 대화 세션을 구분하는 고유 ID입니다. */
  chat_session_id: string;
  /** 이 세션에서 대화하는 캐릭터의 고유 ID입니다. */
  character_id: string;
  /** 이 세션을 가진 임시 사용자 ID입니다. */
  guest_id: string;
  /** 이 세션에서 마지막으로 선택한 AI 제공자입니다. */
  ai_model_provider: AiModelProvider;
  /** 세션이 처음 만들어진 시간입니다. */
  created_at: string;
}

export interface ChatMessage {
  /** 메시지를 구분하는 고유 ID입니다. */
  message_id: string;
  /** 메시지를 보낸 주체입니다. */
  role: ChatRole;
  /** 채팅창에 보여줄 실제 메시지 내용입니다. */
  message_text: string;
  /** AI 응답 생성에 사용된 입력 토큰 수입니다. */
  input_token_count?: number | null;
  /** AI가 생성한 출력 토큰 수입니다. */
  output_token_count?: number | null;
  /** 입력과 출력을 합친 전체 토큰 수입니다. */
  total_token_count?: number | null;
  /** 메시지가 저장된 시간입니다. */
  created_at: string;
}

export interface ChatMessageCreateResponse {
  /** 메시지가 추가된 대화 세션 ID입니다. */
  chat_session_id: string;
  /** 서버에 저장된 사용자 메시지입니다. */
  user_message: ChatMessage;
  /** AI가 생성하고 서버에 저장한 답변입니다. */
  assistant_message: ChatMessage;
  /** 이 세션에서 지금까지 사용한 누적 토큰 수입니다. */
  used_token_count: number;
  /** 이 세션에서 사용할 수 있는 전체 토큰 한도입니다. */
  token_limit_count: number;
}

export interface ChatMessageListResponse {
  /** 메시지 목록을 조회한 대화 세션 ID입니다. */
  chat_session_id: string;
  /** 이 세션에 저장된 사용자와 AI 메시지 목록입니다. */
  message_list: ChatMessage[];
  /** 이 세션에서 지금까지 사용한 누적 토큰 수입니다. */
  used_token_count: number;
  /** 이 세션에서 사용할 수 있는 전체 토큰 한도입니다. */
  token_limit_count: number;
}

export interface AiModelOption {
  /** 클라이언트가 서버에 전달할 AI 제공자 코드입니다. */
  ai_model_provider: AiModelProvider;
  /** 서버 환경변수에서 관리하는 실제 모델 이름입니다. */
  ai_model_name: string;
  /** 클라이언트 화면에 보여줄 모델 표시 이름입니다. */
  ai_model_label: string;
}

export interface AiModelOptionListResponse {
  /** 클라이언트가 선택할 수 있는 AI 모델 옵션 목록입니다. */
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
