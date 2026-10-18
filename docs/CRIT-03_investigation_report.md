# Investigation Report: CRIT-03 Attempt Hijacking and Unauthorized Deletion

**Target Component:** Attempt Management, Scheduling, and Exam Ownership  
**Primary Files:**
- `backend/routers/attempts_router.py`
- `backend/routers/tests_router.py`
- `backend/models.py`
- `backend/schemas.py`
- `frontend/src/services/testService.ts`
- `frontend/src/pages/trainer/Tests.tsx`

**Date:** 2026-10-14  
**Status:** Completed Investigation  
**Verdict:** **READY TO FIX**

---

## 1. Executive Summary

A comprehensive, independent security investigation was conducted into **CRIT-03: Attempt Hijacking and Unauthorized Deletion** across the LMS backend and frontend components.

Building upon the previous remediation of **CRIT-01** (Score & Violation Tampering) and **CRIT-02** (Schedule Authorization & Universal Schedule Bypass), this audit focused on:
1. Cross-student attempt access, forgery, or tampering.
2. Trainer-to-test role authorization and attempt scoping.
3. Deletion and reset pathways that could destroy or tamper with submitted or in-progress attempts.
4. Database cascade rules and foreign key integrity between `Attempt`, `Answer`, `Schedule`, `Test`, and `ProctoringLog`.

### Key Investigation Findings

1. **Student Isolation Is Effectively Enforced**:
   Under the CRIT-01 and CRIT-02 fixes, student attempts are strictly scoped to `current_user.id`. Students cannot read, modify, sync, submit, or review other students' attempts. Furthermore, students cannot forge attempts for other students or supply arbitrary attempt IDs.

2. **Critical Vulnerability: Trainer-to-Test Authorization Scoping Missing Across All Attempt Endpoints (IDOR / Hijacking)**:
   While students are strictly bound to their own records, **trainers (`current_user.role == "trainer"`) possess platform-wide, unscoped privileges**:
   - `GET /api/attempts`: An unrelated trainer can enumerate all student attempts across all tests and institutions.
   - `GET /api/attempts/{attempt_id}`: An unrelated trainer can inspect complete attempt data (answers, IP address, device telemetry, proctoring summary) for tests they did not author or teach.
   - `PUT /api/attempts/{attempt_id}`: An unrelated trainer can alter grades, percentages, violation counts, and exam statuses (`terminated_violation`, `in_progress`, etc.) for tests owned by other trainers.
   - `POST /api/attempts/{attempt_id}/sync-answer`: An unrelated trainer can inject answers and increment violations on live in-progress student attempts.
   - `POST /api/attempts/{attempt_id}/submit`: An unrelated trainer can prematurely force submission of another trainer's student's attempt.
   - `GET /api/attempts/{attempt_id}/review`: An unrelated trainer can extract full question banks, explanations, and answer keys from assessments authored by other trainers.

3. **Critical Vulnerability: Unauthorized Schedule Deletion Permanently Destroys Submitted Attempts**:
   In `backend/routers/tests_router.py:370-399` (`DELETE /api/schedules/{schedule_id}`):
   - Any trainer can invoke this endpoint on any schedule without verifying test authorship.
   - The endpoint checks if an attempt is currently `in_progress` (`HTTP 409 Conflict`), **but if all attempts are `submitted` or `auto_submitted`, it proceeds to DELETE all student attempts and all student answers from the database!**
   - This allows any trainer to permanently wipe official exam records and grades.

4. **Database Cascade & Foreign Key Failure on Attempt Deletion**:
   - `Attempt` defines `cascade="all, delete-orphan"` for `Answer`, but has **no relationship or cascade** defined for `ProctoringLog`.
   - When an attempt with associated proctoring logs is deleted (e.g., via schedule deletion), PostgreSQL or SQLite with foreign keys enabled aborts with `IntegrityError: FOREIGN KEY constraint failed`, crashing the endpoint with `HTTP 500`.

