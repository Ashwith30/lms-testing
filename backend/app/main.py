"""Application module alias allowing `uvicorn app.main:app` alongside `uvicorn main:app`."""
from main import app

__all__ = ["app"]
