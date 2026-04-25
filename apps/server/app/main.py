from pathlib import Path

from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.app_settings import get_app_settings

app_settings = get_app_settings()
static_directory = Path(__file__).resolve().parent / "static"
asset_directory = Path(__file__).resolve().parents[1] / "assets"

app = FastAPI(title=app_settings.app_name)

# API 라우터는 기능별 router를 한 곳에서 묶은 진입점입니다.
app.include_router(api_router)

# 캐릭터 이미지 같은 정적 파일은 /static 경로로 제공합니다.
app.mount("/static", StaticFiles(directory=static_directory), name="static")

# 사용자가 추가한 캐릭터 에셋은 /assets 경로로 제공합니다.
app.mount("/assets", StaticFiles(directory=asset_directory), name="assets")

# 웹/모바일 클라이언트가 이 서버 API를 호출할 수 있도록 CORS를 허용합니다.
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
