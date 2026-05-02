from datetime import datetime, timezone
from typing import Literal, cast
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

from app.modules.chat.chat_schema import AiModelId
from app.modules.chat.chat_store import StoredChatMessage, StoredChatSession


def normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql+psycopg://", 1)
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return database_url


class ChatDatabaseBase(DeclarativeBase):
    pass


class ChatSessionRow(ChatDatabaseBase):
    __tablename__ = "chat_sessions"
    __table_args__ = (
        UniqueConstraint("guest_id", "character_id", name="uq_chat_sessions_guest_character"),
    )

    chat_session_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    character_id: Mapped[str] = mapped_column(String(50), index=True)
    guest_id: Mapped[str] = mapped_column(String(50), index=True)
    ai_model_id: Mapped[str] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    message_list: Mapped[list["ChatMessageRow"]] = relationship(
        back_populates="chat_session",
        cascade="all, delete-orphan",
        order_by="ChatMessageRow.created_at",
    )


class ChatMessageRow(ChatDatabaseBase):
    __tablename__ = "chat_messages"

    message_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    chat_session_id: Mapped[str] = mapped_column(ForeignKey("chat_sessions.chat_session_id"), index=True)
    role: Mapped[str] = mapped_column(String(20))
    message_text: Mapped[str] = mapped_column(Text)
    input_token_count: Mapped[int | None]
    output_token_count: Mapped[int | None]
    total_token_count: Mapped[int | None]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    chat_session: Mapped[ChatSessionRow] = relationship(back_populates="message_list")


class SqlChatStore:
    def __init__(self, database_url: str) -> None:
        engine_url = normalize_database_url(database_url)
        connect_args = {"check_same_thread": False} if engine_url.startswith("sqlite") else {}
        self._engine = create_engine(engine_url, pool_pre_ping=True, connect_args=connect_args)
        self._session_factory = sessionmaker(bind=self._engine, expire_on_commit=False)
        ChatDatabaseBase.metadata.create_all(self._engine)

    def create_chat_session(
        self,
        character_id: str,
        guest_id: str,
        ai_model_id: AiModelId,
    ) -> StoredChatSession:
        with self._session_factory() as database_session:
            existing_chat_session = self._find_chat_session_row_by_guest_and_character(
                database_session=database_session,
                guest_id=guest_id,
                character_id=character_id,
            )
            if existing_chat_session is not None:
                return self._build_stored_chat_session(existing_chat_session)

            chat_session_row = ChatSessionRow(
                chat_session_id=str(uuid4()),
                character_id=character_id,
                guest_id=guest_id,
                ai_model_id=ai_model_id,
                created_at=datetime.now(timezone.utc),
            )
            database_session.add(chat_session_row)
            try:
                database_session.commit()
            except IntegrityError:
                database_session.rollback()
                existing_chat_session = self._find_chat_session_row_by_guest_and_character(
                    database_session=database_session,
                    guest_id=guest_id,
                    character_id=character_id,
                )
                if existing_chat_session is not None:
                    return self._build_stored_chat_session(existing_chat_session)
                raise

            return self._build_stored_chat_session(chat_session_row)

    def find_chat_session_by_guest_id_and_character_id(self, guest_id: str, character_id: str) -> StoredChatSession | None:
        with self._session_factory() as database_session:
            chat_session_row = self._find_chat_session_row_by_guest_and_character(
                database_session=database_session,
                guest_id=guest_id,
                character_id=character_id,
            )
            if chat_session_row is None:
                return None
            return self._build_stored_chat_session(chat_session_row)

    def update_chat_session_ai_model_id(self, chat_session_id: str, ai_model_id: AiModelId) -> None:
        with self._session_factory() as database_session:
            chat_session_row = database_session.get(ChatSessionRow, chat_session_id)
            if chat_session_row is None:
                return
            chat_session_row.ai_model_id = ai_model_id
            database_session.commit()

    def find_chat_session_by_id(self, chat_session_id: str) -> StoredChatSession | None:
        with self._session_factory() as database_session:
            chat_session_row = database_session.get(ChatSessionRow, chat_session_id)
            if chat_session_row is None:
                return None
            return self._build_stored_chat_session(chat_session_row)

    def list_chat_session_by_guest_id(self, guest_id: str) -> list[StoredChatSession]:
        with self._session_factory() as database_session:
            chat_session_row_list = list(
                database_session.scalars(
                    select(ChatSessionRow)
                    .where(ChatSessionRow.guest_id == guest_id)
                    .order_by(ChatSessionRow.created_at.desc())
                )
            )
            return [
                self._build_stored_chat_session(chat_session_row)
                for chat_session_row in chat_session_row_list
            ]

    def list_chat_message_by_session_id(self, chat_session_id: str) -> list[StoredChatMessage]:
        with self._session_factory() as database_session:
            chat_message_row_list = list(
                database_session.scalars(
                    select(ChatMessageRow)
                    .where(ChatMessageRow.chat_session_id == chat_session_id)
                    .order_by(ChatMessageRow.created_at)
                )
            )
            return [
                self._build_stored_chat_message(chat_message_row)
                for chat_message_row in chat_message_row_list
            ]

    def append_chat_message(
        self,
        chat_session_id: str,
        role: Literal["user", "assistant"],
        message_text: str,
        input_token_count: int | None = None,
        output_token_count: int | None = None,
        total_token_count: int | None = None,
    ) -> StoredChatMessage:
        with self._session_factory() as database_session:
            chat_message_row = ChatMessageRow(
                message_id=str(uuid4()),
                chat_session_id=chat_session_id,
                role=role,
                message_text=message_text,
                input_token_count=input_token_count,
                output_token_count=output_token_count,
                total_token_count=total_token_count,
                created_at=datetime.now(timezone.utc),
            )
            database_session.add(chat_message_row)
            database_session.commit()
            return self._build_stored_chat_message(chat_message_row)

    def _find_chat_session_row_by_guest_and_character(
        self,
        database_session: Session,
        guest_id: str,
        character_id: str,
    ) -> ChatSessionRow | None:
        return database_session.scalars(
            select(ChatSessionRow).where(
                ChatSessionRow.guest_id == guest_id,
                ChatSessionRow.character_id == character_id,
            )
        ).first()

    def _build_stored_chat_session(self, chat_session_row: ChatSessionRow) -> StoredChatSession:
        return StoredChatSession(
            chat_session_id=chat_session_row.chat_session_id,
            character_id=chat_session_row.character_id,
            guest_id=chat_session_row.guest_id,
            ai_model_id=cast(AiModelId, chat_session_row.ai_model_id),
            created_at=self._ensure_timezone(chat_session_row.created_at),
            message_list=[
                self._build_stored_chat_message(chat_message_row)
                for chat_message_row in chat_session_row.message_list
            ],
        )

    def _build_stored_chat_message(self, chat_message_row: ChatMessageRow) -> StoredChatMessage:
        return StoredChatMessage(
            message_id=chat_message_row.message_id,
            role=cast(Literal["user", "assistant"], chat_message_row.role),
            message_text=chat_message_row.message_text,
            input_token_count=chat_message_row.input_token_count,
            output_token_count=chat_message_row.output_token_count,
            total_token_count=chat_message_row.total_token_count,
            created_at=self._ensure_timezone(chat_message_row.created_at),
        )

    def _ensure_timezone(self, date_time: datetime) -> datetime:
        if date_time.tzinfo is not None:
            return date_time
        return date_time.replace(tzinfo=timezone.utc)
