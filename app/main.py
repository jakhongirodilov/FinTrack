from fastapi import FastAPI
from app.db.session import init_db
from app.telegram.handlers import router as telegram_router

app = FastAPI()

# Initialize DB (create tables + default categories)
init_db()

# Include telegram router
app.include_router(telegram_router)
