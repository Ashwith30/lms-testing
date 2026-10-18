# CRIT-01 Investigation Report: Post-Submission Score and Violation Tampering

**Status**: READY TO FIX  
**Vulnerability Identifier**: CRIT-01  
**Target File**: `backend/routers/attempts_router.py`  
**Related Files**: `backend/models.py`, `backend/schemas.py`, `frontend/src/services/testService.ts`, `frontend/src/services/syncService.ts`, `frontend/src/pages/student/TestAttempt.tsx`, `e2e_test.py`, `test_all_22_issues.py`  
**Classification**: Confirmed Critical Vulnerability  

---

## 1. Executive Summary

An in-depth investigation was performed on vulnerability **CRIT-01: Post-Submission Score and Violation Tampering** across backend attempt routes, data models, serialization schemas, frontend callers, and automated test scripts.

The vulnerability has been **mechanically and definitively confirmed** via controlled test execution against the active code:
1. **Unbounded Model Attribute Mutation**: `PUT /api/attempts/{attempt_id}` accepts an untyped dictionary payload (`updates: dict`). The backend iterates over all input keys and calls `setattr(att, k, v)` for any key matching an attribute on the SQLAlchemy `Attempt` model (`hasattr(att, k)`).
2. **Post-Submission Modification Allowed**: The endpoint lacks any lifecycle state guard. An attempt in `submitted` or `auto_submitted` status can be modified without restriction.
3. **Arbitrary Grade & Proctoring Forgery**: A student can issue a `PUT /api/attempts/{attempt_id}` request at any time during or after an exam with `{"score": 100.0, "percentage": 100.0, "violations": 0, "violationLogs": []}`. The backend overwrites the trusted server-graded evaluation and erases all proctoring audit trails.
4. **Ownership and State Spoofing**: Students can alter `studentId` (reassigning the attempt to another user) and `status` (reverting a submitted attempt back to `in_progress`).
5. **Coupled Submission & Sync Flaws**: `POST /api/attempts/{attempt_id}/sync-answer` and `POST /api/attempts/{attempt_id}/submit` also lack state checks, permitting students to sync answers or re-submit already completed exams to trigger repeated re-grading.

---

## 2. Confirmed Vulnerable Code Paths & Evidence

### 2.1 Endpoint Implementation in `backend/routers/attempts_router.py:167-208`

```python
@router.put("/{attempt_id}")
def update_attempt(
    attempt_id: str,
    updates: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    att = db.query(models.Attempt).filter(models.Attempt.id == attempt_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if current_user.role == "student" and att.studentId != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    for k, v in updates.items():
        if k == "answers" and isinstance(v, dict):
            for qid, ans_data in v.items():
                ans = db.query(models.Answer).filter(
                    models.Answer.attemptId == attempt_id,
                    models.Answer.questionId == qid
                ).first()
                if not ans:
                    ans = models.Answer(
                        id=models.generate_uuid("ans-"),
                        attemptId=attempt_id,
                        questionId=qid
                    )
                    db.add(ans)
                opt = ans_data.get("selectedOption") if isinstance(ans_data, dict) else ans_data
                if opt is not None:
                    ans.selectedOptionIds = json.dumps([opt] if isinstance(opt, str) else opt)
        elif k == "violations":
            att.violations = int(v)
        elif k == "violationLogs":
            att.violationLogs_json = json.dumps(v)
        elif k == "proctoringSummary":
            att.proctoringSummary_json = json.dumps(v)
        elif hasattr(att, k):
            setattr(att, k, v)
            
    db.commit()
    db.refresh(att)
    return {"message": "Updated", "attempt": att}
```

### 2.2 Trace of Request Flow
1. **Entry**: Client sends HTTP `PUT /api/attempts/{attempt_id}`.
2. **Schema Validation**: FastAPI binds payload to `updates: dict` without schema validation, field whitelisting, or type sanitization.
3. **Authentication**: `current_user` is resolved from the Bearer JWT.
4. **Attempt Lookup**: The attempt record is retrieved from the database.
5. **Ownership Check**:
   - If `current_user.role == "student"`, it only verifies `att.studentId == current_user.id`.
   - If the student owns the attempt, execution proceeds.
   - If `current_user.role in ("trainer", "admin")`, no ownership check is performed.
