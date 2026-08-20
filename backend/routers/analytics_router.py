import json
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional
import models
import schemas
from database import get_db
from auth import get_current_user, require_roles

router = APIRouter(tags=["analytics"])

# --- Student Dashboard & Analytics Endpoints ---

@router.get("/api/student/dashboard/{student_id}")
def get_student_dashboard_data(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    student = db.query(models.User).filter(models.User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student_batch = student.batch
    now = models.get_utc_now()

    # Fetch all schedules and tests
    all_schedules = db.query(models.Schedule).all()
    all_tests = {t.id: t for t in db.query(models.Test).all()}
    
    # Fetch all attempts for this student
    student_attempts = db.query(models.Attempt).filter(models.Attempt.studentId == student_id).all()
    attempts_by_sched = {a.scheduleId: a for a in student_attempts if a.scheduleId}
    attempts_by_test = {}
    for a in student_attempts:
        t_id = a.testId
        if t_id and t_id not in attempts_by_test:
            attempts_by_test[t_id] = a

    upcoming_tests = []
    past_exams = []

    for s in all_schedules:
        test = all_tests.get(s.testId)
        if not test or test.status.lower() == "archived":
            continue

        # Check if student is assigned
        is_assigned = True
        assigned_batch = s.assignedBatch
        assigned_students = s.assignedStudents

        if assigned_batch and assigned_batch != "all":
            if student_batch and student_batch.lower() != assigned_batch.lower():
                is_assigned = False
        if assigned_students and len(assigned_students) > 0 and "all" not in assigned_students:
            if student_id not in assigned_students:
                is_assigned = False

        if not is_assigned:
            continue

        att = attempts_by_sched.get(s.id) or attempts_by_test.get(s.testId)
        is_completed = att and att.status in ("submitted", "auto_submitted", "completed")
        is_available = (now >= s.startTime and now <= s.endTime and not is_completed)

        upcoming_tests.append({
            "schedule": schemas.Schedule.model_validate(s),
            "test": schemas.Test.model_validate(test),
            "attempt": schemas.Attempt.model_validate(att) if att else None,
            "isAvailable": is_available
        })

    # Build past exams list
    submitted_attempts = [a for a in student_attempts if a.status in ("submitted", "auto_submitted", "completed")]
    for a in submitted_attempts:
        t_id = a.testId
        test = all_tests.get(t_id) if t_id else None
        if not test and a.schedule and a.schedule.testId:
            test = all_tests.get(a.schedule.testId)
        if test:
            past_exams.append({
                "attempt": schemas.Attempt.model_validate(a),
                "test": schemas.Test.model_validate(test)
            })

    # Compute student stats
    total_completed = len(submitted_attempts)
    avg_score = round(sum(a.percentage or 0 for a in submitted_attempts) / total_completed, 1) if total_completed > 0 else 0.0
    highest_score = round(max((a.percentage or 0 for a in submitted_attempts), default=0.0), 1)

    return {
        "upcoming_tests": upcoming_tests,
        "past_exams": past_exams,
        "stats": {
            "totalCompleted": total_completed,
            "averageScore": avg_score,
            "highestScore": highest_score
        }
    }

@router.get("/api/student/analytics/{student_id}")
@router.get("/api/analytics/student/{student_id}")
def get_student_analytics(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    student = db.query(models.User).filter(models.User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    attempts = db.query(models.Attempt).filter(
        models.Attempt.studentId == student_id,
        models.Attempt.status.in_(["submitted", "auto_submitted", "completed"])
    ).order_by(models.Attempt.submittedAt).all()

    total_attempts = len(attempts)
    avg_score = round(sum(a.percentage or 0 for a in attempts) / total_attempts, 1) if total_attempts > 0 else 0.0
    highest_score = round(max((a.percentage or 0 for a in attempts), default=0.0), 1)
    passed_attempts = [a for a in attempts if (a.percentage or 0) >= 60.0]
    pass_rate = round((len(passed_attempts) / total_attempts) * 100, 1) if total_attempts > 0 else 0.0
    
    total_violations = sum(a.violations or 0 for a in attempts)
    integrity_rating = max(0, 100 - total_violations * 10)

    # Progression over time
    progression = []
    for idx, a in enumerate(attempts):
        test_title = a.schedule.test.title if a.schedule and a.schedule.test else f"Assessment #{idx + 1}"
        progression.append({
            "testTitle": test_title,
            "percentage": a.percentage or 0.0,
            "score": a.score or 0.0,
            "date": (a.submittedAt or a.startedAt)[:10] if (a.submittedAt or a.startedAt) else "N/A"
        })

    # Accuracy by difficulty & category analysis
    difficulty_stats = {"Easy": {"correct": 0, "total": 0}, "Medium": {"correct": 0, "total": 0}, "Hard": {"correct": 0, "total": 0}}
    category_stats = {}

    for a in attempts:
        for ans in a.answers_records:
            q = ans.question
            if q:
                diff = q.difficulty or "Medium"
                if diff not in difficulty_stats:
                    difficulty_stats[diff] = {"correct": 0, "total": 0}
                difficulty_stats[diff]["total"] += 1
                if ans.isCorrect:
                    difficulty_stats[diff]["correct"] += 1

                cat = q.category or "General"
                if cat not in category_stats:
                    category_stats[cat] = {"correct": 0, "total": 0}
                category_stats[cat]["total"] += 1
                if ans.isCorrect:
                    category_stats[cat]["correct"] += 1

    difficulties = []
    for diff, val in difficulty_stats.items():
        acc = round((val["correct"] / val["total"]) * 100, 1) if val["total"] > 0 else 0.0
        difficulties.append({
            "difficulty": diff,
            "accuracy": acc,
            "correctQuestions": val["correct"],
            "totalQuestions": val["total"]
        })

    categories = []
    for cat, val in category_stats.items():
        acc = round((val["correct"] / val["total"]) * 100, 1) if val["total"] > 0 else 0.0
        categories.append({
            "category": cat,
            "accuracy": acc,
            "totalQuestions": val["total"]
        })

    return {
        "kpis": {
            "totalAttempts": total_attempts,
            "avgScore": avg_score,
            "passRate": pass_rate,
            "highestScore": highest_score,
            "testsPassed": len(passed_attempts),
            "integrityRating": integrity_rating
        },
        "progression": progression,
        "difficulties": difficulties,
        "categories": categories
    }

# --- System-Wide Summary Analytics ---

@router.get("/api/analytics/summary")
def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    total_users = db.query(models.User).count()
    total_students = db.query(models.User).filter(models.User.role == "student").count()
    total_trainers = db.query(models.User).filter(models.User.role == "trainer").count()
    total_tests = db.query(models.Test).count()
    total_questions = db.query(models.Question).count()
    total_attempts = db.query(models.Attempt).count()

    dept_counts = {}
    for d in db.query(models.Department).all():
        student_count = db.query(models.StudentProfile).filter(models.StudentProfile.departmentId == d.id).count()
        dept_counts[d.name] = student_count

    batch_counts = {}
    for b in db.query(models.Batch).all():
        student_count = db.query(models.StudentProfile).filter(models.StudentProfile.primaryBatchId == b.id).count()
        batch_counts[b.name] = student_count

    diff_counts = {"Easy": 0, "Medium": 0, "Hard": 0}
    for q in db.query(models.Question).all():
        d = q.difficulty or "Medium"
        diff_counts[d] = diff_counts.get(d, 0) + 1

    return {
        "kpis": {
            "totalUsers": total_users,
            "totalStudents": total_students,
            "totalTrainers": total_trainers,
            "totalTests": total_tests,
            "totalQuestions": total_questions,
            "totalAttempts": total_attempts,
            "avgScore": 75.0
        },
        "departmentCounts": dept_counts,
        "batchCounts": batch_counts,
        "questionDifficulty": diff_counts
    }

# --- Trainer Analytics ---

@router.get("/api/analytics/trainer")
def get_trainer_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution", "trainer"))
):
    tests = db.query(models.Test).all()
    questions = db.query(models.Question).all()
    attempts = db.query(models.Attempt).filter(
        models.Attempt.status.in_(["submitted", "auto_submitted", "completed"])
    ).all()

    total_submissions = len(attempts)
    scores = [a.percentage or 0.0 for a in attempts]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0
    pass_count = sum(1 for s in scores if s >= 60.0)
    pass_rate = round((pass_count / len(scores)) * 100, 1) if scores else 0.0
    highest_score = round(max(scores, default=0.0), 1)
    lowest_score = round(min(scores, default=0.0), 1) if scores else 0.0
    sorted_scores = sorted(scores)
    median_score = sorted_scores[len(sorted_scores) // 2] if sorted_scores else 0.0
    total_violations = sum(a.violations or 0 for a in attempts)

    score_brackets = {
        "80-100": sum(1 for s in scores if s >= 80),
        "60-79": sum(1 for s in scores if 60 <= s < 80),
        "40-59": sum(1 for s in scores if 40 <= s < 60),
        "0-39": sum(1 for s in scores if s < 40)
    }

    attempt_status_breakdown = {
        "submitted": sum(1 for a in attempts if a.status == "submitted"),
        "autoSubmitted": sum(1 for a in attempts if a.status == "auto_submitted"),
        "inProgress": db.query(models.Attempt).filter(models.Attempt.status == "in_progress").count()
    }

    test_summaries = []
    for t in tests:
        t_attempts = [a for a in attempts if a.testId == t.id or (a.schedule and a.schedule.testId == t.id)]
        t_scores = [a.percentage or 0.0 for a in t_attempts]
        test_summaries.append({
            "testId": t.id,
            "title": t.title,
            "submissions": len(t_attempts),
            "avgScore": round(sum(t_scores) / len(t_scores), 1) if t_scores else 0.0,
            "passRate": round((sum(1 for s in t_scores if s >= 60) / len(t_scores)) * 100, 1) if t_scores else 0.0
        })

    return {
        "kpis": {
            "totalTests": len(tests),
            "totalSubmissions": total_submissions,
            "avgScore": avg_score,
            "passRate": pass_rate,
            "highestScore": highest_score,
            "lowestScore": lowest_score,
            "medianScore": median_score,
            "avgDuration": 45,
            "questionsCreated": len(questions),
            "totalViolations": total_violations
        },
        "testSummaries": test_summaries,
        "scoreBrackets": score_brackets,
        "attemptStatusBreakdown": attempt_status_breakdown
    }

# --- Admin Analytics ---

@router.get("/api/analytics/admin")
def get_admin_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution"))
):
    users = db.query(models.User).all()
    tests = db.query(models.Test).all()
    questions = db.query(models.Question).all()
    attempts = db.query(models.Attempt).all()
    submitted = [a for a in attempts if a.status in ("submitted", "auto_submitted", "completed")]

    scores = [a.percentage or 0.0 for a in submitted]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0
    completion_rate = round((len(submitted) / len(attempts)) * 100, 1) if attempts else 0.0

    dept_counts = {}
    for d in db.query(models.Department).all():
        dept_counts[d.name] = db.query(models.StudentProfile).filter(models.StudentProfile.departmentId == d.id).count()

    batch_counts = {}
    for b in db.query(models.Batch).all():
        batch_counts[b.name] = db.query(models.StudentProfile).filter(models.StudentProfile.primaryBatchId == b.id).count()

    score_brackets = {
        "80-100": sum(1 for s in scores if s >= 80),
        "60-79": sum(1 for s in scores if 60 <= s < 80),
        "40-59": sum(1 for s in scores if 40 <= s < 60),
        "0-39": sum(1 for s in scores if s < 40)
    }

    diff_counts = {"Easy": 0, "Medium": 0, "Hard": 0}
    for q in questions:
        d = q.difficulty or "Medium"
        diff_counts[d] = diff_counts.get(d, 0) + 1

    return {
        "kpis": {
            "totalUsers": len(users),
            "totalStudents": sum(1 for u in users if u.role == "student"),
            "totalTrainers": sum(1 for u in users if u.role == "trainer"),
            "totalTests": len(tests),
            "totalQuestions": len(questions),
            "avgScore": avg_score,
            "completionRate": completion_rate
        },
        "departmentCounts": dept_counts,
        "batchCounts": batch_counts,
        "scoreBrackets": score_brackets,
        "questionDifficulty": diff_counts
    }

# --- Institution Analytics ---

@router.get("/api/analytics/institution")
def get_institution_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("admin", "institution"))
):
    students = db.query(models.User).filter(models.User.role == "student").all()
    trainers = db.query(models.User).filter(models.User.role == "trainer").all()
    tests = db.query(models.Test).all()
    attempts = db.query(models.Attempt).filter(models.Attempt.status.in_(["submitted", "auto_submitted", "completed"])).all()

    scores = [a.percentage or 0.0 for a in attempts]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0
    pass_rate = round((sum(1 for s in scores if s >= 60) / len(scores)) * 100, 1) if scores else 0.0

    departments_data = []
    for d in db.query(models.Department).all():
        s_count = db.query(models.StudentProfile).filter(models.StudentProfile.departmentId == d.id).count()
        departments_data.append({"name": d.name, "students": s_count})

    batches_data = []
    for b in db.query(models.Batch).all():
        s_count = db.query(models.StudentProfile).filter(models.StudentProfile.primaryBatchId == b.id).count()
        batches_data.append({"name": b.name, "students": s_count})

    score_brackets = {
        "80-100": sum(1 for s in scores if s >= 80),
        "60-79": sum(1 for s in scores if 60 <= s < 80),
        "40-59": sum(1 for s in scores if 40 <= s < 60),
        "0-39": sum(1 for s in scores if s < 40)
    }

    return {
        "kpis": {
            "totalStudents": len(students),
            "totalTrainers": len(trainers),
            "totalSubmissions": len(attempts),
            "avgScore": avg_score,
            "passRate": pass_rate,
            "activeTests": sum(1 for t in tests if t.status == "Published"),
            "avgAttemptsPerStudent": round(len(attempts) / len(students), 1) if students else 0.0
        },
        "departments": departments_data,
        "batches": batches_data,
        "scoreBrackets": score_brackets
    }
