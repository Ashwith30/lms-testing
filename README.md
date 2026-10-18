# LMS Testing Platform

A full-stack Learning Management & Online Testing Platform with multi-role support (Admin, Institution, Trainer, Student) and AI/Client-Side Proctoring.

## Project Structure

```
p-testing/
├── backend/          # FastAPI backend (Python, SQLAlchemy, SQLite, JWT Auth)
│   ├── app/          # App package wrapper (supports uvicorn app.main:app)
│   ├── alembic/      # Database migrations
│   ├── routers/      # API route handlers
│   ├── auth.py       # Authentication & authorization helpers
│   ├── database.py   # Database session & engine setup
│   ├── lms.db        # Active SQLite development database
│   ├── main.py       # Primary FastAPI application entrypoint
│   ├── models.py     # SQLAlchemy ORM models
│   ├── schemas.py    # Pydantic request & response schemas
│   └── requirements.txt
├── frontend/         # React 19 + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   └── types/
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── docs/             # Security audit, implementation, and verification reports
│   ├── security_audit_master_tracker.md
│   ├── CRIT-01..06 Reports
│   └── HIGH / MED Reports
├── tests/            # Automated security, authorization & regression test suites
│   ├── run_all.py    # Master regression test runner
│   ├── test_crit_*.py
│   ├── test_high_*.py
│   └── test_sec_*.py
├── render.yaml       # Production deployment configuration (Render)
├── .gitignore        # Git ignore specifications
└── README.md
```

## Getting Started

### 1. Backend Setup (FastAPI)

```bash
cd backend
source .venv/bin/activate

# Both forms are fully supported:
uvicorn main:app --reload
# or
uvicorn app.main:app --reload
```
The Backend API will be running at `http://localhost:8000`.

### 2. Frontend Setup (React + Vite)

```bash
cd frontend
npm install
npm run dev
```
The Frontend will be running at `http://localhost:5173`.

### 3. Running Regression Tests

Run all security regression test suites in sequence from the project root:

```bash
backend/.venv/bin/python3 tests/run_all.py
```

Or run any individual suite:

```bash
backend/.venv/bin/python3 tests/test_high_006_analytics.py
backend/.venv/bin/python3 tests/test_crit_003_attempt_auth.py
backend/.venv/bin/python3 tests/test_crit_004_profile_auth.py
```

Frontend unit tests & production build:

```bash
cd frontend
npm test
npm run build
```
