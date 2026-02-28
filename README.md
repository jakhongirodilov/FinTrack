# FinTrack

A minimalist Telegram bot for tracking personal expenses.

## Features

- Log expenses in 2 taps: select category → enter amount
- Custom categories per user
- Monthly budget tracking
- Summaries: `/day`, `/week`, `/month`

## Stack

- **FastAPI** + **Uvicorn** (HTTPS)
- **PostgreSQL** via SQLAlchemy
- **Docker** + systemd for deployment

## Commands

| Command | Description |
|---|---|
| `/day` | Today's expenses by category |
| `/week` | This week's expenses |
| `/month` | This month's expenses |
| `/add_category <name>` | Add a custom category |
| `/remove_category <name>` | Remove a category |
| `/cancel` | Cancel current input |

## Setup

```bash
cp .env.example .env
# fill in TELEGRAM_TOKEN and DATABASE_URL
```

```bash
docker build -t fintrack .
docker run --network host --env-file .env fintrack
```

Register the Telegram webhook:
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<HOST>:<PORT>/webhook"
```
