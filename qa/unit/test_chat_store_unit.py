from time import sleep
from unittest import TestCase

from app.modules.chat.chat_store import InMemoryChatStore


class ChatStoreUnitTest(TestCase):
    def test_create_chat_session_stores_session_by_guest_id(self) -> None:
        chat_store = InMemoryChatStore()

        created_session = chat_store.create_chat_session(
            character_id="milo",
            guest_id="guest_unit",
            ai_model_provider="gpt",
        )

        session_list = chat_store.list_chat_session_by_guest_id("guest_unit")
        self.assertEqual(len(session_list), 1)
        self.assertEqual(session_list[0].chat_session_id, created_session.chat_session_id)

    def test_list_chat_session_by_guest_id_returns_newest_session_first(self) -> None:
        chat_store = InMemoryChatStore()

        older_session = chat_store.create_chat_session(
            character_id="milo",
            guest_id="guest_order",
            ai_model_provider="gpt",
        )
        sleep(0.01)
        newer_session = chat_store.create_chat_session(
            character_id="milo",
            guest_id="guest_order",
            ai_model_provider="local_ai",
        )

        session_list = chat_store.list_chat_session_by_guest_id("guest_order")
        self.assertEqual(len(session_list), 2)
        self.assertEqual(session_list[0].chat_session_id, newer_session.chat_session_id)
        self.assertEqual(session_list[1].chat_session_id, older_session.chat_session_id)

    def test_append_chat_message_returns_chat_history_in_saved_order(self) -> None:
        chat_store = InMemoryChatStore()
        created_session = chat_store.create_chat_session(
            character_id="milo",
            guest_id="guest_history",
            ai_model_provider="gpt",
        )

        first_message = chat_store.append_chat_message(
            chat_session_id=created_session.chat_session_id,
            role="user",
            message_text="hello",
        )
        second_message = chat_store.append_chat_message(
            chat_session_id=created_session.chat_session_id,
            role="assistant",
            message_text="hi there",
        )

        message_list = chat_store.list_chat_message_by_session_id(
            created_session.chat_session_id
        )
        self.assertEqual(len(message_list), 2)
        self.assertEqual(message_list[0].message_id, first_message.message_id)
        self.assertEqual(message_list[1].message_id, second_message.message_id)
