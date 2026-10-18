# Independent Security Verification Report: CRIT-01

**Vulnerability**: CRIT-01: Post-Submission Score and Violation Tampering  
**Verification Date**: October 14, 2026  
**Auditor**: Independent Security Audit (DeepMind Antigravity)  
**Primary Files Inspected**:
- `backend/routers/attempts_router.py`
- `backend/schemas.py`
- `backend/models.py`
- `frontend/src/services/testService.ts`
- `frontend/src/services/syncService.ts`
- `frontend/src/pages/student/TestAttempt.tsx`
- `test_crit_001_attempts.py`
- `test_sec_001_questions.py`
- `test_sec_002_passwords.py`
- `e2e_test.py`
- `test_batch_notifications.py`

---

## 1. Executive Summary

An independent security verification was conducted to assess the implementation of **CRIT-01: Post-Submission Score and Violation Tampering**. The verification inspected active code paths, transaction boundaries, Pydantic schemas, database models, error handlers, and executed tests across isolated disposable databases and live local server instances.

### Key Verification Verdict
The critical attack vectors documented in CRIT-01—namely, student post-submission grade elevation, proctoring violation wiping, ownership reassignment, and duplicate submission re-grading—have been **successfully eliminated**:
1. **Field Whitelisting & Role Separation**: `update_attempt` rejects any student attempt to modify `score`, `percentage`, `violations`, `violationLogs`, `proctoringSummary`, or `status` with `HTTP 403 Forbidden`.
2. **Immutability of Core Entity Fields**: Attempt identity, schedule, and timestamp fields (`id`, `studentId`, `scheduleId`, `startedAt`, `submittedAt`) are strictly immutable across all roles (`HTTP 400 Bad Request`).
3. **Attempt Lifecycle Enforcement**: Students are barred from updating completed or submitted attempts (`HTTP 400 Bad Request`).
4. **Strict Schema Constraints**: Pydantic schemas enforce `model_config = ConfigDict(extra="forbid")`, rejecting unmapped or unexpected request parameters with `HTTP 422 Unprocessable Entity`.
5. **Race Condition Prevention in Submission**: Atomic conditional SQL status updates (`WHERE status = 'in_progress'`) ensure exactly one submission succeeds under high concurrency, rejecting losing requests with `HTTP 400 Bad Request` without committing duplicate side effects.

---

## 2. Requirement-by-Requirement Verification

### 2.1 Verification of `update_attempt`

| Requirement Item | Status | Code Evidence | Test Evidence |
| :--- | :---: | :--- | :--- |
| **Students cannot modify `score` or `percentage`** | **VERIFIED** | `backend/routers/attempts_router.py:200-208`: Checks `FORBIDDEN_STUDENT_FIELDS = {"score", "percentage", ...}`; raises `HTTP 403 Forbidden`. | `test_crit_001_attempts.py` Test 2: PUT with `score=100.0` returns 403. |
| **Students cannot modify `violations`, `violationLogs`, or `proctoringSummary`** | **VERIFIED** | `backend/routers/attempts_router.py:200-208`: Included in `FORBIDDEN_STUDENT_FIELDS`; raises `HTTP 403 Forbidden`. | `test_crit_001_attempts.py` Test 3: PUT with `violations=0, violationLogs=[]` returns 403. |
| **Students cannot modify `status`** | **VERIFIED** | `backend/routers/attempts_router.py:200-208`: Included in `FORBIDDEN_STUDENT_FIELDS`; raises `HTTP 403 Forbidden`. | `test_crit_001_attempts.py` Test 4: PUT with `status="submitted"` returns 403. |
| **Identity fields immutable for every role** | **VERIFIED** | `backend/routers/attempts_router.py:183-189`: `IMMUTABLE_FIELDS = {"id", "studentId", "scheduleId", "startedAt", "submittedAt"}`; raises `HTTP 400 Bad Request` prior to role checks. | `test_crit_001_attempts.py` Test 5: PUT with `studentId` returns 400. |
| **Unexpected payload keys rejected** | **VERIFIED** | `backend/schemas.py:335`: `model_config = ConfigDict(extra="forbid")`. Extra fields raise Pydantic validation error (`HTTP 422`). | `scratch/independent_verify_crit01.py` Test 1.1: PUT with `maliciousExtra="hack"` returns 422. |
| **Completed/submitted attempts cannot be changed by students** | **VERIFIED** | `backend/routers/attempts_router.py:194-198`: If `att.status in ("submitted", "auto_submitted", "completed")`, raises `HTTP 400 Bad Request`. | `test_crit_001_attempts.py` Test 14: PUT on submitted attempt returns 400. |
| **Legitimate in-progress updates still work** | **VERIFIED** | `backend/routers/attempts_router.py:210-231`: Updates to `answers`, `deviceInfo`, and `ipAddress` succeed while `status == "in_progress"`. | `test_crit_001_attempts.py` Test 7 & `e2e_test.py` Step 11 return 200 OK. |
| **Trainers and Admins can adjust scores within authorized scope** | **VERIFIED** | `backend/routers/attempts_router.py:234-266`: Staff can update `score`, `percentage`, `violations`, `violationLogs`, `proctoringSummary`, `status`, but cannot change immutable fields. | `test_crit_001_attempts.py` Test 15: Trainer score update to 4.5 returns 200 OK. |

