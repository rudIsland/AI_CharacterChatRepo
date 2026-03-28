from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.entities.character import Character
from app.schemas.character import CharacterProfile


class CharacterRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, profile: CharacterProfile) -> Character:
        character = Character(**profile.model_dump())
        self.db.add(character)
        self.db.commit()
        self.db.refresh(character)
        return character

    def get_by_id(self, character_id: str) -> Character | None:
        statement = select(Character).where(Character.id == character_id)
        return self.db.scalar(statement)

    def list_all(self) -> list[Character]:
        statement = select(Character).order_by(Character.created_at.desc())
        return list(self.db.scalars(statement))
