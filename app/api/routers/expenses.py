from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.api.schemas import (
    ExpenseOut, ExpenseListOut, ExpenseCreate, ExpenseUpdate,
    SummaryItem, MonthlyTotalItem,
)
from app.db import repo
from app.db.models import User, Expense

router = APIRouter()


def _expense_to_schema(e: Expense) -> ExpenseOut:
    return ExpenseOut(
        id=e.id,
        amount=e.amount,
        expense_date=e.expense_date,
        category_id=e.category_id,
        category_name=e.category.name if e.category else None,
        note=e.note,
        import_ref=e.import_ref,
    )


@router.get("/summary", response_model=list[SummaryItem])
def get_summary(
    start_date: date = Query(...),
    end_date: date = Query(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = repo.get_expenses_summary(db, user.id, start_date, end_date)
    return [SummaryItem(category_name=name, total=total) for name, total in rows]


@router.get("/monthly-totals", response_model=list[MonthlyTotalItem])
def get_monthly_totals(
    months: int = Query(6, ge=1, le=24),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = repo.get_expenses_monthly_totals(db, user.id, months)
    return [MonthlyTotalItem(month=month, total=total) for month, total in rows]


@router.get("", response_model=ExpenseListOut)
def list_expenses(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    category_id: int | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items, total = repo.get_expenses_paginated(db, user.id, page, page_size, category_id, start_date, end_date)
    return ExpenseListOut(items=[_expense_to_schema(e) for e in items], total=total)


@router.post("", response_model=ExpenseOut, status_code=201)
def create_expense(body: ExpenseCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    expense = repo.create_expense(db, user.id, body.category_id, body.amount, body.expense_date, body.note)
    return _expense_to_schema(expense)


@router.patch("/{expense_id}", response_model=ExpenseOut)
def update_expense(expense_id: int, body: ExpenseUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    expense = repo.get_expense(db, user.id, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    expense = repo.update_expense(db, expense, body.amount, body.category_id, body.expense_date, body.note)
    return _expense_to_schema(expense)


@router.delete("/{expense_id}", status_code=204)
def delete_expense(expense_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    expense = repo.get_expense(db, user.id, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    repo.delete_expense(db, expense)
