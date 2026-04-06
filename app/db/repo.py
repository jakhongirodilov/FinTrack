from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func
from .models import User, Category, Expense, ServiceMapping

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


def update_user_budget(db: Session, user_id: int, budget: int | None) -> User:
    user = db.query(User).filter_by(id=user_id).first()
    user.budget = budget
    db.commit()
    db.refresh(user)
    return user


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


def remove_category_by_id(db: Session, user_id: int, category_id: int) -> bool:
    category = db.query(Category).filter_by(id=category_id, user_id=user_id).first()
    if not category:
        return False
    db.delete(category)
    db.commit()
    return True


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

# ── Service Mappings ───────────────────────────────────────────────────────

def get_service_mappings(db: Session, user_id: int) -> list[ServiceMapping]:
    return db.query(ServiceMapping).filter_by(user_id=user_id).order_by(ServiceMapping.id).all()


def add_service_mapping(db: Session, user_id: int, keyword: str, category_id: int) -> ServiceMapping | None:
    """Returns None if keyword already exists for this user."""
    keyword = keyword.strip().lower()
    if db.query(ServiceMapping).filter_by(user_id=user_id, keyword=keyword).first():
        return None
    mapping = ServiceMapping(user_id=user_id, keyword=keyword, category_id=category_id)
    db.add(mapping)
    db.commit()
    db.refresh(mapping)
    return mapping


def remove_service_mapping_by_id(db: Session, user_id: int, mapping_id: int) -> bool:
    mapping = db.query(ServiceMapping).filter_by(id=mapping_id, user_id=user_id).first()
    if not mapping:
        return False
    db.delete(mapping)
    db.commit()
    return True


def remove_service_mapping(db: Session, user_id: int, keyword: str) -> bool:
    keyword = keyword.strip().lower()
    mapping = db.query(ServiceMapping).filter_by(user_id=user_id, keyword=keyword).first()
    if not mapping:
        return False
    db.delete(mapping)
    db.commit()
    return True


def get_category_for_service(db: Session, user_id: int, service_name: str) -> Category | None:
    """Returns the first category whose keyword appears in service_name (case-insensitive)."""
    service_lower = service_name.strip().lower()
    for mapping in get_service_mappings(db, user_id):
        if mapping.keyword in service_lower:
            return db.query(Category).filter_by(id=mapping.category_id).first()
    return None


# ── Expenses ───────────────────────────────────────────────────────────────

def get_expense(db: Session, user_id: int, expense_id: int) -> Expense | None:
    return db.query(Expense).filter_by(id=expense_id, user_id=user_id).first()


def get_expenses_paginated(
    db: Session,
    user_id: int,
    page: int = 1,
    page_size: int = 50,
    category_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> tuple[list[Expense], int]:
    q = db.query(Expense).filter(Expense.user_id == user_id)
    if category_id is not None:
        q = q.filter(Expense.category_id == category_id)
    if start_date:
        q = q.filter(Expense.expense_date >= start_date)
    if end_date:
        q = q.filter(Expense.expense_date <= end_date)
    total = q.count()
    items = q.order_by(Expense.expense_date.desc(), Expense.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def update_expense(
    db: Session,
    expense: Expense,
    amount: int | None = None,
    category_id: int | None = None,
    expense_date: date | None = None,
    note: str | None = None,
) -> Expense:
    if amount is not None:
        expense.amount = amount
    if category_id is not None:
        expense.category_id = category_id
    if expense_date is not None:
        expense.expense_date = expense_date
    if note is not None:
        expense.note = note
    db.commit()
    db.refresh(expense)
    return expense


def delete_expense(db: Session, expense: Expense) -> None:
    db.delete(expense)
    db.commit()


def get_expenses_monthly_totals(db: Session, user_id: int, months: int = 6) -> list[tuple[str, int]]:
    """Returns [(month_label, total), ...] for the last N months, oldest first."""
    from sqlalchemy import text
    from app.db.session import DB_URL
    if DB_URL.startswith("sqlite"):
        rows = db.execute(
            text("""
                SELECT strftime('%m/%Y', expense_date) AS month,
                       strftime('%Y-%m', expense_date) AS sort_key,
                       SUM(amount) AS total
                FROM expenses
                WHERE user_id = :user_id
                  AND expense_date >= date('now', 'start of month', '-' || (:months - 1) || ' months')
                GROUP BY strftime('%Y-%m', expense_date)
                ORDER BY sort_key
            """),
            {"user_id": user_id, "months": months},
        ).fetchall()
        return [(row[0], row[2]) for row in rows]
    else:
        rows = db.execute(
            text("""
                SELECT to_char(date_trunc('month', expense_date), 'Mon YYYY') AS month,
                       SUM(amount) AS total
                FROM expenses
                WHERE user_id = :user_id
                  AND expense_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' * (:months - 1)
                GROUP BY date_trunc('month', expense_date)
                ORDER BY date_trunc('month', expense_date)
            """),
            {"user_id": user_id, "months": months},
        ).fetchall()
        return [(row[0], row[1]) for row in rows]


def create_expense(
    db: Session,
    user_id: int,
    category_id: int,
    amount: int,
    expense_date: date | None = None,
    note: str | None = None,
) -> Expense:
    expense = Expense(
        user_id=user_id,
        category_id=category_id,
        amount=amount,
        expense_date=expense_date or date.today(),
        note=note,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


def import_ref_exists(db: Session, user_id: int, import_ref: str) -> bool:
    return db.query(Expense).filter_by(user_id=user_id, import_ref=import_ref).first() is not None


def create_imported_expense(
    db: Session,
    user_id: int,
    category_id: int,
    amount: int,
    expense_date: date,
    import_ref: str,
) -> Expense:
    expense = Expense(
        user_id=user_id,
        category_id=category_id,
        amount=amount,
        expense_date=expense_date,
        import_ref=import_ref,
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