5. **Unauthorized Incomplete Attempt Purge in Reconduct**:
   In `backend/routers/tests_router.py:500-624` (`POST /api/schedules/{schedule_id}/extend`):
   - An unrelated trainer can trigger `resetIncompleteAttempts: True` on another trainer's schedule, deleting in-progress attempts and answers belonging to students outside their authority.

6. **Unauthorized Test Deletion**:
   In `backend/routers/tests_router.py:115-128` (`DELETE /api/tests/{test_id}`):
   - Any trainer can delete any test without checking `authorId == current_user.id`.
   - Deleting a test cascades into schedules, leaving associated student attempts orphaned or failing with foreign key integrity violations.

---

## 2. Affected Endpoints and Authorization Analysis

| Endpoint | Method | File & Location | Current Role Guard | Authorization Check Enforced | Defect / Vulnerability Description |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `/api/attempts` | `GET` | `attempts_router.py:15-50` | `get_current_user` | `if current_user.role == "student": filter(studentId == current_user.id)` | **Trainer IDOR**: If `current_user.role != "student"`, returns all attempts across all tests and institutions without checking trainer authorship. |
| `/api/attempts/{id}` | `GET` | `attempts_router.py:238-249` | `get_current_user` | `if current_user.role == "student" and att.studentId != current_user.id: raise 403` | **Trainer Attempt Hijacking**: Non-students bypass ownership check; any trainer can view any student's answers, IP, device, and telemetry. |
| `/api/attempts/{id}` | `PUT` | `attempts_router.py:251-354` | `get_current_user` | `if current_user.role == "student" and att.studentId != current_user.id: raise 403` | **Trainer Grade/Status Tampering**: Any trainer can overwrite scores, percentage, status, violations, and answers on attempts for tests they do not manage. |
| `/api/attempts/{id}/sync-answer` | `POST` | `attempts_router.py:356-405` | `get_current_user` | `if current_user.role == "student" and att.studentId != current_user.id: raise 403` | **Trainer Live Exam Interference**: Any trainer can inject answers or manipulate violation counters on active student attempts. |
| `/api/attempts/{id}/submit` | `POST` | `attempts_router.py:407-530` | `get_current_user` | `if current_user.role == "student" and att.studentId != current_user.id: raise 403` | **Trainer Premature Termination**: Any trainer can trigger submission of another trainer's student's in-progress exam. |
| `/api/attempts/{id}/review` | `GET` | `attempts_router.py:532-620` | `get_current_user` | `if current_user.role == "student" and att.studentId != current_user.id: raise 403` | **Trainer Question Bank Leak**: Any trainer can review question text, answer keys, explanations, and student choices for unowned tests. |
| `/api/schedules/{id}` | `DELETE` | `tests_router.py:370-399` | `require_roles("admin", "institution", "trainer")` | Only checks `in_progress == None` | **Catastrophic Attempt Wiping**: Any trainer can delete any schedule. If attempts are `submitted`, it deletes all attempt rows and answers! Crashes with 500 if proctoring logs exist. |
| `/api/schedules/{id}/extend` | `POST` | `tests_router.py:500-624` | `require_roles("admin", "institution", "trainer")` | None on test authorship | **Unauthorized Attempt Reset**: Any trainer can execute `resetIncompleteAttempts: True` on another trainer's schedule. |
| `/api/tests/{id}` | `DELETE` | `tests_router.py:115-128` | `require_roles("admin", "institution", "trainer")` | None on test authorship | **Unauthorized Test Destruction**: Any trainer can delete tests authored by other trainers, orphaning attempts. |

---

## 3. Investigation Task Results

