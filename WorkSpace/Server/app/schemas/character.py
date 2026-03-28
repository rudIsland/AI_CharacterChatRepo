from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CharacterProfile(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = ""
    system_prompt: str = Field(min_length=1)
    greeting_message: str = ""
    model_provider: str = "ollama"
    model_name: str = ""
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)


class CharacterCreate(CharacterProfile):
    pass


class CharacterRead(CharacterProfile):
    id: str
    created_at: datetime
    updated_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
