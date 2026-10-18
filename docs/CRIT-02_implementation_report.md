# CRIT-02 Implementation Report: Exam Schedule Authorization Bypass

**Status**: IMPLEMENTED & TESTED  
**Verdict**: **FIX VERIFIED**  
**Target Vulnerability**: CRIT-02 (Exam Schedule Authorization Bypass)  
**Implementation Date**: October 14, 2026  
**Files Modified**:
- `backend/schemas.py`
- `backend/routers/attempts_router.py`
- `frontend/src/services/testService.ts`
- `frontend/src/pages/student/TestDetails.tsx`
- `frontend/src/pages/student/TestAttempt.tsx`
- `test_crit_002_schedule_auth.py` (New Automated Verification Test Suite)

---

## 1. Executive Summary

CRIT-02 identified critical flaws in attempt creation (`POST /api/attempts`) that allowed students to bypass exam scheduling, time windows, batch restrictions, draft test protections, and attempt limits. Furthermore, the endpoint permitted client-supplied attempt IDs that deleted existing attempts from the database (breaking CRIT-01 lifecycle immutability) and client-supplied `studentId` values that forged attempt ownership.

All confirmed vulnerabilities have been resolved:
1. **Validated Request Schema**: Introduced `AttemptCreateRequest` in `backend/schemas.py` with `extra="forbid"`, rejecting client-controlled tampering fields (`id`, `status`, `score`, `percentage`, `violations`, `violationLogs`, `proctoringSummary`) and arbitrary unknown payload properties.
2. **Elimination of Rogue Schedule Auto-Creation**: Completely removed code that generated 100-year universal schedules ending in `2099-12-31T23:59:59Z`.
3. **Mandatory Published Test Enforcement**: Enforced `(test.status or "").lower() == "published"` for student exam starts, strictly blocking draft and archived tests.
4. **Strict Schedule Validation & Cross-Test Isolation**: Mandated that every student attempt is bound to an active, assigned schedule matching the requested test (`sched.testId == test.id`). Invalid or nonexistent schedule IDs return `404 Not Found`, and mismatched cross-test schedules return `400 Bad Request`.
5. **Unambiguous Schedule Resolution**: When `scheduleId` is omitted, the backend safely resolves a schedule only if exactly one active, assigned schedule exists for that student and test. If none exists, it returns `403 Forbidden`; if multiple exist, it returns `400 Bad Request`.
6. **Identity Immutability**: For students, attempt ownership (`studentId`) is derived exclusively from `current_user.id`. Client attempts to specify another student's ID are rejected with `403 Forbidden`.
7. **Attempt Integrity & Lifecycle Protection**: Completely deleted attempt deletion logic (`db.delete(existing_att)`). Existing attempts can never be overwritten, reset, or deleted via the creation endpoint. Attempt IDs are exclusively server-generated.
8. **In-Progress Resumption & Limit Enforcement**: If an authorized student already has an `in_progress` attempt for the schedule, the endpoint idempotently returns that attempt to resume the session. Attempt limits (`attemptsAllowed`) are enforced strictly against completed (`submitted`, `auto_submitted`, `completed`) attempts.
9. **Concurrency Safety**: Implemented `attempt_creation_lock` to serialize attempt initialization and prevent duplicate concurrent `in_progress` attempts under high-frequency race conditions.

---

## 2. Files Changed and Technical Details

### 1. `backend/schemas.py`
- Added `AttemptCreateRequest(BaseModel)` with `model_config = ConfigDict(extra="forbid")`.
- Accepts: `testId: str`, `scheduleId: Optional[str]`, `studentId: Optional[str]`, `answers: Optional[Dict[str, Any]]`, `startedAt: Optional[str]`.
- Declared forbidden client-controlled fields (`id`, `status`, `score`, `percentage`, `violations`, `violationLogs`, `proctoringSummary`) so any client attempting to tamper with them is intercepted and rejected with `400 Bad Request`.
- Unknown extra fields are automatically rejected by Pydantic with `422 Unprocessable Entity`.

### 2. `backend/routers/attempts_router.py`
- Updated `create_attempt` endpoint signature to accept `req: schemas.AttemptCreateRequest`.
- Added module-level `attempt_creation_lock = threading.Lock()` for atomic attempt reservation.
- **Identity Enforcement**:
  ```python
  if current_user.role == "student":
      if req.studentId and req.studentId != current_user.id:
          raise HTTPException(status_code=403, detail="Cannot create attempt for another student.")
      st_id = current_user.id
  else:
      st_id = req.studentId or current_user.id
  ```
