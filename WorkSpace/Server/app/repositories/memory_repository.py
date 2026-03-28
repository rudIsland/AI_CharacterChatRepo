from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.entities.memory import Memory
from app.schemas.memory import MemoryCreate


class MemoryRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, payload: MemoryCreate) -> Memory:
        memory = Memory(**payload.model_dump())
        self.db.add(memory)
        self.db.commit()
        self.db.refresh(memory)
        return memory

    def list_by_character_id(self, character_id: str) -> list[Memory]:
        statement = (
            select(Memory)
            .where(Memory.character_id == character_id)
            .order_by(Memory.created_at.asc())
        )
        return list(self.db.scalars(statement))
