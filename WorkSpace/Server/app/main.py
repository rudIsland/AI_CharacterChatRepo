from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api import character, chat, conversation
from app.config import get_settings
from app.database import init_database
from app.schemas.health import HealthCheckResponse

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_database()
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthCheckResponse)
def health_check() -> HealthCheckResponse:
    return HealthCheckResponse(
        status="ok",
        app_name=settings.app_name,
        environment=settings.app_env,
    )


app.include_router(character.router)
app.include_router(conversation.router)
app.include_router(chat.router)