- **Test Publishing Gate**:
  ```python
  test = db.query(models.Test).filter(models.Test.id == req.testId).first()
  if not test:
      raise HTTPException(status_code=404, detail="Test not found.")
  if current_user.role == "student" and (test.status or "").lower() != "published":
      raise HTTPException(status_code=403, detail="Test is not published.")
  ```
- **Schedule Resolution & Validation**:
  - Removed lines 61–81 (auto-creation of 2099 schedules).
  - Validates `req.scheduleId` exists in `schedules` and verifies `sched.testId == test.id`.
  - When omitted, resolves single active assigned schedule for the student, or rejects with `403` / `400`.
- **Student Schedule Window & Assignment Checks**:
  - Validates `now >= sched.startTime` and `now <= sched.endTime`.
  - Validates batch assignment and individual student assignments.
- **Resumption & Duplicate Prevention**:
  - Returns existing `in_prog` attempt if one already exists for `(st_id, schedule_id)`.
  - Enforces `submitted_count < sched.attemptsAllowed`.
- **Permanent Removal of Attempt Deletion**:
  - Completely excised lines 119–124 (`existing_att = ... db.delete(existing_att)`).
  - New attempts always receive server-generated UUIDs (`models.generate_uuid("att-")`).

### 3. `frontend/src/services/testService.ts`
- Cleaned `testService.startAttempt` payload: removed forbidden client-controlled fields (`violations: 0`, `status: 'in_progress'`, `studentId`, `startedAt`, `expiresAt`).
- Payload now cleanly sends `{ testId, scheduleId, answers }`.

### 4. `frontend/src/pages/student/TestDetails.tsx` & `TestAttempt.tsx`
- Updated both components to pass the resolved schedule ID (`schedule?.id || queryScheduleId`) to `testService.startAttempt` and propagate it into attempt URLs.

---

## 3. Vulnerabilities Fixed

| Vulnerability ID | Description | Mechanism Fixed | Status |
| :--- | :--- | :--- | :--- |
| **CRIT-02-A** | 2099 Universal Schedule Auto-Creation | Removed dynamic schedule creation code in `create_attempt`. | **RESOLVED** |
| **CRIT-02-B** | Draft / Unpublished Test Access | Enforced `test.status == "Published"` check for student attempts. | **RESOLVED** |
| **CRIT-02-C** | Invalid / Nonexistent `scheduleId` Bypass | Replaced `if sched:` with strict existence check (`404`) and test binding check (`400`). | **RESOLVED** |
| **CRIT-02-D** | Cross-Test Schedule Injection | Added explicit check: `if sched.testId != test.id: raise HTTPException(400)`. | **RESOLVED** |
| **CRIT-02-E** | Student ID Spoofing / Attempt Forgery | Derived `studentId` strictly from `current_user.id` for students; rejected mismatches with `403`. | **RESOLVED** |
| **CRIT-02-F** | Arbitrary Attempt Deletion / State Reset | Removed attempt deletion code; forbade client `id`; generated UUIDs server-side. | **RESOLVED** |
| **CRIT-02-G** | Duplicate In-Progress Attempts & Missing Resume | Implemented session resumption and process-level threading lock for atomic creation. | **RESOLVED** |
| **CRIT-02-H** | Attempt Limit Bypass | Tallied all completed attempts (`submitted`, `auto_submitted`, `completed`) against `attemptsAllowed`. | **RESOLVED** |

---

## 4. Test Execution and Pass/Fail Summary

All tests were executed against an isolated temporary database with zero test skips and 100% pass rates.

