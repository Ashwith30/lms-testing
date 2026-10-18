# CRIT-02 Investigation Report: Exam Schedule Authorization Bypass

**Investigation Date:** 2026-10-14  
**Target Component:** Exam Attempt Creation & Schedule Authorization (`backend/routers/attempts_router.py`)  
**Severity:** CRITICAL (CVSS:3.1 / AV:N / AC:L / PR:L / UI:N / S:U / C:H / I:H / A:H — Score: 8.8)  
**Investigation Verdict:** **READY TO FIX**  

---

## 1. Executive Summary

An independent security investigation was conducted on **CRIT-02: Exam Schedule Authorization Bypass** in the LMS codebase. The primary focus was `backend/routers/attempts_router.py` (`create_attempt` endpoint at `POST /api/attempts`), its associated models (`Attempt`, `Schedule`, `ScheduleAssignment`, `Test`, `User`), authentication dependencies, and all frontend and backend callers.

The investigation confirmed that `create_attempt` suffers from **7 critical architectural and security vulnerabilities**:
1. **Rogue Schedule Auto-Creation**: If `testId` is provided without `scheduleId`, the backend dynamically generates and commits a **100-year universal schedule** (`endTime="2099-12-31T23:59:59Z"`) with no batch or student assignments, allowing any student to bypass scheduling constraints entirely.
2. **Draft & Unpublished Test Bypass**: The endpoint never queries the `Test` model or validates `test.status == 'Published'`, enabling students to start exams on unpublished drafts or archived tests.
3. **Invalid `scheduleId` Authorization Bypass**: The authorization check is wrapped in `if sched:`, meaning if a non-existent or malformed `scheduleId` is passed, `sched` is `None`, and all validation guards (dates, batch assignment, individual student assignment, attempt limits) are **completely skipped**.
4. **Cross-Test Schedule Injection**: The backend fails to verify `sched.testId == test_id`. An active schedule from an open practice test can be paired with a restricted exam to bypass eligibility checks.
5. **Student ID Spoofing / Identity Forgery**: The endpoint accepts a client-supplied `studentId` (`st_id = attempt.get("studentId") or current_user.id`), enabling any student to forge attempts under another student's account.
6. **Arbitrary Attempt Deletion & CRIT-01 Lifecycle Reset**: A client-supplied `id` causes the backend to unconditionally delete existing attempts and their associated answers without ownership or status checks (`db.delete(existing_att)`). A student can delete victims' exam submissions or reset their own completed exams back to `in_progress`, circumventing the lifecycle protections established in CRIT-01.
7. **Unchecked Duplicate In-Progress Attempts & Missing Resumption**: The endpoint checks only completed attempts (`status.in_(["submitted", "auto_submitted"])`). A student can create unlimited concurrent `in_progress` attempts, and the backend fails to safely resume existing active sessions.

All 7 vulnerabilities were mechanically reproduced and confirmed in a controlled, isolated local environment.

---

## 2. Investigation Methodology & Environment

- **Isolated Test Execution**: A dedicated verification harness (`reproduce_crit02.py`) was executed against an isolated SQLite test database with `app.dependency_overrides[get_db]`.
- **Zero Production/Workspace Pollution**: No repository code, schemas, or migrations were modified during this investigation.
- **Scope of Inspection**:
  - `backend/routers/attempts_router.py`: Lines 49–153 (`create_attempt`)
  - `backend/models.py`: `Attempt`, `Schedule`, `ScheduleAssignment`, `Test`, `User`, `StudentProfile`, `Batch`
  - `backend/schemas.py`: `AttemptBase`, `Attempt`, `AttemptUpdateRequest`, `AttemptSubmitRequest`
  - `backend/routers/questions_router.py`: `get_exam_attempt_questions` (SEC-001 reference implementation)
  - Frontend Callers: `frontend/src/services/testService.ts` (`startAttempt`, `getTestSchedule`), `frontend/src/pages/student/TestDetails.tsx`, `frontend/src/pages/student/TestAttempt.tsx`, `frontend/src/pages/student/Tests.tsx`
  - Backend/Test Callers: `test_crit_001_attempts.py`, `test_sec_001_questions.py`, `test_all_22_issues.py`, `e2e_test.py`

