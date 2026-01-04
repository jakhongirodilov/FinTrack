import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base

DB_URL = os.getenv("DATABASE_URL", "sqlite:///./finance.db")

engine = create_engine(
    DB_URL, connect_args={"check_same_thread": False} if "sqlite" in DB_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    # Create tables
    Base.metadata.create_all(bind=engine)

    # Seed default categories
    from .models import Category
    db = SessionLocal()
    default_categories = [
        "Health/Sport", "Education",
        "Utilities", "Transport",
        "Groceries", "Clothes",
        "Other"
    ]
    for cat in default_categories:
        exists = db.query(Category).filter_by(name=cat).first()
        if not exists:
            db.add(Category(name=cat))
            
    db.commit()
    db.close()
