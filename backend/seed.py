"""
Database seed script (Clean Baseline Mode).
Run from backend/ directory: python seed.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from init_db import reset_and_seed

if __name__ == "__main__":
    reset_and_seed()
