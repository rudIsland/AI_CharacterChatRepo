from abc import ABC, abstractmethod
from typing import Literal

from pydantic import BaseModel, Field

from app.config import Settings


class ProviderMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1)


class ProviderChatRequest(BaseModel):
    model: str = Field(min_length=1)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    messages: list[ProviderMessage]


class ProviderChatResponse(BaseModel):
    content: str = Field(min_length=1)


class ModelProvider(ABC):
    @abstractmethod
    def generate_reply(self, request: ProviderChatRequest) -> ProviderChatResponse:
        raise NotImplementedError


def create_model_provider(settings: Settings, provider_name: str) -> ModelProvider:
    normalized_name = provider_name.strip().lower()

    if normalized_name == "ollama":
        from app.providers.ollama_provider import OllamaProvider

        return OllamaProvider(base_url=settings.ollama_base_url)

    if normalized_name == "gemini":
        from app.providers.gemini_provider import GeminiProvider

        return GeminiProvider(api_key=settings.gemini_api_key)

    raise ValueError(f"Unsupported model provider: {provider_name}")
