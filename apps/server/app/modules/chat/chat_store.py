from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Lock
from typing import Literal
from uuid import uuid4

from app.modules.chat.chat_schema import AiModelProvider


@dataclass
class StoredChatSession:
    chat_session_id: str
    character_id: str
    guest_id: str
    ai_model_provider: AiModelProvider
    created_at: datetime
    message_list: list["StoredChatMessage"] = field(default_factory=list)

@dataclass
class StoredChatMessage:
    message_id: str
    role: Literal["user", "assistant"]
    message_text: str
    created_at: datetime


class InMemoryChatStore:
    def __init__(self) -> None:
        self._chat_session_map: dict[str, StoredChatSession] = {}
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
    ) -> StoredChatMessage:
        with self._write_lock:
            chat_session = self._chat_session_map[chat_session_id]
            chat_message = StoredChatMessage(
                message_id=str(uuid4()),
                role=role,
                message_text=message_text,
                created_at=datetime.now(timezone.utc),
            )
            chat_session.message_list.append(chat_message)
            return chat_message
