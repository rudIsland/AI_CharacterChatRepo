from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.repositories.character_repository import CharacterRepository
from app.schemas.character import CharacterCreate, CharacterRead
from app.services.character_service import CharacterService

router = APIRouter(prefix="/characters", tags=["characters"])


@router.get("", response_model=list[CharacterRead])
def list_characters(db: Session = Depends(get_db)) -> list[CharacterRead]:
    service = CharacterService(CharacterRepository(db), get_settings())
    characters = service.list_characters()
    return [CharacterRead.model_validate(character) for character in characters]


@router.post("", response_model=CharacterRead, status_code=status.HTTP_201_CREATED)
def create_character(
    payload: CharacterCreate,
    db: Session = Depends(get_db),
) -> CharacterRead:
    service = CharacterService(CharacterRepository(db), get_settings())
    character = service.create_character(payload)
    return CharacterRead.model_validate(character)