### Task 1: Identify every endpoint through which a user could access, modify, delete, or reset another user's attempt
- **Identified Endpoints:**
  - `GET /api/attempts` (Access / Enumeration)
  - `GET /api/attempts/{attempt_id}` (Access / Inspection)
  - `PUT /api/attempts/{attempt_id}` (Modification / Grade Tampering)
  - `POST /api/attempts/{attempt_id}/sync-answer` (Modification / Live Interference)
  - `POST /api/attempts/{attempt_id}/submit` (Modification / Forced Submission)
  - `GET /api/attempts/{attempt_id}/review` (Access / Question Key Exfiltration)
  - `DELETE /api/schedules/{schedule_id}` (Permanent Deletion of submitted attempts)
  - `POST /api/schedules/{schedule_id}/extend` (Reset / Deletion of incomplete attempts)
  - `DELETE /api/tests/{test_id}` (Destruction of parent test and schedules)

### Task 2: Check whether ownership is verified using the authenticated identity rather than a client-supplied student ID
- **Student Role:** **VERIFIED SECURE**.
  - `create_attempt`: `st_id = current_user.id` when `current_user.role == "student"`. Supplying another student ID returns `HTTP 403 Forbidden`. Supplying a client-controlled attempt `id` returns `HTTP 400 Bad Request`.
  - `get_attempts`: Query is unconditionally filtered by `models.Attempt.studentId == current_user.id`.
  - `get_attempt`, `update_attempt`, `sync_answer`, `submit_attempt`, `get_attempt_review`: All verify `att.studentId == current_user.id`.
- **Trainer Role:** **FAILED**.
  - Trainers are exempt from `att.studentId == current_user.id`, but no secondary check verifies whether the trainer owns or is assigned to the test.

### Task 3: Check whether trainers are restricted to attempts belonging to tests they are authorized to manage
- **VERIFIED VULNERABLE**.
  - In `backend/routers/attempts_router.py`, the string `"trainer"` only appears in comments. There is zero code checking `test.authorId == current_user.id` or checking `TrainerAssignment`.
  - Any trainer can view, edit, grade, sync, submit, or review attempts for any test.

### Task 4: Verify that submitted and auto-submitted attempts cannot be deleted, reset, or modified through alternate endpoints
- **Modification via PUT / Sync / Submit:**
  - Students cannot modify submitted attempts (`HTTP 400 Bad Request`).
  - Concurrent duplicate submission is blocked by atomic CAS update (`WHERE status = 'in_progress'`).
- **Deletion via Schedule Deletion (`DELETE /api/schedules/{schedule_id}`):** **CRITICAL VULNERABILITY**.
  - If attempts are submitted, line 381 finds no `in_progress` attempt.
  - Lines 392–396 query all attempts for that schedule and explicitly execute `db.query(models.Answer)...delete()` and `db.delete(att)`.
  - **All submitted student attempts and answers are permanently deleted.**

### Task 5: Check whether deleting an attempt cascades into answers or other exam records
- **Answer Records:** Explicitly deleted in `delete_schedule` and covered by `cascade="all, delete-orphan"` on `Attempt.answers_records`.
- **Proctoring Logs:** `ProctoringLog` has `attemptId = Column(String(64), ForeignKey("attempts.id"))`, but `Attempt` defines **no relationship or cascade** to `ProctoringLog`. When foreign keys are enabled (PostgreSQL / SQLite `PRAGMA foreign_keys = ON`), deleting an attempt with proctoring logs raises `sqlite3.IntegrityError: FOREIGN KEY constraint failed` (`HTTP 500`).
- **Audit Records:** There is no immutable exam audit log table; deleting the attempt permanently erases the only record of the student taking the exam.

### Task 6: Review interactions with CRIT-01 and CRIT-02 protections
- **CRIT-01 Protections:** Prevented student self-tampering of scores/violations and eliminated duplicate submission race conditions. However, CRIT-01 allowed staff updates under the assumption that trainer scoping would be addressed under role authorization.
- **CRIT-02 Protections:** Successfully removed universal schedules and client-supplied `id` attempt overwriting in `create_attempt`. However, alternate deletion pathways in `tests_router.py` remained unaddressed.

