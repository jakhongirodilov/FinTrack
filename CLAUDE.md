# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

Requires a `.env` file with `TELEGRAM_TOKEN` and `DATABASE_URL` (PostgreSQL).

```bash
uvicorn app.main:app --reload --port 8000
```

With Docker:
```bash
docker build -t fintrack .
docker run --network host --env-file .env fintrack
```

## Deployment

The app runs on `root@34.74.117.158` as a Docker container managed by systemd (`/etc/systemd/system/fintrack.service`). Source lives at `/opt/fintrack/`.

Deploy workflow:
```bash
rsync -az app/ root@34.74.117.158:/opt/fintrack/app/
ssh root@34.74.117.158 "cd /opt/fintrack && docker build -q -t fintrack . && systemctl daemon-reload && systemctl restart fintrack"
```

PostgreSQL runs on the server at `localhost:5432`, DB/user both named `fintrack`.
Uvicorn serves HTTPS on port 8443 using a self-signed cert at `/opt/fintrack/webhook.crt`.

## Architecture

All Telegram updates arrive at `POST /webhook`. The handler in `app/telegram/handlers.py` routes by user state and command:

1. **No user in DB** → signup flow (multi-step, state tracked in `user_state` dict)
2. **Known command** (`/day`, `/start`, `/add_category`, etc.) → dedicated handler
3. **Anything else** → `expense_input()` (category selection → amount entry)

In-memory `user_state` dict tracks per-user flow state. It resets on restart — acceptable for now.

All DB access goes through `app/db/repo.py`. Never query the DB directly in handlers.

## Key conventions

- `parse_amount()` handles "k" notation: `25k` → 25000, `1.5k` → 1500
- Categories are per-user, seeded with 7 defaults on signup
- Deleting a category sets `category_id = NULL` on past expenses (shown as "Uncategorized" in summaries)
- Amounts stored as integers (no currency/unit concept)
