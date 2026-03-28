from app.config import Settings
from app.repositories.character_repository import CharacterRepository
from app.schemas.character import CharacterCreate


class CharacterService:
    def __init__(self, repository: CharacterRepository, settings: Settings):
        self.repository = repository
        self.settings = settings

    def create_character(self, payload: CharacterCreate):
        profile = payload.model_copy(
            update={
                "model_provider": payload.model_provider or self.settings.default_model_provider,
                "model_name": payload.model_name or self.settings.default_model_name,
            }
        )
        return self.repository.create(profile)

    def get_character(self, character_id: str):
        return self.repository.get_by_id(character_id)

    def list_characters(self):
        return self.repository.list_all()