### Task 7: Identify legitimate admin, trainer, and student workflows that must remain functional
- **Student Workflows:** Starting scheduled exams, resuming in-progress attempts, saving answers, submitting exams, reviewing immediate feedback, and viewing personal attempt history.
- **Trainer Workflows:** Viewing submissions and attendance for tests they authored/manage; adjusting scores/violations for their own students; extending windows or creating makeup sessions for their tests; deleting empty/unused schedules.
- **Admin / Institution Workflows:** Platform-wide monitoring, cross-batch attendance auditing, system-level score adjustments, institutional analytics.

---

## 4. Controlled Local Reproduction Results

An isolated reproduction suite was constructed and executed in `scratch/reproduce_crit03.py` using an independent SQLite database with strict foreign keys enabled (`PRAGMA foreign_keys=ON`) and live HTTP requests via background Uvicorn.

```
==================================================================
CRIT-03: CONTROLLED LOCAL REPRODUCTION OF CONFIRMED VULNERABILITIES
==================================================================

--- TEST GROUP 1: Student Isolation & Cross-Student Tampering Protections ---
[1.1] Student 2 GET Student 1 in-progress attempt: status=403
[1.2] Student 2 GET Student 1 submitted attempt: status=403
[1.3] Student 2 PUT Student 1 attempt: status=403
[1.4] Student 2 sync-answer to Student 1 attempt: status=403
[1.5] Student 2 submit Student 1 attempt: status=403
[1.6] Student 2 review Student 1 attempt: status=403
[1.7] Student 2 list attempts?studentId=s1: count=0
[1.8] Student 2 create attempt with studentId=s1: status=403

--- TEST GROUP 2: Trainer-to-Test Authorization Scoping (IDOR & Tampering) ---
[2.1] Unrelated Trainer B GET Student 1 attempt: status=200                [CONFIRMED IDOR]
[2.2] Unrelated Trainer B GET /review for Trainer A's test: status=200     [CONFIRMED KEY LEAK]
[2.3] Unrelated Trainer B PUT (tamper score/status) Student 1: status=200  [CONFIRMED TAMPERING]
[2.4] Unrelated Trainer B GET /attempts?testId=test_a: status=200          [CONFIRMED ENUMERATION]
[2.5] Unrelated Trainer B sync-answer to Student 1 attempt: status=200     [CONFIRMED INTERFERENCE]
[2.6] Unrelated Trainer B forcibly submits Student 1 attempt: status=200   [CONFIRMED FORCED SUBMIT]

--- TEST GROUP 3: Schedule Deletion Wiping Submitted Attempts ---
[Pre-Check 3] Existing attempt before schedule deletion: exists=True, answers=1
[3.1] Unrelated Trainer B DELETE schedule with SUBMITTED attempt: status=200
[3.2] Attempt in database after DELETE schedule: exists=False, answers=0   [CONFIRMED DATA LOSS]

--- TEST GROUP 4: ProctoringLog Cascade Defect On Attempt Deletion ---
[4.1] DELETE schedule when Attempt has ProctoringLog (FK enabled): status=500
      sqlite3.IntegrityError: FOREIGN KEY constraint failed               [CONFIRMED FK CRASH]

--- TEST GROUP 5: Reconduct / Incomplete Attempt Purge Scoping ---
[5.1] Trainer B extend with resetIncompleteAttempts: status=200, attempt_purged=True [CONFIRMED UNLINKED RESET]

--- TEST GROUP 6: Test Deletion Without Ownership Verification ---
[6.1] Trainer B DELETE Test A (authored by Trainer A): status=200         [CONFIRMED UNAUTHORIZED DELETE]

==================================================================
REPRODUCTION SUMMARY RESULTS
==================================================================
  1.1_student_view_inprog: True (PASSED)
  1.2_student_view_sub: True (PASSED)
  1.3_student_put_attempt: True (PASSED)
  1.4_student_sync_answer: True (PASSED)
  1.5_student_submit_attempt: True (PASSED)
  1.6_student_review_attempt: True (PASSED)
  1.7_student_list_isolation: True (PASSED)
  1.8_student_spoof_studentId: True (PASSED)
  2.1_trainer_b_read_attempt: True (VULNERABLE)
  2.2_trainer_b_review_leak: True (VULNERABLE)
  2.3_trainer_b_tamper_score: True (VULNERABLE)
  2.4_trainer_b_list_attempts: True (VULNERABLE)
  2.5_trainer_b_sync_tamper: True (VULNERABLE)
  2.6_trainer_b_force_submit: True (VULNERABLE)
  3.1_schedule_deletion_allowed: True (VULNERABLE)
  3.2_submitted_attempts_destroyed: True (VULNERABLE)
  4.1_proctoring_cascade_failure: True (DEFECT CONFIRMED)
  5.1_trainer_b_purged_inprog_attempt: True (VULNERABLE)
  6.1_trainer_b_delete_test_allowed: True (VULNERABLE)
```

