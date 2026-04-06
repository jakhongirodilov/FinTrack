from datetime import date
from pydantic import BaseModel


# ── Auth ──────────────────────────────────────────────────────────────────────

class TelegramAuthPayload(BaseModel):
    id: int
    first_name: str | None = None
    last_name: str | None = None
    username: str | None = None
    photo_url: str | None = None
    auth_date: int
    hash: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Users ─────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: int
    first_name: str | None
    last_name: str | None
    username: str
    budget: int | None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    budget: int | None = None


# ── Categories ────────────────────────────────────────────────────────────────

class CategoryOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class CategoryCreate(BaseModel):
    name: str


# ── Mappings ──────────────────────────────────────────────────────────────────

class MappingOut(BaseModel):
    id: int
    keyword: str
    category_id: int
    category_name: str

    class Config:
        from_attributes = True


class MappingCreate(BaseModel):
    keyword: str
    category_id: int


# ── Expenses ──────────────────────────────────────────────────────────────────

class ExpenseOut(BaseModel):
    id: int
    amount: int
    expense_date: date
    category_id: int | None
    category_name: str | None
    note: str | None
    import_ref: str | None

    class Config:
        from_attributes = True


class ExpenseListOut(BaseModel):
    items: list[ExpenseOut]
    total: int


class ExpenseCreate(BaseModel):
    amount: int
    category_id: int
    expense_date: date | None = None
    note: str | None = None


class ExpenseUpdate(BaseModel):
    amount: int | None = None
    category_id: int | None = None
    expense_date: date | None = None
    note: str | None = None


class SummaryItem(BaseModel):
    category_name: str
    total: int


class MonthlyTotalItem(BaseModel):
    month: str
    total: int
