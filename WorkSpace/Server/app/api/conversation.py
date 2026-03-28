from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.character_repository import CharacterRepository
from app.repositories.conversation_repository import ConversationRepository
from app.schemas.conversation import ConversationCreate, ConversationRead, MessageRead
from app.services.character_service import CharacterService
from app.services.conversation_service import ConversationService
from app.config import get_settings

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("", response_model=ConversationRead, status_code=status.HTTP_201_CREATED)
def create_conversation(
    payload: ConversationCreate,
    db: Session = Depends(get_db),
) -> ConversationRead:
    character_service = CharacterService(CharacterRepository(db), get_settings())
    conversation_service = ConversationService(ConversationRepository(db))

    character = character_service.get_character(payload.character_id)
    if character is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Character not found.")

    conversation = conversation_service.create_conversation(
        character_id=payload.character_id,
        title=payload.title or f"{character.name} chat",
    )
    return ConversationRead.model_validate(conversation)


@router.get("/{conversation_id}/messages", response_model=list[MessageRead])
def list_messages(
    conversation_id: str,
    db: Session = Depends(get_db),
) -> list[MessageRead]:
    conversation_service = ConversationService(ConversationRepository(db))
    conversation = conversation_service.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    messages = conversation_service.list_messages(conversation_id)
    return [MessageRead.model_validate(message) for message in messages]
