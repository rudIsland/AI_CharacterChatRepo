from app.repositories.memory_repository import MemoryRepository
from app.schemas.memory import MemoryCreate


class MemoryService:
    def __init__(self, repository: MemoryRepository):
        self.repository = repository

    def create_memory(self, payload: MemoryCreate):
        return self.repository.create(payload)

    def list_memories(self, character_id: str):
        return self.repository.list_by_character_id(character_id)
