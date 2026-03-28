from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings
from app.database import Base
from app.main import health_check
from app.providers.model_provider import ModelProvider, ProviderChatRequest, ProviderChatResponse
from app.repositories.character_repository import CharacterRepository
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.memory_repository import MemoryRepository
from app.schemas.character import CharacterCreate
from app.schemas.chat_request import ChatRequest
from app.services.chat_service import ChatService


class StaticProvider(ModelProvider):
    def generate_reply(self, request: ProviderChatRequest) -> ProviderChatResponse:
        last_message = request.messages[-1].content
        return ProviderChatResponse(content=f"echo:{last_message}")


def build_test_session() -> Session:
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    return session_factory()


def test_chat_service_saves_user_and_assistant_messages() -> None:
    db = build_test_session()
    character_repository = CharacterRepository(db)
    conversation_repository = ConversationRepository(db)
    memory_repository = MemoryRepository(db)

    character = character_repository.create(
        CharacterCreate(
            name="Test Character",
            description="A test profile",
            system_prompt="You are helpful.",
            greeting_message="Hello",
            model_provider="ollama",
            model_name="test-model",
            temperature=0.5,
        )
    )

    service = ChatService(
        character_repository=character_repository,
        conversation_repository=conversation_repository,
        memory_repository=memory_repository,
        settings=Settings(),
        provider_builder=lambda provider_name: StaticProvider(),
    )

    response = service.chat(
        ChatRequest(
            character_id=character.id,
            user_message="ping",
        )
    )

    messages = conversation_repository.list_messages(response.conversation_id)

    assert response.reply == "echo:ping"
    assert len(messages) == 2
    assert messages[0].role == "user"
    assert messages[1].role == "assistant"


def test_health_check_returns_service_metadata() -> None:
    response = health_check()

    assert response.status == "ok"
    assert response.app_name == "AI Character Chat API"
    assert response.environment == "development"
