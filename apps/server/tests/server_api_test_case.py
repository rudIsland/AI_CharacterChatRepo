import unittest

from fastapi.testclient import TestClient

import app.modules.chat.chat_router as chat_router_module
from app.main import app


class ServerApiTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        chat_router_module.chat_store._chat_session_map.clear()

    def tearDown(self) -> None:
        self.client.close()