---

## 5. Minimal Remediation Proposal

To secure attempt ownership and eliminate unauthorized deletions without altering database schemas or breaking existing workflows:

### 1. Test Authorization Helper Function
Add a centralized authorization helper in `backend/auth.py` or `backend/routers/attempts_router.py`:
```python
def check_trainer_test_access(user: models.User, test: models.Test, db: Session) -> bool:
    """
    Returns True if user is authorized to view or manage attempts for this test:
    - Admin and Institution roles have global oversight.
    - Trainer role must be authorId or assigned via TrainerAssignment.
    """
    if user.role in ("admin", "institution"):
        return True
    if user.role == "trainer":
        if test.authorId == user.id:
            return True
        # Check topic or course assignment
        if test.courseId or test.topicId:
            assignment = db.query(models.TrainerAssignment).filter(
                models.TrainerAssignment.trainerId == user.id,
                (models.TrainerAssignment.courseId == test.courseId) |
                (models.TrainerAssignment.topicId == test.topicId)
            ).first()
            if assignment:
                return True
    return False
```

### 2. Scope `backend/routers/attempts_router.py` Endpoints
- **`GET /api/attempts`**:
  - For `student`: Keep filter `studentId == current_user.id`.
  - For `trainer`: Restrict query to tests where `check_trainer_test_access` is True (filter schedules where `test.authorId == current_user.id` or trainer assigned). If a specific `testId` is requested, reject with `HTTP 403` if trainer lacks access.
- **`GET /api/attempts/{attempt_id}`**:
  - If `current_user.role == "student"`: enforce `att.studentId == current_user.id`.
  - If `current_user.role == "trainer"`: resolve test from `att.schedule.test` (or `att.testId`), check access, and reject with `HTTP 403` if not authorized.
- **`PUT /api/attempts/{attempt_id}`**:
  - If `current_user.role == "trainer"`: enforce test access before allowing staff manual grading or violation adjustment.
- **`POST /api/attempts/{attempt_id}/sync-answer`**:
  - Restrict strictly to the attempting student (`att.studentId == current_user.id and current_user.role == "student"`). Reject staff invocations with `HTTP 403 Forbidden` (trainers cannot inject answers into live exams).
- **`POST /api/attempts/{attempt_id}/submit`**:
  - Allow the attempting student (`att.studentId == current_user.id`) OR authorized staff with verified test access.
- **`GET /api/attempts/{attempt_id}/review`**:
  - For students: enforce ownership and review policy.
  - For trainers: enforce test management authorization (`HTTP 403` if unauthorized).

