from fastapi import APIRouter

from app.modules.admin.admin_router import admin_router
from app.modules.character.character_router import character_router
from app.modules.chat.chat_router import chat_router
from app.modules.system.system_router import system_router

api_router = APIRouter()
api_router.include_router(system_router)
api_router.include_router(character_router)
api_router.include_router(chat_router)
api_router.include_router(admin_router)
