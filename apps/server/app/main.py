from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.app_settings import get_app_settings

app_settings = get_app_settings()

app = FastAPI(title=app_settings.app_name)
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def get_root() -> dict[str, str]:
    return {
        "message": "AI character chat server is running",
        "docs_url": "/docs",
    }


@app.get("/health")
def get_health() -> dict[str, str]:
    return {"status": "ok", "service_name": "ai-character-chat-api"}


@app.get("/favicon.ico", include_in_schema=False)
def get_favicon() -> Response:
    return Response(status_code=status.HTTP_204_NO_CONTENT)
