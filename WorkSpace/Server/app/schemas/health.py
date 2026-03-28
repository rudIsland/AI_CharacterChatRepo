from typing import Literal

from pydantic import BaseModel


class HealthCheckResponse(BaseModel):
    status: Literal["ok"]
    app_name: str
    environment: str
