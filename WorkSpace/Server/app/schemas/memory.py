from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MemoryCreate(BaseModel):
    character_id: str = Field(min_length=1)
    content: str = Field(min_length=1)


class MemoryRead(BaseModel):
    id: str
    character_id: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
