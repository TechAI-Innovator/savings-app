# Savings Tracker (Flask + Jinja2 + Tailwind)

A duplicate of the React savings tracker with the **same UI**, built using:

- **Flask** – backend and page routes
- **Jinja2** – HTML templates
- **Tailwind CSS** (CDN) + custom CSS – styling
- **Vanilla JavaScript** – auth, API calls, and interactivity

## Setup

1. Copy your `.env` from the original project's `backend` folder (or create one):

```env
DATABASE_URL=postgresql://...
SECRET_KEY=your-secret-key
```

2. Create a virtual environment and install dependencies:

```bash
cd text-zen-46-flask
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

3. Run the app (serves UI + API on one port):

```bash
python app.py
```

Or double-click **`run.bat`** on Windows.

Open **http://localhost:5000** (or the port in your `.env` — if you copied from the original backend, it may be **5001** via `BACKEND_PORT`).

Set `FLASK_PORT=5000` in `.env` to force port 5000.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard with account cards and savings ticker |
| `/update-account?source=Cooperative` | Add/subtract money |
| `/transaction-history?account=Cooperative` | Transaction history |

## Differences from React version

- Single Flask server (no separate Vite dev server)
- Same API paths under `/api`
- Session cookies work on same origin (no CORS setup needed locally)
