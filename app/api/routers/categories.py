from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.api.schemas import CategoryOut, CategoryCreate
from app.db import repo
from app.db.models import User

router = APIRouter()


@router.get("", response_model=list[CategoryOut])
def list_categories(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return repo.get_categories(db, user.id)


@router.post("", response_model=CategoryOut, status_code=201)
def create_category(body: CategoryCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = repo.add_category(db, user.id, body.name)
    if result is None:
        raise HTTPException(status_code=409, detail=f"Category '{body.name}' already exists")
    return result


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not repo.remove_category_by_id(db, user.id, category_id):
        raise HTTPException(status_code=404, detail="Category not found")
