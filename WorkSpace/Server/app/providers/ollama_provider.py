import httpx

from app.providers.model_provider import ModelProvider, ProviderChatRequest, ProviderChatResponse


class OllamaProvider(ModelProvider):
    def __init__(self, base_url: str, timeout_seconds: float = 60.0):
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds

    def generate_reply(self, request: ProviderChatRequest) -> ProviderChatResponse:
        payload = {
            "model": request.model,
            "messages": [message.model_dump() for message in request.messages],
            "stream": False,
            "options": {
                "temperature": request.temperature,
            },
        }

        try:
            response = httpx.post(
                f"{self.base_url}/api/chat",
                json=payload,
                timeout=self.timeout_seconds,
            )
            response.raise_for_status()
        except httpx.HTTPError as error:
            raise RuntimeError("Failed to call Ollama.") from error

        data = response.json()
        content = data.get("message", {}).get("content", "").strip()
        if not content:
            raise RuntimeError("Ollama returned an empty response.")

        return ProviderChatResponse(content=content)
