import hashlib
import hmac
import time
from datetime import datetime, timezone, timedelta

import jwt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import TELEGRAM_TOKEN, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_DAYS
from app.api.deps import get_db
from app.api.schemas import TelegramAuthPayload, TokenOut, UserOut
from app.db import repo

router = APIRouter()


def _verify_telegram_hash(payload: TelegramAuthPayload) -> bool:
    """Verify the hash per Telegram Login Widget spec."""
    data = payload.model_dump(exclude={"hash"})
    # Remove None values
    data = {k: v for k, v in data.items() if v is not None}
    check_string = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
    secret_key = hashlib.sha256(TELEGRAM_TOKEN.encode()).digest()
    expected = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, payload.hash)


@router.post("/telegram", response_model=TokenOut)
def telegram_auth(payload: TelegramAuthPayload, db: Session = Depends(get_db)):
    # Reject if auth_date is older than 24 hours
    if time.time() - payload.auth_date > 86400:
        raise HTTPException(status_code=401, detail="Auth data expired")

    if not _verify_telegram_hash(payload):
        raise HTTPException(status_code=401, detail="Invalid hash")

    user = repo.get_user(db, payload.id)
    if not user:
        raise HTTPException(status_code=403, detail="User not registered. Start the bot first.")

    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    token = jwt.encode({"sub": str(user.id), "exp": expire}, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return TokenOut(access_token=token)