### 3. Protect Submitted Attempts Against Schedule Deletion (`backend/routers/tests_router.py`)
In `delete_schedule`:
- Verify trainer test authorship:
  ```python
  if current_user.role == "trainer" and db_sched.test.authorId != current_user.id:
      raise HTTPException(status_code=403, detail="Not authorized to delete schedules for this assessment.")
  ```
- **Block schedule deletion if ANY attempts exist**:
  ```python
  existing_attempts = db.query(models.Attempt).filter(models.Attempt.scheduleId == schedule_id).first()
  if existing_attempts:
      raise HTTPException(
          status_code=status.HTTP_400_BAD_REQUEST,
          detail="Cannot delete a schedule with existing student attempts. Submitted attempts are permanent records."
      )
  ```
  This immediately eliminates data destruction of submitted attempts!

### 4. Secure Reconduct & Test Deletion (`backend/routers/tests_router.py`)
- In `extend_schedule`: Verify trainer test authorship before extending or resetting incomplete attempts.
- In `delete_test`: Verify `db_test.authorId == current_user.id` for trainers, and check whether attempts exist before deleting.

### 5. Cascade Integrity in `backend/models.py`
Add relationship from `Attempt` to `ProctoringLog`:
```python
class Attempt(Base):
    ...
    proctoring_logs = relationship("ProctoringLog", backref="attempt", cascade="all, delete-orphan")
```

---

## 6. Required Regression Tests and Compatibility Risks

### Required Regression Tests
1. **CRIT-03 Specific Tests (`test_crit_003_attempt_auth.py`)**:
   - Trainer A creates Test A and schedules it. Trainer B attempts `GET /attempts/{id}`, `PUT /attempts/{id}`, `POST /attempts/{id}/sync-answer`, `POST /attempts/{id}/submit`, `GET /attempts/{id}/review`, and `GET /attempts?testId=test_a` -> Verify all return `403 Forbidden`.
   - Admin and Institution access to the same endpoints returns `200 OK`.
   - Trainer A (author) access to the same endpoints returns `200 OK`.
   - Calling `DELETE /api/schedules/{id}` on a schedule with submitted attempts returns `400 Bad Request` with message stating attempts exist; verify database records remain intact.
   - Calling `DELETE /api/schedules/{id}` on an empty schedule (0 attempts) deletes cleanly.
   - Calling `DELETE /api/tests/{id}` by an unassociated trainer returns `403 Forbidden`.
   - Incomplete attempt reset via `extend_schedule` by an unassociated trainer returns `403 Forbidden`.
2. **Prior Fix Regression Verification**:
   - `test_crit_001_attempts.py` (All 16 tests must pass).
   - `test_crit_002_schedule_auth.py` (All 24 tests must pass).
   - `test_sec_001_questions.py` (All 17 steps must pass).
   - `test_sec_002_passwords.py` (All 20 steps must pass).
   - `frontend/` build (`npm run build` must succeed with 0 TypeScript errors).

### Compatibility Risks
- **Trainer Dashboard & Test Management**:
  - The frontend trainer pages (`frontend/src/pages/trainer/Tests.tsx`, `Students.tsx`, `Dashboard.tsx`) call `api.get('/attempts')` and `api.get('/schedules')`.
  - When backend scopes `GET /api/attempts` for trainers, trainers will receive only attempts for tests they manage rather than the entire institution's data. This matches expected UI semantics and prevents cross-trainer data leakage.
- **Admin/Institution Access**:
  - Admins and institutions retain unrestricted platform-wide access, preserving institutional reporting.

---

## 7. Conclusion and Final Status

All vulnerabilities regarding Attempt Hijacking and Unauthorized Deletion have been identified, traced to exact source lines, and mechanically verified via isolated automated reproductions.

The minimal remediation proposal targets exact authorization gates and prevents deletion of submitted attempts while maintaining full backwards compatibility for legitimate student and staff workflows.

**INVESTIGATION COMPLETE**  
**VERDICT: READY TO FIX**
