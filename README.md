# LMS Testing Platform

A full-stack Learning Management & Online Testing Platform with multi-role support (Admin, Institution, Trainer, Student) and AI/Client-Side Proctoring.

## Project Structure

```
lms-testing/
├── backend/          # FastAPI backend (Python, SQLAlchemy, SQLite, JWT Auth)
│   ├── auth.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   └── requirements.txt
├── frontend/         # React + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   └── types/
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Getting Started

### 1. Backend Setup (FastAPI)

```bash
cd backend
pip install -r requirements.txt
python seed.py           # Seed database with demo accounts & tests
python -m uvicorn main:app --reload --port 8000
```
Backend API will be running at `http://localhost:8000`.

### 2. Frontend Setup (React + Vite)

```bash
cd frontend
npm install
npm run dev
```
Frontend will be running at `http://localhost:5173`.

### 3. Verification & Tests

```bash
python test_verify_all.py
```
