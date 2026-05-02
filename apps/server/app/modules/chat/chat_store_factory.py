import logging

from app.core.app_settings import AppSettings
from app.modules.chat.chat_store import ChatStore, InMemoryChatStore
from app.modules.chat.sql_chat_store import SqlChatStore

logger = logging.getLogger(__name__)


def create_chat_store(app_settings: AppSettings) -> ChatStore:
    if not app_settings.database_url:
        return InMemoryChatStore()

    try:
        return SqlChatStore(
            database_url=app_settings.database_url,
            should_create_tables=app_settings.database_auto_create_tables,
        )
    except Exception as error:
        if not app_settings.database_fallback_to_memory:
            raise

        logger.warning(
            "Database chat store is unavailable. Falling back to in-memory store. error_type=%s",
            type(error).__name__,
        )
        return InMemoryChatStore()
