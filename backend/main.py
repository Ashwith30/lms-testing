import os
import secrets
import sys
from typing import Optional
from fastapi import FastAPI, Depends, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import models
from database import engine, get_db

from routers import (
    auth_router,
    users_router,
    organization_router,
    questions_router,
    tests_router,
    attempts_router,
    analytics_router,
    materials_router,
    notifications_router
)

# Ensure models are created
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="LMS API", version="2.0.0")
@app.get("/debug-check")
def debug_check():
    return {"message": "Updated main.py is running"}

# CORS Origin Configuration
cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:8000")
if cors_origins_env.strip() == "*":
    origins = ["*"]
else:
    origins = [orig.strip() for orig in cors_origins_env.split(",") if orig.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all modular routers
app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(organization_router.router)
app.include_router(questions_router.router)
app.include_router(tests_router.router)
app.include_router(attempts_router.router)
app.include_router(analytics_router.router)
app.include_router(materials_router.router)
app.include_router(notifications_router.router)

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {"status": "ok", "timestamp": models.get_utc_now()}

@app.get("/api/admin-count-check")
def admin_count_check(
    x_admin_secret: Optional[str] = Header(None, alias="X-Admin-Check-Secret"),
    db: Session = Depends(get_db)
):
    expected_secret = os.getenv("ADMIN_CHECK_SECRET")
    env_present = expected_secret is not None
    env_len = len(expected_secret) if expected_secret is not None else 0
    hdr_present = x_admin_secret is not None
    hdr_len = len(x_admin_secret) if x_admin_secret is not None else 0

    print(
        f"[DIAGNOSTIC] ADMIN_CHECK_SECRET configured: {env_present} (length: {env_len}), "
        f"X-Admin-Check-Secret header present: {hdr_present} (length: {hdr_len})"
    )

    if not expected_secret or not x_admin_secret or not secrets.compare_digest(x_admin_secret, expected_secret):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Invalid or unconfigured diagnostic secret"
        )
    
    admin_count = db.query(models.User).filter(models.User.role == "admin").count()
    return {"admin_count": admin_count}

