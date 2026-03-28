from app.repositories.conversation_repository import ConversationRepository


class ConversationService:
    def __init__(self, repository: ConversationRepository):
        self.repository = repository

    def create_conversation(self, character_id: str, title: str):
        return self.repository.create(character_id=character_id, title=title)

    def get_conversation(self, conversation_id: str):
        return self.repository.get_by_id(conversation_id)

    def list_messages(self, conversation_id: str):
        return self.repository.list_messages(conversation_id)
