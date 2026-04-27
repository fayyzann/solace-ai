from fastapi import APIRouter
from app.api.v1 import auth, knowledge, chat, widget, analytics, admin, settings

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(admin.router)
api_router.include_router(knowledge.router)
api_router.include_router(chat.router)
api_router.include_router(widget.router)
api_router.include_router(analytics.router)
api_router.include_router(settings.router)