6. **State Check**: **None**. Whether `att.status` is `"in_progress"`, `"submitted"`, or `"auto_submitted"`, all updates are processed.
7. **Attribute Mutation**:
   - `k == "violations"`: sets `att.violations = int(v)`.
   - `k == "violationLogs"`: sets `att.violationLogs_json = json.dumps(v)`.
   - `k == "proctoringSummary"`: sets `att.proctoringSummary_json = json.dumps(v)`.
   - `hasattr(att, k)`: dynamically calls `setattr(att, k, v)` on the SQLAlchemy model instance.
8. **Persistence**: `db.commit()` commits the modified record to the database.

### 2.3 Controlled Verification Results
A controlled execution of `update_attempt` in an isolated test environment confirmed the following:
- **Initial DB State**: `status="submitted"`, `score=15.0`, `percentage=30.0`, `violations=12`, `violationLogs=[{'type': 'tab_switch'}]`.
- **Payload Applied**: `{"score": 100.0, "percentage": 100.0, "violations": 0, "violationLogs": [], "status": "submitted"}`.
- **Resulting DB State**:
  - `att.score` updated to `100.0`
  - `att.percentage` updated to `100.0`
  - `att.violations` updated to `0`
  - `att.violationLogs` updated to `[]`
- **Reversion of State**: Sending `{"status": "in_progress"}` successfully reverted the submitted attempt to in-progress status.
- **Ownership Tampering**: Sending `{"studentId": "stu_002"}` re-assigned the attempt from Student 1 to Student 2.

---

## 3. Modifiability Matrix by Role

| Field / Attribute | Model Type | Modifiable by Student? | Modifiable by Trainer / Admin? | Impact / Security Risk |
| :--- | :--- | :---: | :---: | :--- |
| **`score`** | `Float` | **YES (VULNERABLE)** | **YES** | Student can award themselves maximum marks, bypassing server grading completely. |
| **`percentage`** | `Float` | **YES (VULNERABLE)** | **YES** | Inconsistent with total marks; student can forge high percentiles. |
| **`violations`** | `Integer` | **YES (VULNERABLE)** | **YES** | Student can reset violation counter to 0, hiding cheating behavior. |
| **`violationLogs`** | `JSON / Text` | **YES (VULNERABLE)** | **YES** | Student can erase webcam snapshots, tab-switch logs, and face detection alerts. |
| **`proctoringSummary`** | `JSON / Text` | **YES (VULNERABLE)** | **YES** | Student can reset trust score to 100 and zero out violation breakdown. |
| **`status`** | `String(50)` | **YES (VULNERABLE)** | **YES** | Student can transition back to `in_progress` or mark unsubmitted exams as completed. |
| **`answers`** | `dict` | **YES** | **YES** | Student can rewrite answers post-exam without triggering server re-grading. |
| **`studentId`** | `ForeignKey` | **YES (VULNERABLE)** | **YES** | Student can reassign attempt ownership to another student. |
| **`scheduleId`** | `ForeignKey` | **YES (VULNERABLE)** | **YES** | Student can link attempt to a different schedule or bypass assignment restrictions. |
| **`startedAt`** | `String(64)` | **YES (VULNERABLE)** | **YES** | Student can manipulate start time to simulate a shorter or longer exam duration. |
| **`submittedAt`** | `String(64)` | **YES (VULNERABLE)** | **YES** | Student can modify submission timestamp. |
| **`deviceInfo`** | `Text` | **YES** | **YES** | Client hardware/browser telemetry. |
| **`ipAddress`** | `String(100)` | **YES** | **YES** | Network client IP. |
| **`testId`** | `@property` | **NO** | **NO** | Read-only model property (`AttributeError` raised if set). |

---

## 4. Legitimate Purpose of Endpoint Callers

An exhaustive search across the entire project identified all current and intended callers:

### 4.1 Frontend Callers
1. **`frontend/src/services/testService.ts:230`**:
   ```typescript
   updateAttempt: async (attemptId: string, updates: Partial<Attempt>) => {
     await api.put(`/attempts/${attemptId}`, updates);
   }
   ```
   - **Usage in UI**: Not directly invoked by any page or component in `frontend/src/pages/`.
   - **Active Exam Telemetry**: `TestAttempt.tsx` uses `syncService` (`POST /api/attempts/{id}/sync-answer`) for live answer saving and proctoring telemetry.
   - **Active Exam Submission**: `TestAttempt.tsx` uses `testService.submitAttempt` (`POST /api/attempts/{id}/submit`) for final completion.
   - **Conclusion**: The frontend relies on `sync-answer` and `submit` rather than `updateAttempt`.