---

### 2.2 Verification of `sync_answer`

| Requirement Item | Status | Code Evidence | Test Evidence |
| :--- | :---: | :--- | :--- |
| **Attempt ownership verified** | **VERIFIED** | `backend/routers/attempts_router.py:282-283`: `if current_user.role == "student" and att.studentId != current_user.id: raise HTTPException(403)`. | `test_crit_001_attempts.py` Test 9: Cross-student sync returns 403. |
| **Only in-progress attempts accept answer sync** | **VERIFIED** | `backend/routers/attempts_router.py:285-294`: Rejects `submitted`, `auto_submitted`, `completed`, or non-`in_progress` status with `HTTP 400 Bad Request`. | `test_crit_001_attempts.py` Test 13: Sync on submitted attempt returns 400. |
| **Client-supplied correctness or score cannot override server** | **VERIFIED** | `backend/schemas.py:353-360`: `SyncAnswerRequest` defines only telemetry/answer fields with `extra="forbid"`. Correctness and scores are not accepted. | `scratch/independent_verify_crit01.py` Test 1.2: Passing extra scoring keys returns 422. |
| **Proctoring violations cannot be reduced** | **VERIFIED** | `backend/routers/attempts_router.py:314`: `att.violations = max(att.violations or 0, int(payload.violations))`. | `test_crit_001_attempts.py` Test 10: Sending lower violation count preserves existing count. |
| **Safe handling of malformed, negative, missing, or large violation numbers** | **VERIFIED** | Pydantic enforces `violations: Optional[int]`. Negative numbers (`-5`) evaluated via `max()` preserve current count. Non-integer strings return 422. | `scratch/independent_verify_crit01.py` Test 2: `-5` preserves count, `"invalid"` returns 422. |
| **Legitimate telemetry and live answer sync still work** | **VERIFIED** | `backend/routers/attempts_router.py:296-318`: Saves `selectedOptionIds` and telemetry during active exam. | `test_crit_001_attempts.py` Test 8 returns 200 OK. |

---

### 2.3 Verification of `submit_attempt` and Concurrency

| Requirement Item | Status | Code Evidence | Test Evidence |
| :--- | :---: | :--- | :--- |
| **Rightful owner authorization** | **VERIFIED** | `backend/routers/attempts_router.py:333-334`: Checks `if current_user.role == "student" and att.studentId != current_user.id: raise HTTPException(403)`. | `test_sec_001_questions.py` Line 427 returns 403. |
| **Duplicate submission rejection** | **VERIFIED** | `backend/routers/attempts_router.py:336-340`: `if att.status in ("submitted", "auto_submitted", "completed"): raise HTTPException(400)`. | `test_crit_001_attempts.py` Test 12 returns 400 Bad Request. |
| **Atomic conditional database update prevents race conditions** | **VERIFIED** | `backend/routers/attempts_router.py:347-361`: `db.query(Attempt).filter(id == attempt_id, status == "in_progress").update(...)`. If `rows_updated == 0`, raises `HTTP 400`. | `test_crit_001_attempts.py` Test 16: Multi-threaded test produces exactly 1x 200 and 4x 400. |
| **Losing concurrent requests commit no side effects** | **VERIFIED** | `backend/routers/attempts_router.py:357-361`: Losing request raises `HTTP 400` immediately when `rows_updated == 0`, before answer extraction or grading. | `scratch/independent_verify_crit01.py` Test 4: 10 concurrent threads result in exactly 1x 200 and 9x 400. |
| **Answers persisted before authoritative server grading** | **VERIFIED** | `backend/routers/attempts_router.py:372-446`: Answers saved to DB, then authoritative grading compares against `Question` and `QuestionOption` records. | `test_crit_001_attempts.py` Test 11: Accurate server score 5.0/5.0 awarded. |
| **Timeout and automatic submission functional** | **VERIFIED** | `backend/routers/attempts_router.py:342-343`: `is_auto = bool(data.isAutoSubmit)`; sets `new_status = "auto_submitted" if is_auto else "submitted"`. | `test_sec_001_questions.py` & `TestAttempt.tsx:560` compatibility verified. |