### 1. Dedicated CRIT-02 Test Suite (`test_crit_002_schedule_auth.py`)
```
==================================================================
RUNNING COMPREHENSIVE CRIT-02 VERIFICATION TEST SUITE
==================================================================

--- SECTION 1: Schedule Authorization & Validation ---
  [1/24] Unscheduled test attempt correctly rejected (403 Forbidden)
  [2/24] Verified NO rogue 2099 schedule was auto-created in database
  [3/24] Unambiguous active schedule successfully resolved when scheduleId omitted (200 OK)
  [4/24] Multiple active schedules correctly require explicit scheduleId (400 Bad Request)
  [5/24] Nonexistent scheduleId correctly rejected (404 Not Found)
  [6/24] Cross-test schedule injection strictly blocked (400 Bad Request)
  [7/24] Future test session correctly rejected (400 Bad Request)
  [8/24] Expired test session correctly rejected (400 Bad Request)

--- SECTION 2: Batch and Student Assignment Gates ---
  [9/24] Unassigned batch attempt strictly blocked (403 Forbidden)
  [10/24] Unassigned individual student attempt strictly blocked (403 Forbidden)
  [11/24] Assigned individual student attempt successfully started (200 OK)

--- SECTION 3: Test Status & Eligibility Restrictions ---
  [12/24] Draft test attempt strictly blocked for students (403 Forbidden)
  [13/24] Archived test attempt strictly blocked for students (403 Forbidden)
  [14/24] Nonexistent testId correctly rejected (404 Not Found)

--- SECTION 4: Identity & Attempt Lifecycle Protection ---
  [15/24] Student ID spoofing strictly blocked (403 Forbidden)
  [16/24] Client-supplied attempt ID strictly rejected (400 Bad Request)
  [17/24] Client-controlled grading and lifecycle fields rejected (400 Bad Request)
  [18/24] Arbitrary unknown fields strictly rejected by Pydantic extra='forbid' (422)
  [19/24] Existing submitted attempts and answers are completely immutable against deletion/reset

--- SECTION 5: In-Progress Resumption, Concurrency & Limits ---
  [20/24] Existing in-progress attempt successfully returned for resumption (200 OK)
  [21/24] Concurrency tested: 5 simultaneous requests produced exactly 1 attempt ID (No duplicates)
  [22/24] Attempt limit strictly enforced when attemptsAllowed=1 (400 Bad Request)
  [23/24] Multi-attempt retry workflow correctly permits 2nd attempt and blocks 3rd attempt (200 -> 200 -> 400)

--- SECTION 6: Authorized Staff Workflows ---
  [24/24] Staff preview of Draft test with student delegation succeeded (200 OK)

==================================================================
ALL 24/24 CRIT-02 VERIFICATION TESTS PASSED SUCCESSFULLY!
==================================================================
```
- **Passed**: 24
- **Failed**: 0
- **Skipped**: 0

---

### 2. Regression Suites Executed

| Test Suite | Focus Area | Executed Tests | Passed | Failed | Skipped | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `test_crit_001_attempts.py` | Score & violation immutability, submission concurrency, role restrictions | 16 | 16 | 0 | 0 | **PASSED** |
| `test_sec_001_questions.py` | Question leakage protection, student authorization, review endpoints | 14 | 14 | 0 | 0 | **PASSED** |
| `test_sec_002_passwords.py` | Bcrypt hashing, plaintext rejection, migration idempotency, login rate limits | 15 | 15 | 0 | 0 | **PASSED** |
| `backend/test_migration_local.py`| Alembic migration scenarios, user creation, auth lifecycle | 3 | 3 | 0 | 0 | **PASSED** |
| Frontend Build (`npm run build`) | TypeScript type check & Vite production bundle compilation | 1 | 1 | 0 | 0 | **PASSED** |

**Total Verification Tests**: **73 / 73 PASSED (100%)**

---

## 5. Compatibility Review

- **Frontend Flow Compatibility**:
  - `TestDetails.tsx` and `TestAttempt.tsx` reliably provide the resolved schedule ID to `testService.startAttempt`.
  - When `scheduleId` is omitted, the backend's automatic resolution of the student's unique active assigned schedule ensures full backward compatibility with any direct navigations or legacy links.
- **Frontend Resume Contract**:
  - Returning the existing in-progress attempt from `create_attempt` matches the client-side resumption contract in `testService.ts:204`, guaranteeing idempotent behavior if a student refreshes during an exam.
- **Staff Workflow Preservation**:
  - Authorized staff (`admin`, `trainer`, `institution`) can preview unpublished draft tests and specify target `studentId` values without being blocked by student-specific batch or publishing constraints.

---

## 6. Remaining Risks & Limitations

- **Multi-Instance PostgreSQL Concurrency**:
  - In a single-instance environment, `attempt_creation_lock` provides serialization against race conditions. For multi-replica deployments behind load balancers, database-level partial unique indexes on `(studentId, scheduleId) WHERE status = 'in_progress'` provide additional hardening against cross-node concurrency.
- **Client Migration**:
  - Any external third-party API clients that were passing client-controlled parameters like `status: "in_progress"` or `violations: 0` in `POST /api/attempts` must omit those fields to comply with `extra="forbid"` and the strict field whitelist.

---

## 7. Conclusion

The remediation of **CRIT-02: Exam Schedule Authorization Bypass** is complete, fully verified, and preserves all existing exam integrity, security, and lifecycle guarantees.

**FINAL VERDICT: FIX VERIFIED**