---

## 3. Confirmed Findings & Code Evidence

### Finding 1: Schedule Auto-Creation Bypass
- **File / Lines:** [`backend/routers/attempts_router.py:61-81`](file:///Users/akruthika/Documents/p-testing/backend/routers/attempts_router.py#L61-L81)
- **Code Inspection:**
  ```python
  # If testId is provided without scheduleId, find or link an active schedule
  if not schedule_id and test_id:
      active_sched = db.query(models.Schedule).filter(models.Schedule.testId == test_id).first()
      if active_sched:
          schedule_id = active_sched.id
      else:
          # Create a default schedule for direct test attempts
          now = models.get_utc_now()
          end = "2099-12-31T23:59:59Z"
          schedule_id = models.generate_uuid("sch-")
          new_sched = models.Schedule(
              id=schedule_id,
              testId=test_id,
              startTime=now,
              endTime=end,
              durationMinutes=60,
              attemptsAllowed=1
          )
          db.add(new_sched)
          db.commit()
  ```
- **Evidence / Reproduction:**
  When a student issues `POST /api/attempts` with `{"testId": "test-unsched-1"}`:
  1. The server generates a new `Schedule` row in the database with `endTime = "2099-12-31T23:59:59Z"`.
  2. Because `assignedBatch` is `None` and `assignedStudents` is `[]`, lines 101–107 evaluate `is_assigned = True`.
  3. The request succeeds (`HTTP 200 OK`) and returns a valid attempt linked to the 2099 schedule.
  4. Subsequent calls to `GET /tests/{test_id}/attempt-questions` query `Schedule` for `test_id`, find the auto-created 2099 schedule, and release the test questions to the student.

---

### Finding 2: Draft & Unpublished Test Access Bypass
- **File / Lines:** [`backend/routers/attempts_router.py:49-153`](file:///Users/akruthika/Documents/p-testing/backend/routers/attempts_router.py#L49-L153)
- **Code Inspection:**
  In `create_attempt`, `models.Test` is never imported or queried. There is zero validation checking whether the test exists or whether `test.status == "Published"`.
- **Evidence / Reproduction:**
  When a student sends `POST /api/attempts` with `{"testId": "test-draft-2"}` (a test with `status="Draft"`):
  - The backend creates the attempt without error (`HTTP 200 OK`, `Attempt ID: att-323f7bd6-82b2-4c88-88ac-7ee4846c3107`).
  - Draft, in-development, and archived exams can be accessed and attempted by any authenticated student.

---

### Finding 3: Invalid / Nonexistent `scheduleId` Bypasses All Authorization
- **File / Lines:** [`backend/routers/attempts_router.py:89-118`](file:///Users/akruthika/Documents/p-testing/backend/routers/attempts_router.py#L89-L118)
- **Code Inspection:**
  ```python
  # Schedule validation for student attempts
  if current_user.role == "student" and schedule_id:
      sched = db.query(models.Schedule).filter(models.Schedule.id == schedule_id).first()
      if sched:
          if now < sched.startTime:
              raise HTTPException(status_code=400, detail="Scheduled test has not started yet.")
          if now > sched.endTime:
              raise HTTPException(status_code=400, detail="Scheduled test has already ended.")
          # Check student batch / individual assignment ...
          # Check attempt limits ...
  ```
- **Evidence / Reproduction:**
  If a student provides a bogus or non-existent `scheduleId` (e.g., `{"testId": "test-restricted-3", "scheduleId": "fake-nonexistent-sch-id"}`):
  1. `sched` is `None`.
  2. `if sched:` evaluates to `False`.
  3. Lines 92–118 are completely skipped.
  4. The attempt is written to the database with `scheduleId = "fake-nonexistent-sch-id"`, completely bypassing batch gates, time windows, and attempt limits (`HTTP 200 OK`).

---

### Finding 4: Cross-Test Schedule Injection
- **File / Lines:** [`backend/routers/attempts_router.py:89-118`](file:///Users/akruthika/Documents/p-testing/backend/routers/attempts_router.py#L89-L118)
- **Code Inspection:**
  The validation loads `sched = db.query(models.Schedule).filter(models.Schedule.id == schedule_id).first()`, but never checks:
  ```python
  if sched.testId != test_id:
      raise HTTPException(status_code=400, detail="Schedule does not belong to the specified test.")
  ```
- **Evidence / Reproduction:**
  Student 1 in Batch A is restricted from Test B (Batch B only). However, Test A (an open mock exam) has an active schedule assigned to everyone.
  Student 1 sends:
  ```json
  {
    "testId": "test-restricted-3",
    "scheduleId": "sch-open-all"
  }
  ```
  - `create_attempt` validates `sch-open-all`. Because `sch-open-all` is active and open, all checks pass.
  - The attempt is created (`HTTP 200 OK`).

---

### Finding 5: Client-Supplied `studentId` Spoofing / Attempt Forgery
- **File / Lines:** [`backend/routers/attempts_router.py:56`](file:///Users/akruthika/Documents/p-testing/backend/routers/attempts_router.py#L56)
- **Code Inspection:**
  ```python
  st_id = attempt.get("studentId") or current_user.id
  ```
  There is no role check verifying that `current_user.role in ("admin", "trainer")` before accepting a client-supplied `studentId`.
- **Evidence / Reproduction:**
  Student 1 sends `POST /api/attempts` with `{"testId": "test-open-4", "scheduleId": "sch-open-all", "studentId": "user-s2-crit02"}`.
  - The server records `Attempt.studentId = "user-s2-crit02"`.
  - Student 1 can exhaust Student 2's attempt limits, pollute their exam records, or forge malicious submissions.

---

### Finding 6: Arbitrary Attempt Deletion & Lifecycle Reset via Client `id`
- **File / Lines:** [`backend/routers/attempts_router.py:55, 119-124`](file:///Users/akruthika/Documents/p-testing/backend/routers/attempts_router.py#L55), [119-124](file:///Users/akruthika/Documents/p-testing/backend/routers/attempts_router.py#L119-L124)
- **Code Inspection:**
  ```python
  a_id = attempt.get("id") or models.generate_uuid("att-")
  ...
  existing_att = db.query(models.Attempt).filter(models.Attempt.id == a_id).first()
  if existing_att:
      db.query(models.Answer).filter(models.Answer.attemptId == a_id).delete()
      db.delete(existing_att)
      db.commit()
  ```
- **Evidence / Reproduction:**
  1. Student 2 has a completed exam attempt (`att-submitted-victim`, `status="submitted"`, `score=95.0`, `violations=0`).
  2. Student 1 issues `POST /api/attempts` with `{"id": "att-submitted-victim", "testId": "test-open-4", "scheduleId": "sch-open-all"}`.
  3. The backend deletes Student 2's answers and deletes the attempt.
  4. It then creates a brand new attempt with `id="att-submitted-victim"`, `status="in_progress"`, `score=None`, and `violations=0`.
  5. **Impact**:
     - **Denial of Service**: Malicious users can erase any student's completed exam history.
     - **CRIT-01 Bypass**: A student who scored poorly or triggered proctoring violations can pass their own attempt ID into `POST /api/attempts` to wipe their bad submission and restart with a clean slate, bypassing attempt limits and immutable completion rules.

---

### Finding 7: Unchecked Duplicate In-Progress Attempts & Missing Session Resumption
- **File / Lines:** [`backend/routers/attempts_router.py:111-118`](file:///Users/akruthika/Documents/p-testing/backend/routers/attempts_router.py#L111-L118)
- **Code Inspection:**
  ```python
  submitted_count = db.query(models.Attempt).filter(
      models.Attempt.studentId == st_id,
      models.Attempt.scheduleId == schedule_id,
      models.Attempt.status.in_(["submitted", "auto_submitted"])
  ).count()
  if submitted_count >= (sched.attemptsAllowed or 1):
      raise HTTPException(status_code=400, detail=f"Maximum allowed attempts ({sched.attemptsAllowed}) reached for this test.")
  ```
- **Evidence / Reproduction:**
  `submitted_count` only tallies `submitted` and `auto_submitted`. If an attempt is currently `in_progress`, it is ignored.
  - Successive calls to `POST /api/attempts` generate distinct attempt rows (`Attempt A: att-3cbfde51...`, `Attempt B: att-01e17391...`).
  - Unlike frontend `testService.ts:204` (which checks for and resumes in-progress attempts), the backend blindly creates new rows, leading to orphan attempts, inconsistent proctoring telemetry, and race conditions during answer syncing.

---

## 4. Behavior Matrix for Schedule ID Inputs

| Scenario | Request Payload | Current Backend Behavior | Current Security Impact | Required Secure Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Missing / Null `scheduleId` (Unscheduled Test)** | `{"testId": "test-1"}` | Auto-creates a 100-year schedule (`endTime="2099-12-31"`) with no assignments; returns `200 OK`. | **CRITICAL**: Bypasses all scheduling restrictions; exposes draft/unassigned tests. | Query active assigned schedules for user. If none, reject with `403 Forbidden` ("Test is not currently scheduled"). Never auto-create. |
| **Missing / Null `scheduleId` (Single Active Schedule Exists)** | `{"testId": "test-1"}` | Uses first schedule found in DB; checks batch/time. | **HIGH**: Can attach to wrong schedule or expired schedule if multiple exist. | Resolve the unique active, assigned schedule for `(testId, student)`. If valid, proceed; if none or ambiguous, require explicit `scheduleId`. |
| **Missing Both `scheduleId` and `testId`** | `{}` | `schedule_id = None`; validation skipped; attempt created with `scheduleId = None`. | **HIGH**: Orphan attempt created without any schedule or test association. | Reject with `422 Unprocessable Entity` via Pydantic schema validation. |
| **Invalid / Nonexistent `scheduleId`** | `{"testId": "test-1", "scheduleId": "sch-fake"}` | `sched` is `None`; `if sched:` evaluates to `False`; all validation skipped; returns `200 OK`. | **CRITICAL**: Universal schedule bypass. Bypasses start/end times, batch restrictions, and attempt caps. | Reject with `404 Not Found` or `400 Bad Request` ("Schedule not found"). |
| **Cross-Test Schedule Injection** | `{"testId": "test-2", "scheduleId": "sch-test-1"}` | Validates `sch-test-1` eligibility; never verifies `sched.testId == test_id`; returns `200 OK`. | **CRITICAL**: Uses open permissions of Test 1 to access restricted Test 2. | Verify `sched.testId == test_id`. If mismatched, reject with `400 Bad Request` ("Schedule does not match test"). |
| **Expired Schedule** | `{"testId": "test-1", "scheduleId": "sch-past"}` | Returns `400 Bad Request` ("Scheduled test has already ended"). | **SAFE**: Correctly guarded. | Preserve `400 Bad Request` ("Scheduled test has already ended"). |
| **Future Schedule** | `{"testId": "test-1", "scheduleId": "sch-future"}` | Returns `400 Bad Request` ("Scheduled test has not started yet"). | **SAFE**: Correctly guarded. | Preserve `400 Bad Request` ("Scheduled test has not started yet"). |
| **Unassigned Batch / Student** | `{"testId": "test-1", "scheduleId": "sch-batch-b"}` | Returns `403 Forbidden` ("Student is not assigned to this scheduled test session"). | **SAFE**: Correctly guarded when `sched` exists. | Preserve `403 Forbidden`. |
| **Attempt Limit Reached** | `{"testId": "test-1", "scheduleId": "sch-active"}` | Returns `400 Bad Request` ("Maximum allowed attempts reached"). | **SAFE**: But bypassable via attempt deletion (Finding 6). | Preserve `400 Bad Request` and eliminate attempt deletion. |
| **Existing In-Progress Attempt** | `{"testId": "test-1", "scheduleId": "sch-active"}` | Creates a duplicate in-progress attempt row; returns `200 OK`. | **MEDIUM**: Duplicate attempts, fragmented telemetry, answer overwriting. | Return/resume existing `in_progress` attempt, matching frontend `testService` resumption pattern. |

---

## 5. Staff Workflows vs Student Access

The codebase distinguishes staff (`admin`, `trainer`, `institution`) from `student`:
- **Legitimate Staff Endpoints**:
  - `POST /api/schedules` ([`backend/routers/tests_router.py:286-320`](file:///Users/akruthika/Documents/p-testing/backend/routers/tests_router.py#L286-L320)): Used by trainers/admins to schedule tests for batches or individual students.
  - `POST /api/tests/{test_id}/reconduct` ([`backend/routers/tests_router.py:168-230`](file:///Users/akruthika/Documents/p-testing/backend/routers/tests_router.py#L168-L230)): Used by staff to re-schedule or clone tests for reconducting exams.
  - `POST /api/schedules/{schedule_id}/accommodate` ([`backend/routers/tests_router.py:550-580`](file:///Users/akruthika/Documents/p-testing/backend/routers/tests_router.py#L550-L580)): Used by staff to schedule makeup sessions.
- **`POST /api/attempts` Access**:
  - Frontend students call this endpoint when starting or resuming an exam via `testService.startAttempt`.
  - Staff (admins/trainers) may call this endpoint for testing or previewing exams.
  - **Required Separation of Privileges**:
    - For `student`:
      - `studentId` **must** be forced to `current_user.id`. Any incoming `studentId` differing from `current_user.id` must be rejected with `HTTP 403 Forbidden`.
      - Test must be `Published`.
      - Schedule must be valid, active, assigned to the student, and linked to `testId`.
      - `id` must be server-generated; client-supplied `id` must be ignored or forbidden.
    - For `admin` / `trainer`:
      - May specify `studentId` to simulate or initialize attempts.
      - Are exempt from student batch assignment and schedule window restrictions for preview purposes.

---

## 6. Required Authorization and Lifecycle Rules

To completely eliminate CRIT-02 and protect exam integrity, `POST /api/attempts` must adhere to these strict rules:

1. **Strict Request Validation via Pydantic Schema**:
   - Replace untyped `attempt: dict` with a validated `schemas.AttemptCreateRequest` schema (`extra="forbid"`).
   - Require `testId: str`.
   - Make `scheduleId: Optional[str] = None`.
   - Disallow client-specified `id`, `score`, `percentage`, `violations`, `violationLogs`, or `status`.
2. **Immutable Server-Side Identity**:
   - For `student`: Attempt ownership **must** come exclusively from `current_user.id`.
   - If `attempt_data.studentId` is provided by a student and does not match `current_user.id`, reject with `HTTP 403 Forbidden`.
3. **Published Test Enforcement**:
   - Query `models.Test` for `test_id`. If not found, return `HTTP 404 Not Found`.
   - If `current_user.role == "student"`, enforce `(test.status or "").lower() == "published"`. Reject unpublished/draft/archived tests with `HTTP 403 Forbidden ("Test is not published.")`.
4. **Schedule Resolution and Validation**:
   - **No Auto-Creation**: Completely delete lines 67–81 that create 2099 schedules.
   - If `scheduleId` is provided:
     - Query `models.Schedule` by `id`. If not found, return `HTTP 404 Not Found ("Schedule not found.")`.
     - Validate `sched.testId == test.id`. If mismatched, return `HTTP 400 Bad Request ("Schedule does not belong to the specified test.")`.
   - If `scheduleId` is omitted:
     - Query schedules for `test.id`. Filter for schedules assigned to `current_user` that are currently active (`startTime <= now <= endTime`).
     - If exactly one active assigned schedule exists, bind to it.
     - If no active assigned schedule exists, return `HTTP 403 Forbidden ("This test is not currently scheduled.")`.
5. **Time Window & Assignment Gates**:
   - If `now < sched.startTime`: return `HTTP 400 Bad Request ("Scheduled test has not started yet.")`.
   - If `now > sched.endTime`: return `HTTP 400 Bad Request ("Scheduled test has already ended.")`.
   - Enforce batch and individual student assignments exactly as established in `questions_router.py`. If not assigned, return `HTTP 403 Forbidden ("Student is not assigned to this scheduled test session.")`.
6. **In-Progress Attempt Resumption & Limit Enforcement**:
   - Check if an attempt with `status == "in_progress"` already exists for `(studentId, scheduleId)`.
   - If an in-progress attempt exists: **return the existing attempt** to resume the session, preventing duplicate rows and maintaining idempotency.
   - Count completed attempts (`status.in_(["submitted", "auto_submitted"])`).
   - If completed count >= `sched.attemptsAllowed`: return `HTTP 400 Bad Request ("Maximum allowed attempts reached for this test.")`.
7. **Elimination of Attempt Deletion / Overwrites**:
   - Remove lines 119–124 completely. The creation endpoint must **never delete existing attempts or answers**.
   - Server unconditionally generates a fresh UUID (`models.generate_uuid("att-")`) for new attempts.

---

## 7. Minimal Remediation Proposal

### A. Schema Updates (`backend/schemas.py`)
Add `AttemptCreateRequest`:
```python
class AttemptCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    testId: str
    scheduleId: Optional[str] = None
    studentId: Optional[str] = None
    startedAt: Optional[str] = None
    answers: Optional[Dict[str, Any]] = None
    # Client is strictly forbidden from providing: id, status, score, percentage, violations, violationLogs, proctoringSummary
```

### B. Router Updates (`backend/routers/attempts_router.py`)
Refactor `create_attempt`:
```python
@router.post("", response_model=schemas.Attempt)
def create_attempt(
    req: schemas.AttemptCreateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    now = models.get_utc_now()
    
    # 1. Enforce student identity
    if current_user.role == "student":
        if req.studentId and req.studentId != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create attempt for another student.")
        st_id = current_user.id
    else:
        st_id = req.studentId or current_user.id

    # 2. Validate Test
    test = db.query(models.Test).filter(models.Test.id == req.testId).first()
    if not test:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found.")

    if current_user.role == "student":
        if (test.status or "").lower() != "published":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Test is not published.")

    # 3. Resolve Schedule
    sched = None
    if req.scheduleId:
        sched = db.query(models.Schedule).filter(models.Schedule.id == req.scheduleId).first()
        if not sched:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found.")
        if sched.testId != test.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Schedule does not belong to the specified test.")
    else:
        # Fallback: resolve active assigned schedule for student
        if current_user.role == "student":
            all_scheds = db.query(models.Schedule).filter(models.Schedule.testId == test.id).all()
            eligible_scheds = []
            for s in all_scheds:
                # Check assignment
                assigned_batch = s.assignedBatch
                assigned_students = s.assignedStudents
                is_assigned = True
                if assigned_batch and str(assigned_batch).strip().lower() != "all":
                    if not current_user.batch or current_user.batch.strip().lower() != str(assigned_batch).strip().lower():
                        is_assigned = False
                if assigned_students and len(assigned_students) > 0 and "all" not in assigned_students:
                    if current_user.id not in assigned_students:
                        is_assigned = False
                if is_assigned and s.startTime <= now <= s.endTime:
                    eligible_scheds.append(s)

            if not eligible_scheds:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This test is not currently scheduled.")
            sched = eligible_scheds[0]

    schedule_id = sched.id if sched else None

    # 4. Student Schedule Validation (Gates, Window, Limits)
    if current_user.role == "student" and sched:
        if now < sched.startTime:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Scheduled test has not started yet.")
        if now > sched.endTime:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Scheduled test has already ended.")

        # Batch & student assignment
        assigned_batch = sched.assignedBatch
        assigned_students = sched.assignedStudents
        is_assigned = True
        if assigned_batch and str(assigned_batch).strip().lower() != "all":
            if not current_user.batch or current_user.batch.strip().lower() != str(assigned_batch).strip().lower():
                is_assigned = False
        if assigned_students and len(assigned_students) > 0 and "all" not in assigned_students:
            if current_user.id not in assigned_students:
                is_assigned = False
        if not is_assigned:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student is not assigned to this scheduled test session.")

        # 5. Check In-Progress Resumption
        in_prog = db.query(models.Attempt).filter(
            models.Attempt.studentId == st_id,
            models.Attempt.scheduleId == schedule_id,
            models.Attempt.status == "in_progress"
        ).first()
        if in_prog:
            return in_prog  # Seamless resumption

        # 6. Check Attempt Limits
        submitted_count = db.query(models.Attempt).filter(
            models.Attempt.studentId == st_id,
            models.Attempt.scheduleId == schedule_id,
            models.Attempt.status.in_(["submitted", "auto_submitted"])
        ).count()
        if submitted_count >= (sched.attemptsAllowed or 1):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Maximum allowed attempts ({sched.attemptsAllowed}) reached for this test.")

    # 7. Create New Attempt (Server-generated ID, initial values)
    a_id = models.generate_uuid("att-")
    db_att = models.Attempt(
        id=a_id,
        studentId=st_id,
        scheduleId=schedule_id,
        status="in_progress",
        startedAt=now,
        violations=0
    )
    db.add(db_att)

    # Initial answers if provided
    if req.answers and isinstance(req.answers, dict):
        for qid, ans_item in req.answers.items():
            sel = ans_item.get("selectedOption") if isinstance(ans_item, dict) else ans_item
            if sel is not None:
                sel_json = json.dumps([sel] if isinstance(sel, str) else sel)
                ans = models.Answer(
                    id=models.generate_uuid("ans-"),
                    attemptId=a_id,
                    questionId=qid,
                    selectedOptionIds=sel_json
                )
                db.add(ans)

    db.commit()
    db.refresh(db_att)
    return db_att
```

---

## 8. Regression Tests and Compatibility Risks

### Compatibility Risks
1. **Frontend Callers**:
   - In `frontend/src/pages/student/TestDetails.tsx:86`, the code calls `testService.startAttempt(user.id, test.id, queryScheduleId)`. If a student navigated to `TestDetails` from `Tests.tsx`, `queryScheduleId` is `undefined`.
   - **Resolution**: The remediation logic gracefully resolves the student's active assigned schedule when `scheduleId` is omitted, ensuring seamless backwards compatibility with all existing frontend UI flows.
2. **Frontend In-Progress Resumption**:
   - `testService.ts:204` resumes existing in-progress attempts. Having `create_attempt` return the existing in-progress attempt if already created ensures complete alignment between client and server states.

### Regression Test Plan
1. **Preserve Valid Test Starts**:
   - Eligible student starts attempt on published test with active assigned schedule (`HTTP 200 OK`).
   - `test_crit_001_attempts.py` (all 16 tests) must continue to pass without regression.
   - `test_sec_001_questions.py` must continue to pass 100%.
   - `test_sec_002_passwords.py` must continue to pass 100%.
   - `test_all_22_issues.py` and `e2e_test.py` must continue to pass.
2. **New Dedicated Test Suite (`test_crit_002_schedule_auth.py`)**:
   - Block unscheduled test attempts when no schedule exists (`403 Forbidden`).
   - Prevent rogue 2099 schedule auto-creation.
   - Block attempts on Draft and Archived tests (`403 Forbidden`).
   - Block attempts with invalid `scheduleId` (`404 Not Found`).
   - Block attempts with mismatched `scheduleId` (`400 Bad Request`).
   - Block student ID spoofing (`403 Forbidden`).
   - Block attempt deletion / overwrites via client-supplied `id`.
   - Ensure existing in-progress attempt is returned upon duplicate start instead of creating orphan rows.
   - Enforce attempt limits when submitted attempts reach `attemptsAllowed` (`400 Bad Request`).

---

## 9. Conclusion

The investigation of **CRIT-02: Exam Schedule Authorization Bypass** is complete. All 7 vulnerabilities have been verified with precise code references and isolated local test executions. The remediation strategy is strictly minimal, robust, and maintains full compatibility with frontend exam flows and prior security fixes (SEC-001, SEC-002, CRIT-01).

**VERDICT: READY TO FIX**
