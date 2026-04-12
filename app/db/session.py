import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set")

engine = create_engine(
    DB_URL,
    connect_args={"check_same_thread": False} if DB_URL.startswith("sqlite") else {},
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    Base.metadata.create_all(bind=engine)