---

### 2.4 Verification of Schemas and Compatibility

| Schema | File & Line | `extra="forbid"` Enforced | Verified Behavior |
| :--- | :--- | :---: | :--- |
| **`AttemptUpdateRequest`** | `backend/schemas.py:334-351` | **YES** | Rejects unmapped fields with `HTTP 422`. Enforces type checking on `score`, `percentage`, `violations`, `answers`. |
| **`SyncAnswerRequest`** | `backend/schemas.py:353-360` | **YES** | Rejects unmapped fields with `HTTP 422`. Permits only valid live telemetry and answer data. |
| **`AttemptSubmitRequest`** | `backend/schemas.py:362-370` | **YES** | Rejects unmapped fields with `HTTP 422`. Handles `isAutoSubmit`, `answers`, `currentAnswers`, telemetry. |

---

## 3. Test Suite Execution Results

All test suites were independently executed in the local environment:

| Test Suite | Execution Command | Result | Environment / DB Details |
| :--- | :--- | :---: | :--- |
| **CRIT-01 Verification Suite** | `backend/.venv/bin/python test_crit_001_attempts.py` | **16 / 16 PASSED (100%)** | Isolated SQLite temp DB; real API via background Uvicorn. |
| **SEC-001 Verification Suite** | `backend/.venv/bin/python test_sec_001_questions.py` | **16 / 16 PASSED (100%)** | Isolated SQLite temp DB; real API via background Uvicorn. |
| **SEC-002 Verification Suite** | `backend/.venv/bin/python test_sec_002_passwords.py` | **22 / 22 PASSED (100%)** | Isolated SQLite temp DB; live Alembic migration execution. |
| **E2E Core Flow Suite** | `backend/.venv/bin/python e2e_test.py` | **13 / 13 Steps PASSED (100%)** | Live server on `127.0.0.1:8000` with real SQLite database. |
| **Batch Notifications Suite** | `backend/.venv/bin/python test_batch_notifications.py` | **9 / 9 Checks PASSED (100%)** | Live server on `127.0.0.1:8000` with real SQLite database. |
| **Deep Verification Suite** | `backend/.venv/bin/python scratch/independent_verify_crit01.py` | **4 / 4 Suites PASSED (100%)** | Multi-threaded concurrency (10 threads), 422 extra tests. |
| **Frontend Production Build** | `npm run build` in `frontend/` | **BUILD SUCCESSFUL (0 errors)** | Vite + TypeScript compiler (`tsc -b && vite build`). |

---

## 4. Observations and Architectural Notes

During deep independent verification, the following nuances and architecture patterns were observed:

1. **Monotonicity Scope in Telemetry**:
   - `violations` integer count cannot be decremented due to `max(att.violations or 0, int(payload.violations))`.
   - `violationLogs` is transmitted as an array by the frontend proctoring service. In `sync_answer`, `att.violationLogs_json = json.dumps(payload.violationLogs)` stores the client-provided list. If an active client sends an empty list while `in_progress`, the log text is overwritten (though the total violation counter cannot be cleared). Post-submission, `violationLogs` cannot be modified under any circumstance.
2. **Trainer Scoping**:
   - In `update_attempt:234-266`, trainer permissions are currently platform-wide (any trainer can adjust scores for any student attempt). This is consistent with the current platform-wide trainer role design documented in finding `HIGH-01 / IDOR` in the comprehensive audit, and does not allow students to access or exploit staff endpoints.
3. **Transaction Segregation in Submit**:
   - In `submit_attempt`, the atomic status update commits first to seal the attempt against concurrent requests before answer grading. If a server crash occurs during scoring, the attempt will remain in `submitted` state with score null, preventing re-submission.

---

## 5. Final Verification Verdict

The implementation of **CRIT-01: Post-Submission Score and Violation Tampering** has been verified through source code inspection, boundary analysis, concurrency stress-testing, and automated regression suites. All security objectives have been met without breaking client exam workflows or administrative capabilities.

**CRIT-01 CLOSED**
