from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.db.session import init_db
from app.telegram.handlers import router as telegram_router
from app.api.auth import router as auth_router
from app.api.routers.users import router as users_router
from app.api.routers.categories import router as categories_router
from app.api.routers.mappings import router as mappings_router
from app.api.routers.expenses import router as expenses_router

app = FastAPI()

# Initialize DB (create tables)
init_db()

# Telegram webhook
app.include_router(telegram_router)

# REST API
app.include_router(auth_router,       prefix="/api/auth",       tags=["auth"])
app.include_router(users_router,      prefix="/api/users",      tags=["users"])
app.include_router(categories_router, prefix="/api/categories", tags=["categories"])
app.include_router(mappings_router,   prefix="/api/mappings",   tags=["mappings"])
app.include_router(expenses_router,   prefix="/api/expenses",   tags=["expenses"])

# Serve React SPA (only when built)
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
