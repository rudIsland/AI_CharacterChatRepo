from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.repositories.character_repository import CharacterRepository
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.memory_repository import MemoryRepository
from app.schemas.chat_request import ChatRequest
from app.schemas.chat_response import ChatResponse
from app.services.chat_service import ChatService, ConversationValidationError, EntityNotFoundError

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
) -> ChatResponse:
    service = ChatService(
        character_repository=CharacterRepository(db),
        conversation_repository=ConversationRepository(db),
        memory_repository=MemoryRepository(db),
        settings=get_settings(),
    )

    try:
        return service.chat(payload)
    except EntityNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except ConversationValidationError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(error)) from error