### 4.2 Test Suite Callers
1. **`e2e_test.py:164`**:
   - **Code**: `res = requests.put(f"{BASE_URL}/attempts/{attempt_id}", json=ans_data, headers=student_headers)`
   - **Purpose**: Simulates an in-progress answer submission before calling `POST /submit`.
   - **Requirement**: Must continue to allow updating answers while the attempt is strictly `in_progress`.
2. **`test_all_22_issues.py:153`**:
   - **Code**: `requests.put(f"{BASE_URL}/attempts/{att_id}", json={"violations": 99}, headers=student2_headers)`
   - **Purpose**: Verifies that Student 2 receives `HTTP 403 Access denied` when attempting to access Student 1's attempt (Issue #8).
   - **Requirement**: Cross-student access rejection must remain strictly enforced.

### 4.3 Legitimate Staff (Trainer / Admin) Requirements
- In production LMS environments, trainers and administrators occasionally need to manually adjust scores (e.g. grading subjective/essay responses) or clear false-positive proctoring flags.
- However, students must **NEVER** have access to these capabilities.
- Furthermore, immutable structural fields (`id`, `studentId`, `scheduleId`) must be protected from accidental or malicious modification by any role.

---

## 5. Required Authorization and State-Transition Rules

### 5.1 Attempt Lifecycle State Machine

```
              ┌────────────────────────────────────────────────┐
              │                                                │
              ▼                                                │
     [ in_progress ] ──────────────► [ submitted ]             │ (Trainer/Admin Re-evaluation)
              │                             │                  │
              │                             ▼                  │
              └────────────────► [ auto_submitted ]            │
                                            │                  │
                                            ▼                  │
                                      [ completed ] ───────────┘
```

### 5.2 Transition Enforcement Rules

1. **Rule 1 (Completion Immutability for Students)**:
   - Once an attempt has transitioned to `submitted`, `auto_submitted`, or `completed`, a student is **strictly prohibited** from performing any update, sync, or re-submission.
   - Calling `PUT /api/attempts/{id}`, `POST /api/attempts/{id}/sync-answer`, or `POST /api/attempts/{id}/submit` on a completed attempt must return `HTTP 400 Bad Request` with an explicit message: `"Attempt has already been submitted and cannot be modified."`
2. **Rule 2 (Server-Authoritative Scoring)**:
   - `score` and `percentage` can **only** be calculated server-side during `submit_attempt` based on trusted `Question` and `QuestionOption` records.
   - Students cannot supply `score` or `percentage` on any endpoint under any circumstance.
3. **Rule 3 (Proctoring Counter Monotonicity)**:
   - During an active exam, `violations` may only increase monotonically. Students cannot send payloads that decrement or clear `violations`.
   - `violationLogs` may only be appended to; historical entries cannot be deleted by students.
4. **Rule 4 (Ownership & Identity Immutability)**:
   - `id`, `studentId`, and `scheduleId` are immutable. Neither students nor trainers may alter the identity or schedule binding of an attempt after creation.
5. **Rule 5 (Staff Overrides Scoped to Admin/Trainer)**:
   - Only users with `role in ("admin", "trainer")` may modify scores, percentages, or status on submitted attempts.

---

## 6. Recommended Minimal Fix

The fix requires targeted changes in `backend/routers/attempts_router.py` and `backend/schemas.py`:

### Step 1: Define Explicit Schema in `backend/schemas.py`
Replace arbitrary `updates: dict` with a dedicated Pydantic model:

```python
class AttemptUpdateRequest(BaseModel):
    answers: Optional[Dict[str, Any]] = None
    deviceInfo: Optional[str] = None
    ipAddress: Optional[str] = None
    # Staff-only override fields
    score: Optional[float] = None
    percentage: Optional[float] = None
    violations: Optional[int] = None
    violationLogs: Optional[List[Any]] = None
    proctoringSummary: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
```

### Step 2: Enforce State Guard and Role Whitelist in `update_attempt`
In `backend/routers/attempts_router.py`:

