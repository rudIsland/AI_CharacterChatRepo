from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Lock
from typing import Literal
from uuid import uuid4

from app.modules.chat.chat_schema import AiModelProvider


@dataclass
class StoredChatSession:
    # 클라이언트가 특정 대화방을 다시 열 때 사용하는 고유 ID입니다.
    chat_session_id: str
    # 이 세션에서 대화하는 캐릭터의 고유 ID입니다.
    character_id: str
    # 로그인 전에도 같은 사용자를 구분하기 위한 임시 사용자 ID입니다.
    guest_id: str
    # 이 세션에서 마지막으로 선택한 AI 제공자입니다.
    ai_model_provider: AiModelProvider
    # 세션이 처음 만들어진 시간입니다.
    created_at: datetime
    # 이 세션에 속한 사용자와 AI 메시지를 순서대로 저장합니다.
    message_list: list["StoredChatMessage"] = field(default_factory=list)


@dataclass
class StoredChatMessage:
    # 메시지 한 개를 구분하기 위한 고유 ID입니다.
    message_id: str
    # 메시지를 보낸 주체입니다. user는 사용자, assistant는 AI입니다.
    role: Literal["user", "assistant"]
    # 채팅창에 보여줄 실제 메시지 내용입니다.
    message_text: str
    # AI 응답 생성에 사용된 입력 토큰 수입니다. 사용자 메시지는 None입니다.
    input_token_count: int | None = None
    # AI가 생성한 출력 토큰 수입니다. 사용자 메시지는 None입니다.
    output_token_count: int | None = None
    # 입력과 출력을 합친 전체 토큰 수입니다. 사용자 메시지는 None입니다.
    total_token_count: int | None = None
    # 메시지가 저장된 시간입니다.
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class InMemoryChatStore:
    def __init__(self) -> None:
        # 포트폴리오 데모용 임시 저장소입니다. 서버가 재시작되면 대화는 초기화됩니다.
        self._chat_session_map: dict[str, StoredChatSession] = {}
        # 동시에 들어오는 저장 요청이 데이터를 꼬이게 만들지 않도록 잠급니다.
        self._write_lock = Lock()

    def create_chat_session(
        self,
        character_id: str,
        guest_id: str,
        ai_model_provider: AiModelProvider,
    ) -> StoredChatSession:
        with self._write_lock:
            chat_session = StoredChatSession(
                chat_session_id=str(uuid4()),
                character_id=character_id,
                guest_id=guest_id,
                ai_model_provider=ai_model_provider,
                created_at=datetime.now(timezone.utc),
            )
            self._chat_session_map[chat_session.chat_session_id] = chat_session
            return chat_session

    def find_chat_session_by_guest_id_and_character_id(
        self,
        guest_id: str,
        character_id: str,
    ) -> StoredChatSession | None:
        for chat_session in self._chat_session_map.values():
            if (
                chat_session.guest_id == guest_id
                and chat_session.character_id == character_id
            ):
                return chat_session
        return None

    def update_chat_session_ai_model_provider(
        self,
        chat_session_id: str,
        ai_model_provider: AiModelProvider,
    ) -> None:
        with self._write_lock:
            chat_session = self._chat_session_map.get(chat_session_id)
            if chat_session is None:
                return
            chat_session.ai_model_provider = ai_model_provider

    def find_chat_session_by_id(self, chat_session_id: str) -> StoredChatSession | None:
        return self._chat_session_map.get(chat_session_id)

    def list_chat_session_by_guest_id(self, guest_id: str) -> list[StoredChatSession]:
        session_list = [
            chat_session
            for chat_session in self._chat_session_map.values()
            if chat_session.guest_id == guest_id
        ]
        session_list.sort(key=lambda chat_session: chat_session.created_at, reverse=True)
        return session_list

    def list_chat_message_by_session_id(self, chat_session_id: str) -> list[StoredChatMessage]:
        chat_session = self.find_chat_session_by_id(chat_session_id)
        if chat_session is None:
            return []
        return list(chat_session.message_list)

    def append_chat_message(
        self,
        chat_session_id: str,
        role: Literal["user", "assistant"],
        message_text: str,
        input_token_count: int | None = None,
        output_token_count: int | None = None,
        total_token_count: int | None = None,
    ) -> StoredChatMessage:
        with self._write_lock:
            chat_session = self._chat_session_map[chat_session_id]
            chat_message = StoredChatMessage(
                message_id=str(uuid4()),
                role=role,
                message_text=message_text,
                input_token_count=input_token_count,
                output_token_count=output_token_count,
                total_token_count=total_token_count,
                created_at=datetime.now(timezone.utc),
            )
            chat_session.message_list.append(chat_message)
            return chat_message
