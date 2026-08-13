import json
import datetime
from sqlalchemy.orm import Session
from .database import engine, SessionLocal, Base
from . import models

# Ensure tables exist
Base.metadata.create_all(bind=engine)

def seed():
    db = SessionLocal()
    
    # Check if already seeded
    if db.query(models.User).first():
        print("Database already seeded.")
        return
        
    print("Seeding database...")
    
    # Seed Users
    admin = models.User(
        id='u-admin-1',
        name='System Administrator',
        email='admin@lms.com',
        role='admin',
        password='admin123',
        createdAt=datetime.datetime.utcnow().isoformat()
    )

    trainer = models.User(
        id='u-trainer-1',
        name='Admin Trainer',
        email='trainer@lms.com',
        role='trainer',
        password='trainer123',
        createdAt=datetime.datetime.utcnow().isoformat()
    )
    
    student1 = models.User(
        id='u-student-1',
        name='Ashwith',
        email='ashwith@example.com',
        role='student',
        studentId='LMS001',
        department='CSE',
        batch='2026',
        password='student123',
        createdAt=datetime.datetime.utcnow().isoformat()
    )
    
    db.add(admin)
    db.add(trainer)
    db.add(student1)
    
    db.commit()
    print("Seeding complete.")

if __name__ == "__main__":
    seed()
