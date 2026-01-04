import os
import httpx
from fastapi import APIRouter, Request
from datetime import date
from app.config import TELEGRAM_TOKEN
from app.db.session import SessionLocal
from app.db.models import User, Category, Expense
from app.telegram.keyboards import category_keyboard

router = APIRouter()
TELEGRAM_API = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"

# in-memory state
user_state = {}  

async def send_message(chat_id: int, text: str, reply_markup=None):
    payload = {"chat_id": chat_id, "text": text}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    async with httpx.AsyncClient() as client:
        await client.post(f"{TELEGRAM_API}/sendMessage", json=payload)

def parse_amount(text: str) -> int | None:
    """
    Parse amount text to integer.
    Accepts formats like '25k' → 25000
    """
    try:
        amt_text = text.lower().replace("k", "000")
        return int(amt_text)
    except ValueError:
        return None

async def signup(chat_id: int, text: str, db):
    state = user_state.get(chat_id, {"step": "first_name", "data": {}})
    step = state["step"]

    if step == "first_name":
        await send_message(chat_id, "Enter your First Name:")
        state["step"] = "last_name"

    elif step == "last_name":
        state["data"]["first_name"] = text
        await send_message(chat_id, "Enter your last name (or type '-' to skip):")
        state["step"] = "username"

    elif step == "username":
        state["data"]["last_name"] = text if text != "-" else None
        await send_message(chat_id, "Enter your username (required):")
        state["step"] = "budget"

    elif step == "budget":
        state["data"]["username"] = text
        await send_message(chat_id, "Enter your monthly budget (optional, type '-' to skip):")
        state["step"] = "confirm_budget"
    
    elif step == "confirm_budget":
        budget = None
        if text != "-":
            try:
                budget = int(text)
            except ValueError:
                await send_message(chat_id, "Invalid number. Please enter budget again or '-' to skip:")
                user_state[chat_id] = state
                return False  # Wait for correct budget

        data = state["data"]
        new_user = User(
            id=chat_id,
            first_name=data.get("first_name"),
            last_name=data.get("last_name"),
            username=data.get("username"),
            budget=budget,
        )
        db.add(new_user)
        db.commit()
        user_state.pop(chat_id)
        await send_message(chat_id, "✅ Signup complete! Choose a category:", reply_markup=category_keyboard())
        return True

    # Save state for next step
    user_state[chat_id] = state
    return False


async def expense_input(chat_id: int, text: str, db):
    state = user_state.get(chat_id)

    if not state or state.get("step") == "awaiting_category":
        # Validate category
        category = db.query(Category).filter_by(name=text).first()
        if not category:
            await send_message(chat_id, "❌ Invalid category. Please choose from the keyboard:", reply_markup=category_keyboard())
            return

        # Save category in state and ask for amount
        user_state[chat_id] = {"step": "awaiting_amount", "category_id": category.id}
        await send_message(chat_id, f"Category *{text}* selected. Enter amount:")
        return

    if state.get("step") == "awaiting_amount":
        amount = int(text)
        if amount is None:
            await send_message(chat_id, "❌ Invalid amount. Please enter a number:")
            return
        
        # Save expense
        new_expense = Expense(
            user_id=chat_id,
            category_id=state["category_id"],
            amount=amount,
            expense_date=date.today()
        )
        db.add(new_expense)
        db.commit()

        # Clear state and show category keyboard again
        user_state.pop(chat_id)
        await send_message(chat_id, f"✅ Expense saved: {amount}", reply_markup=category_keyboard())
        return





@router.post("/webhook")
async def telegram_webhook(req: Request):
    data = await req.json()
    if "message" not in data:
        return {"ok": True}

    msg = data["message"]
    chat_id = msg["chat"]["id"]
    text = msg.get("text", "")

    db = SessionLocal()

    # Check if user exists
    user = db.query(User).filter_by(id=chat_id).first()

    # Signup flow
    if not user:
        await signup(chat_id, text, db)
        db.close()
        return {"ok": True}

    # Expense input flow
    await expense_input(chat_id, text, db)

    db.close()
    return {"ok": True}