```python
@router.put("/{attempt_id}")
def update_attempt(
    attempt_id: str,
    req: schemas.AttemptUpdateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    att = db.query(models.Attempt).filter(models.Attempt.id == attempt_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attempt not found")
        
    if current_user.role == "student":
        if att.studentId != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        if att.status in ("submitted", "auto_submitted", "completed"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Attempt has already been submitted and cannot be modified."
            )
            
        # Student allowed updates: answers, client metadata
        if req.answers and isinstance(req.answers, dict):
            for qid, ans_data in req.answers.items():
                ans = db.query(models.Answer).filter(
                    models.Answer.attemptId == attempt_id,
                    models.Answer.questionId == qid
                ).first()
                if not ans:
                    ans = models.Answer(
                        id=models.generate_uuid("ans-"),
                        attemptId=attempt_id,
                        questionId=qid
                    )
                    db.add(ans)
                opt = ans_data.get("selectedOption") if isinstance(ans_data, dict) else ans_data
                if opt is not None:
                    ans.selectedOptionIds = json.dumps([opt] if isinstance(opt, str) else opt)
                    
        if req.deviceInfo is not None:
            att.deviceInfo = req.deviceInfo
        if req.ipAddress is not None:
            att.ipAddress = req.ipAddress
            
    else:
        # Trainer / Admin updates (e.g. manual score adjustment, status override)
        if req.score is not None:
            att.score = req.score
        if req.percentage is not None:
            att.percentage = req.percentage
        if req.violations is not None:
            att.violations = req.violations
        if req.violationLogs is not None:
            att.violationLogs_json = json.dumps(req.violationLogs)
        if req.proctoringSummary is not None:
            att.proctoringSummary_json = json.dumps(req.proctoringSummary)
        if req.status is not None:
            att.status = req.status
            
    db.commit()
    db.refresh(att)
    return {"message": "Updated", "attempt": att}
```

### Step 3: Guard `sync_answer` and `submit_attempt` Against Stale State
Add identical lifecycle guards to prevent post-submission tampering via alternate routes:

- **In `sync_answer`**:
  ```python
  if current_user.role == "student" and att.status in ("submitted", "auto_submitted", "completed"):
      raise HTTPException(
          status_code=status.HTTP_400_BAD_REQUEST,
          detail="Cannot sync answers for a submitted attempt."
      )
  ```
- **In `submit_attempt`**:
  ```python
  if att.status in ("submitted", "auto_submitted", "completed"):
      raise HTTPException(
          status_code=status.HTTP_400_BAD_REQUEST,
          detail="Attempt has already been submitted."
      )
  ```

---

## 7. Tests Needed to Prove the Fix and Prevent Regressions

The following automated regression test cases must be added:

1. **`test_student_cannot_update_submitted_attempt`**:
   - Create a submitted attempt (`status="submitted"`).
   - As the owning student, call `PUT /api/attempts/{id}` with any payload.
   - Assert response is `HTTP 400 Bad Request`.
2. **`test_student_cannot_tamper_score_or_percentage`**:
   - Create an in-progress attempt.
   - As the owning student, call `PUT /api/attempts/{id}` with `{"score": 100.0, "percentage": 100.0}`.
   - Assert that `att.score` and `att.percentage` in the database remain unchanged (`None` or 0).
3. **`test_student_cannot_clear_violations`**:
   - Create an in-progress attempt with `violations=5`.
   - As the owning student, attempt to set `violations=0` or `violationLogs=[]`.
   - Assert violations are not cleared.
4. **`test_student_cannot_modify_attempt_ownership`**:
   - As Student 1, call `PUT /api/attempts/{id}` with `{"studentId": "student_2_id"}`.
   - Assert `att.studentId` in the database remains `student_1_id`.
5. **`test_student_cannot_sync_answers_on_submitted_attempt`**:
   - Call `POST /api/attempts/{id}/sync-answer` on a submitted attempt.
   - Assert response is `HTTP 400 Bad Request`.
6. **`test_student_cannot_resubmit_attempt`**:
   - Submit an attempt via `POST /api/attempts/{id}/submit`.
   - Attempt to call `POST /api/attempts/{id}/submit` a second time with modified answers.
   - Assert response is `HTTP 400 Bad Request`.
7. **`test_in_progress_answer_update_succeeds`**:
   - Call `PUT /api/attempts/{id}` with `{"answers": {...}}` while `in_progress`.
   - Assert response is `HTTP 200 OK` and answers are saved.
8. **`test_trainer_can_adjust_submitted_attempt_score`**:
   - As trainer/admin, call `PUT /api/attempts/{id}` with `{"score": 85.0, "percentage": 85.0}`.
   - Assert response is `HTTP 200 OK` and score is updated.

---

## 8. Conclusion and Verdict

The investigation into CRIT-01 is complete. The vulnerability mechanics have been fully mapped, mechanically verified, and confirmed to affect `update_attempt`, `sync_answer`, and `submit_attempt`. A clean, minimal remediation strategy has been established that protects exam integrity while preserving all legitimate frontend, test suite, and administrative workflows.

**Final Verdict**: **READY TO FIX**
