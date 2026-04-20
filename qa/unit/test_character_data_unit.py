from unittest import TestCase

from app.modules.character.character_data import (
    find_character_detail_by_id,
    find_character_profile_by_id,
    get_character_summary_list,
)


class CharacterDataUnitTest(TestCase):
    def test_character_summary_list_contains_milo(self) -> None:
        character_summary_list = get_character_summary_list()

        self.assertEqual(len(character_summary_list), 1)
        self.assertEqual(character_summary_list[0].character_id, "milo")
        self.assertEqual(character_summary_list[0].character_name, "Milo")

    def test_find_character_profile_by_id_returns_none_for_unknown_character(self) -> None:
        character_profile = find_character_profile_by_id("unknown-character")

        self.assertIsNone(character_profile)

    def test_find_character_detail_by_id_returns_character_greeting(self) -> None:
        character_detail = find_character_detail_by_id("milo")

        self.assertIsNotNone(character_detail)
        self.assertEqual(character_detail.character_id, "milo")
        self.assertIn("Welcome back", character_detail.character_greeting)
