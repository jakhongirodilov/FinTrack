from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func
from .models import User, Category, Expense

DEFAULT_CATEGORIES = [
    "Health/Sport", "Education",
    "Utilities", "Transport",
    "Groceries", "Clothes",
    "Other",
]


# ── Users ──────────────────────────────────────────────────────────────────

def get_user(db: Session, chat_id: int) -> User | None:
    return db.query(User).filter_by(id=chat_id).first()


def username_exists(db: Session, username: str) -> bool:
    return db.query(User).filter_by(username=username).first() is not None


def create_user(
    db: Session,
    chat_id: int,
    first_name: str | None,
    last_name: str | None,
    username: str,
    budget: int | None,
) -> User:
    user = User(
        id=chat_id,
        first_name=first_name,
        last_name=last_name,
        username=username,
        budget=budget,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ── Categories ─────────────────────────────────────────────────────────────

def seed_default_categories(db: Session, user_id: int) -> None:
    for name in DEFAULT_CATEGORIES:
        db.add(Category(user_id=user_id, name=name))
    db.commit()


def get_categories(db: Session, user_id: int) -> list[Category]:
    return db.query(Category).filter_by(user_id=user_id).order_by(Category.id).all()


def get_category_by_name(db: Session, user_id: int, name: str) -> Category | None:
    return db.query(Category).filter_by(user_id=user_id, name=name).first()


def add_category(db: Session, user_id: int, name: str) -> Category | None:
    """Returns the new Category, or None if name already exists for this user."""
    if get_category_by_name(db, user_id, name):
        return None
    category = Category(user_id=user_id, name=name)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def remove_category(db: Session, user_id: int, name: str) -> bool:
    """Deletes the category. Expenses keep their record (category_id → NULL).
    Returns True if deleted, False if not found."""
    category = get_category_by_name(db, user_id, name)
    if not category:
        return False
    db.delete(category)
    db.commit()
    return True


# ── Expenses ───────────────────────────────────────────────────────────────

def create_expense(
    db: Session,
    user_id: int,
    category_id: int,
    amount: int,
) -> Expense:
    expense = Expense(
        user_id=user_id,
        category_id=category_id,
        amount=amount,
        expense_date=date.today(),
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


def get_expenses_summary(
    db: Session,
    user_id: int,
    start_date: date,
    end_date: date,
) -> list[tuple[str, int]]:
    """Returns [(category_name, total), ...] ordered by total desc.
    Expenses whose category was deleted appear as 'Uncategorized'."""
    rows = (
        db.query(
            func.coalesce(Category.name, "Uncategorized").label("cat_name"),
            func.sum(Expense.amount).label("total"),
        )
        .outerjoin(Category, Expense.category_id == Category.id)
        .filter(
            Expense.user_id == user_id,
            Expense.expense_date >= start_date,
            Expense.expense_date <= end_date,
        )
        .group_by("cat_name")
        .order_by(func.sum(Expense.amount).desc())
        .all()
    )
    return [(row.cat_name, row.total) for row in rows]
