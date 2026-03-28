from app.providers.model_provider import ModelProvider, ProviderChatRequest, ProviderChatResponse


class GeminiProvider(ModelProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key

    def generate_reply(self, request: ProviderChatRequest) -> ProviderChatResponse:
        if not self.api_key:
            raise RuntimeError("Gemini API key is not configured.")

        raise RuntimeError("GeminiProvider is prepared as an extension point and is not implemented yet.")
