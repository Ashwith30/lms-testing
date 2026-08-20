import datetime
import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import models
from database import engine

from routers import (
    auth_router,
    users_router,
    organization_router,
    questions_router,
    tests_router,
    attempts_router,
    analytics_router,
    materials_router
)

# Ensure models are created
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="LMS API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {"status": "ok", "timestamp": models.get_utc_now()}
