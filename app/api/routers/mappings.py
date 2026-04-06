from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.api.schemas import MappingOut, MappingCreate
from app.db import repo
from app.db.models import User, ServiceMapping

router = APIRouter()


def _mapping_to_schema(m: ServiceMapping) -> MappingOut:
    return MappingOut(
        id=m.id,
        keyword=m.keyword,
        category_id=m.category_id,
        category_name=m.category.name,
    )


@router.get("", response_model=list[MappingOut])
def list_mappings(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [_mapping_to_schema(m) for m in repo.get_service_mappings(db, user.id)]


@router.post("", response_model=MappingOut, status_code=201)
def create_mapping(body: MappingCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = repo.add_service_mapping(db, user.id, body.keyword, body.category_id)
    if result is None:
        raise HTTPException(status_code=409, detail=f"Mapping for '{body.keyword}' already exists")
    return _mapping_to_schema(result)


@router.delete("/{mapping_id}", status_code=204)
def delete_mapping(mapping_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not repo.remove_service_mapping_by_id(db, user.id, mapping_id):
        raise HTTPException(status_code=404, detail="Mapping not found")
