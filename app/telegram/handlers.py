import httpx
from fastapi import APIRouter, Request
from datetime import date, timedelta
from app.config import TELEGRAM_TOKEN
from app.db.session import SessionLocal
from app.db import repo
from app.telegram.keyboards import category_keyboard

router = APIRouter()
TELEGRAM_API = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"

# in-memory state: {chat_id: {"step": str, "data": dict}}
user_state: dict = {}


# ── Telegram helpers ───────────────────────────────────────────────────────

async def send_message(chat_id: int, text: str, reply_markup=None):
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "Markdown"}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    async with httpx.AsyncClient() as client:
        await client.post(f"{TELEGRAM_API}/sendMessage", json=payload)


def parse_amount(text: str) -> int | None:
    """Accepts formats like '25k' → 25000, '1.5k' → 1500."""
    try:
        text = text.strip().lower()
        if text.endswith("k"):
            return int(float(text[:-1]) * 1000)
        return int(text)
    except ValueError:
        return None


def format_summary(rows: list[tuple[str, int]], title: str) -> str:
    if not rows:
        return f"📊 {title}\n\nNo expenses recorded."
    width = max(len(name) for name, _ in rows)
    lines = [f"📊 *{title}*\n"]
    for name, total in rows:
        lines.append(f"{name:<{width}}   {total:,}")
    lines.append("─" * (width + 10))
    lines.append(f"{'Total':<{width}}   {sum(t for _, t in rows):,}")
    return "\n".join(lines)


def get_category_keyboard_for(db, user_id: int):
    cats = repo.get_categories(db, user_id)
    return category_keyboard([c.name for c in cats])


# ── Signup flow ────────────────────────────────────────────────────────────

async def signup(chat_id: int, text: str, db) -> bool:
    """Returns True when signup is complete."""
    state = user_state.get(chat_id, {"step": "first_name", "data": {}})
    step = state["step"]

    if step == "first_name":
        await send_message(chat_id, "Welcome! Let's get you set up.\n\nEnter your first name:")
        state["step"] = "last_name"

    elif step == "last_name":
        state["data"]["first_name"] = text
        await send_message(chat_id, "Enter your last name (or `-` to skip):")
        state["step"] = "username"

    elif step == "username":
        state["data"]["last_name"] = text if text != "-" else None
        await send_message(chat_id, "Choose a username (must be unique):")
        state["step"] = "budget"

    elif step == "budget":
        username = text.strip()
        if repo.username_exists(db, username):
            await send_message(chat_id, "❌ That username is already taken. Please choose another:")
            user_state[chat_id] = state
            return False
        state["data"]["username"] = username
        await send_message(chat_id, "Enter your monthly budget (or `-` to skip):")
        state["step"] = "confirm_budget"

    elif step == "confirm_budget":
        budget = None
        if text != "-":
            budget = parse_amount(text)
            if budget is None:
                await send_message(chat_id, "❌ Invalid number. Enter your budget or `-` to skip:")
                user_state[chat_id] = state
                return False

        data = state["data"]
        user = repo.create_user(
            db,
            chat_id=chat_id,
            first_name=data.get("first_name"),
            last_name=data.get("last_name"),
            username=data["username"],
            budget=budget,
        )
        repo.seed_default_categories(db, user.id)
        user_state.pop(chat_id, None)

        kb = get_category_keyboard_for(db, chat_id)
        await send_message(chat_id, "✅ All set! Choose a category to log an expense:", reply_markup=kb)
        return True

    user_state[chat_id] = state
    return False


# ── Expense flow ───────────────────────────────────────────────────────────

async def expense_input(chat_id: int, text: str, db):
    state = user_state.get(chat_id)
    kb = get_category_keyboard_for(db, chat_id)

    if not state or state.get("step") == "awaiting_category":
        category = repo.get_category_by_name(db, chat_id, text)
        if not category:
            await send_message(chat_id, "❌ Unknown category. Please choose from the keyboard:", reply_markup=kb)
            return
        user_state[chat_id] = {"step": "awaiting_amount", "category_id": category.id, "category_name": category.name}
        await send_message(chat_id, f"*{text}* selected. Enter amount:")
        return

    if state.get("step") == "awaiting_amount":
        amount = parse_amount(text)
        if amount is None:
            await send_message(chat_id, "❌ Invalid amount. Enter a number (e.g. 500 or 25k):")
            return

        repo.create_expense(db, user_id=chat_id, category_id=state["category_id"], amount=amount)
        user_state.pop(chat_id, None)
        await send_message(
            chat_id,
            f"✅ *{state['category_name']}* — {amount:,} saved",
            reply_markup=kb,
        )


# ── Summary commands ───────────────────────────────────────────────────────

async def handle_summary(chat_id: int, period: str, db):
    today = date.today()
    if period == "day":
        start, end = today, today
        title = f"Today — {today.strftime('%b %d')}"
    elif period == "week":
        start = today - timedelta(days=today.weekday())
        end = today
        title = f"This Week ({start.strftime('%b %d')} – {end.strftime('%b %d')})"
    else:  # month
        start = today.replace(day=1)
        end = today
        title = today.strftime("%B %Y")

    rows = repo.get_expenses_summary(db, chat_id, start, end)
    await send_message(chat_id, format_summary(rows, title))


# ── Category management commands ───────────────────────────────────────────

async def handle_add_category(chat_id: int, text: str, db):
    # text is the full message, e.g. "/add_category Dining"
    parts = text.split(maxsplit=1)
    if len(parts) < 2 or not parts[1].strip():
        await send_message(chat_id, "Usage: `/add_category <name>`")
        return
    name = parts[1].strip()
    result = repo.add_category(db, chat_id, name)
    if result is None:
        await send_message(chat_id, f"❌ Category *{name}* already exists.")
    else:
        kb = get_category_keyboard_for(db, chat_id)
        await send_message(chat_id, f"✅ Category *{name}* added.", reply_markup=kb)


async def handle_remove_category(chat_id: int, text: str, db):
    parts = text.split(maxsplit=1)
    if len(parts) < 2 or not parts[1].strip():
        await send_message(chat_id, "Usage: `/remove_category <name>`")
        return
    name = parts[1].strip()
    deleted = repo.remove_category(db, chat_id, name)
    if not deleted:
        await send_message(chat_id, f"❌ Category *{name}* not found.")
    else:
        kb = get_category_keyboard_for(db, chat_id)
        await send_message(chat_id, f"✅ Category *{name}* removed.", reply_markup=kb)


# ── Webhook entry point ────────────────────────────────────────────────────

@router.post("/webhook")
async def telegram_webhook(req: Request):
    data = await req.json()
    if "message" not in data:
        return {"ok": True}

    msg = data["message"]
    chat_id = msg["chat"]["id"]
    text = msg.get("text", "").strip()

    db = SessionLocal()
    try:
        user = repo.get_user(db, chat_id)

        if not user:
            await signup(chat_id, text, db)
            return {"ok": True}

        # Commands
        if text == "/day":
            await handle_summary(chat_id, "day", db)
        elif text == "/week":
            await handle_summary(chat_id, "week", db)
        elif text == "/month":
            await handle_summary(chat_id, "month", db)
        elif text.startswith("/add_category"):
            await handle_add_category(chat_id, text, db)
        elif text.startswith("/remove_category"):
            await handle_remove_category(chat_id, text, db)
        else:
            await expense_input(chat_id, text, db)
    finally:
        db.close()

    return {"ok": True}
