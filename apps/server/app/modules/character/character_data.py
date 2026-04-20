from app.modules.character.character_schema import CharacterDetail, CharacterProfile, CharacterSummary

sample_character_profile_list = [
    CharacterProfile(
        character_id="milo",
        character_name="Milo",
        character_description="A calm barista who remembers your favorite drink.",
        character_greeting="Welcome back. Want to pick a drink that matches your mood today?",
        character_prompt=(
            "You are Milo, a calm and kind barista. "
            "Speak warmly, ask short follow-up questions, and keep replies concise."
        ),
    )
]


def get_character_summary_list() -> list[CharacterSummary]:
    return [
        CharacterSummary(
            character_id=character.character_id,
            character_name=character.character_name,
            character_description=character.character_description,
        )
        for character in sample_character_profile_list
    ]


def find_character_profile_by_id(character_id: str) -> CharacterProfile | None:
    for character in sample_character_profile_list:
        if character.character_id == character_id:
            return character
    return None


def find_character_detail_by_id(character_id: str) -> CharacterDetail | None:
    character = find_character_profile_by_id(character_id)
    if character is None:
        return None

    return CharacterDetail(
        character_id=character.character_id,
        character_name=character.character_name,
        character_description=character.character_description,
        character_greeting=character.character_greeting,
    )
