from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.entities.conversation import Conversation, Message


class ConversationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, character_id: str, title: str) -> Conversation:
        conversation = Conversation(character_id=character_id, title=title)
        self.db.add(conversation)
        self.db.commit()
        self.db.refresh(conversation)
        return conversation

    def get_by_id(self, conversation_id: str) -> Conversation | None:
        statement = select(Conversation).where(Conversation.id == conversation_id)
        return self.db.scalar(statement)

    def add_message(self, conversation_id: str, role: str, content: str) -> Message:
        conversation = self.get_by_id(conversation_id)
        if conversation is None:
            raise ValueError("Conversation not found.")

        conversation.updated_at = datetime.now(timezone.utc)
        message = Message(conversation_id=conversation_id, role=role, content=content)
        self.db.add(message)
        self.db.add(conversation)
        self.db.commit()
        self.db.refresh(message)
        return message

    def list_messages(self, conversation_id: str) -> list[Message]:
        statement = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc(), Message.id.asc())
        )
        return list(self.db.scalars(statement))
