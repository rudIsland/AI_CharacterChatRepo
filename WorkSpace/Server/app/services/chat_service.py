from collections.abc import Callable

from app.config import Settings
from app.domain.entities.conversation import Message
from app.providers.model_provider import ModelProvider, ProviderChatRequest, ProviderMessage, create_model_provider
from app.repositories.character_repository import CharacterRepository
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.memory_repository import MemoryRepository
from app.schemas.chat_request import ChatRequest
from app.schemas.chat_response import ChatResponse


class EntityNotFoundError(Exception):
    pass


class ConversationValidationError(Exception):
    pass


class ChatService:
    def __init__(
        self,
        character_repository: CharacterRepository,
        conversation_repository: ConversationRepository,
        memory_repository: MemoryRepository,
        settings: Settings,
        provider_builder: Callable[[str], ModelProvider] | None = None,
    ):
        self.character_repository = character_repository
        self.conversation_repository = conversation_repository
        self.memory_repository = memory_repository
        self.settings = settings
        self.provider_builder = provider_builder or (
            lambda provider_name: create_model_provider(settings, provider_name)
        )

    def chat(self, payload: ChatRequest) -> ChatResponse:
        character = self.character_repository.get_by_id(payload.character_id)
        if character is None:
            raise EntityNotFoundError("Character not found.")

        conversation = self._get_or_create_conversation(
            conversation_id=payload.conversation_id,
            character_id=character.id,
            character_name=character.name,
        )

        self.conversation_repository.add_message(
            conversation_id=conversation.id,
            role="user",
            content=payload.user_message,
        )

        messages = self.conversation_repository.list_messages(conversation.id)
        memories = self.memory_repository.list_by_character_id(character.id)
        provider_name = character.model_provider or self.settings.default_model_provider
        model_name = character.model_name or self.settings.default_model_name
        provider = self.provider_builder(provider_name)

        provider_request = ProviderChatRequest(
            model=model_name,
            temperature=character.temperature,
            messages=self._build_provider_messages(
                system_prompt=character.system_prompt,
                memory_contents=[memory.content for memory in memories],
                messages=messages,
            ),
        )
        provider_response = provider.generate_reply(provider_request)

        assistant_message = self.conversation_repository.add_message(
            conversation_id=conversation.id,
            role="assistant",
            content=provider_response.content,
        )

        return ChatResponse(
            conversation_id=conversation.id,
            character_id=character.id,
            provider=provider_name,
            model_name=model_name,
            reply=assistant_message.content,
            assistant_message_id=assistant_message.id,
        )

    def _get_or_create_conversation(
        self,
        conversation_id: str | None,
        character_id: str,
        character_name: str,
    ):
        if conversation_id is None:
            return self.conversation_repository.create(
                character_id=character_id,
                title=f"{character_name} chat",
            )

        conversation = self.conversation_repository.get_by_id(conversation_id)
        if conversation is None:
            raise EntityNotFoundError("Conversation not found.")

        if conversation.character_id != character_id:
            raise ConversationValidationError(
                "Conversation does not belong to the requested character."
            )

        return conversation

    def _build_provider_messages(
        self,
        system_prompt: str,
        memory_contents: list[str],
        messages: list[Message],
    ) -> list[ProviderMessage]:
        system_lines = [system_prompt]
        if memory_contents:
            system_lines.append("Known memories:")
            system_lines.extend(f"- {content}" for content in memory_contents)

        provider_messages = [
            ProviderMessage(
                role="system",
                content="\n".join(system_lines),
            )
        ]

        for message in messages:
            provider_messages.append(
                ProviderMessage(
                    role=message.role,
                    content=message.content,
                )
            )

        return provider_messages
