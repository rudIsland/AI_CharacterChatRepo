from pydantic import BaseModel, Field


class CharacterSummary(BaseModel):
    character_id: str = Field(min_length=1, max_length=50)
    character_name: str = Field(min_length=1, max_length=50)
    character_description: str = Field(min_length=1, max_length=200)


class CharacterDetail(BaseModel):
    character_id: str = Field(min_length=1, max_length=50)
    character_name: str = Field(min_length=1, max_length=50)
    character_description: str = Field(min_length=1, max_length=200)
    character_greeting: str = Field(min_length=1, max_length=300)


class CharacterProfile(BaseModel):
    character_id: str = Field(min_length=1, max_length=50)
    character_name: str = Field(min_length=1, max_length=50)
    character_description: str = Field(min_length=1, max_length=200)
    character_greeting: str = Field(min_length=1, max_length=300)
    character_prompt: str = Field(min_length=1, max_length=1000)
