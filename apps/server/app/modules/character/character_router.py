from fastapi import APIRouter

from app.exceptions.app_exception import NotFoundException
from app.modules.character.character_data import (
    find_character_detail_by_id,
    get_character_summary_list,
)
from app.modules.character.character_schema import CharacterDetail, CharacterSummary

character_router = APIRouter(prefix="/characters", tags=["character"])


@character_router.get("", response_model=list[CharacterSummary])
def get_character_list() -> list[CharacterSummary]:
    return get_character_summary_list()


@character_router.get("/{character_id}", response_model=CharacterDetail)
def get_character_detail(character_id: str) -> CharacterDetail:
    character = find_character_detail_by_id(character_id)
    if character is None:
        raise NotFoundException(f"Character not found: {character_id}")
    return character
