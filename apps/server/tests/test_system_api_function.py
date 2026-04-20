from tests.server_api_test_case import ServerApiTestCase


class SystemApiFunctionTest(ServerApiTestCase):
    def test_health_endpoint_returns_service_status(self) -> None:
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"status": "ok", "service_name": "ai-character-chat-api"},
        )

    def test_echo_endpoint_returns_message_and_length(self) -> None:
        response = self.client.post("/echo", json={"message": "hello"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"message": "hello", "message_length": 5},
        )

    def test_character_list_endpoint_returns_sample_character(self) -> None:
        response = self.client.get("/characters")

        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(len(response_data), 1)
        self.assertEqual(response_data[0]["character_id"], "milo")

    def test_chat_session_create_returns_not_found_for_unknown_character(self) -> None:
        response = self.client.post(
            "/chat-sessions",
            json={
                "character_id": "unknown-character",
                "guest_id": "guest_stage1",
                "ai_model_provider": "gpt",
            },
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json()["detail"],
            "Character not found: unknown-character",
        )
