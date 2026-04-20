from unittest.mock import AsyncMock, patch

import app.modules.chat.chat_router as chat_router_module
from tests.server_api_test_case import ServerApiTestCase


class ChatApiRegressionTest(ServerApiTestCase):
    def test_guest_can_create_session_send_message_and_reload_history(self) -> None:
        guest_id = "guest_regression"
        user_message_text = "Hello, do you have a drink recommendation today?"
        assistant_message_text = "Milo: I have a calm latte recommendation for today."

        with patch.object(
            chat_router_module.ai_reply_service,
            "generate_character_reply",
            new=AsyncMock(return_value=assistant_message_text),
        ) as generate_character_reply:
            create_session_response = self.client.post(
                "/chat-sessions",
                json={
                    "character_id": "milo",
                    "guest_id": guest_id,
                    "ai_model_provider": "gpt",
                },
            )

            self.assertEqual(create_session_response.status_code, 200)
            created_session = create_session_response.json()
            chat_session_id = created_session["chat_session_id"]

            send_message_response = self.client.post(
                f"/chat-sessions/{chat_session_id}/messages",
                json={
                    "user_message_text": user_message_text,
                    "ai_model_provider": "local_ai",
                },
            )

            self.assertEqual(send_message_response.status_code, 200)
            created_message = send_message_response.json()
            self.assertEqual(created_message["chat_session_id"], chat_session_id)
            self.assertEqual(created_message["user_message"]["role"], "user")
            self.assertEqual(
                created_message["user_message"]["message_text"],
                user_message_text,
            )
            self.assertEqual(created_message["assistant_message"]["role"], "assistant")
            self.assertEqual(
                created_message["assistant_message"]["message_text"],
                assistant_message_text,
            )

            list_session_response = self.client.get(
                f"/chat-sessions?guest_id={guest_id}"
            )

            self.assertEqual(list_session_response.status_code, 200)
            session_list = list_session_response.json()
            self.assertEqual(len(session_list), 1)
            self.assertEqual(session_list[0]["chat_session_id"], chat_session_id)
            self.assertEqual(session_list[0]["character_id"], "milo")
            self.assertEqual(session_list[0]["ai_model_provider"], "local_ai")

            list_message_response = self.client.get(
                f"/chat-sessions/{chat_session_id}/messages"
            )

            self.assertEqual(list_message_response.status_code, 200)
            message_list_response = list_message_response.json()
            self.assertEqual(message_list_response["chat_session_id"], chat_session_id)
            self.assertEqual(len(message_list_response["message_list"]), 2)
            self.assertEqual(message_list_response["message_list"][0]["role"], "user")
            self.assertEqual(
                message_list_response["message_list"][1]["role"], "assistant"
            )
            self.assertEqual(
                message_list_response["message_list"][1]["message_text"],
                assistant_message_text,
            )

            generate_character_reply.assert_awaited_once()
