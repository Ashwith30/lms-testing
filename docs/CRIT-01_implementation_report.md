# CRIT-01 Implementation Report: Post-Submission Score and Violation Tampering

**Status**: IMPLEMENTED — READY FOR INDEPENDENT VERIFICATION  
**Target Vulnerability**: CRIT-01 (Post-Submission Score and Violation Tampering)  
**Implementation Date**: October 14, 2026  
**Files Modified**:
- `backend/schemas.py`
- `backend/routers/attempts_router.py`
- `test_crit_001_attempts.py` (New Automated Test Suite)

---

## 1. Executive Summary

CRIT-01 addressed a critical vulnerability where students could submit unvalidated `PUT /api/attempts/{id}` requests to overwrite their own scores (`score`, `percentage`), zero out proctoring violations (`violations`, `violationLogs`, `proctoringSummary`), reassign attempt ownership (`studentId`, `scheduleId`), and mutate lifecycle status (`status`) on both active and completed exams.

The vulnerability has been completely resolved:
1. **Validated Request Schemas**: Untyped dictionary inputs have been replaced with strict Pydantic schemas (`AttemptUpdateRequest`, `SyncAnswerRequest`, `AttemptSubmitRequest`) with `extra="forbid"`.
2. **Strict Field Whitelisting & Role Separation**:
   - Students can only update genuine client-managed fields (`answers`, `deviceInfo`, `ipAddress`) during an active exam.
   - Any student attempt to set `score`, `percentage`, `violations`, `violationLogs`, `proctoringSummary`, or `status` is rejected with `HTTP 403 Forbidden`.
   - Identity, schedule, and timestamp fields (`id`, `studentId`, `scheduleId`, `startedAt`, `submittedAt`) are immutable for all roles (rejected with `HTTP 400 Bad Request`).
   - Staff (trainers/admins) are authorized to adjust scores, percentages, and review violations for manual grading and false-positive resolution without altering attempt ownership.
3. **State Transition & Lifecycle Enforcement**:
   - `update_attempt`: Students are strictly forbidden from modifying completed or submitted attempts (`HTTP 400 Bad Request`).
   - `sync_answer`: Requires the attempt to be strictly `in_progress`. Post-submission synchronization is rejected (`HTTP 400 Bad Request`), and violation counts are monotonic.
   - `submit_attempt`: Rejects repeated submissions on already submitted attempts (`HTTP 400 Bad Request`). Concurrency is handled via atomic status transitions at the database layer.

---

## 2. Files Changed and Rationale

### 2.1 `backend/schemas.py`
- **Imported `ConfigDict`**: Enables strict schema validation in Pydantic v2.
- **Added `AttemptUpdateRequest`**:
  - Implements `model_config = ConfigDict(extra="forbid")` to reject unmapped parameters.
  - Defines allowable in-progress fields (`answers`, `deviceInfo`, `ipAddress`).
  - Defines staff-only override fields (`score`, `percentage`, `violations`, `violationLogs`, `proctoringSummary`, `status`).
  - Defines immutable fields (`id`, `studentId`, `scheduleId`, `startedAt`, `submittedAt`) so they can be explicitly checked and rejected rather than silently discarded or dynamically set.
- **Added `SyncAnswerRequest`**:
  - Validates `questionId`, `selectedOption`, `status`, `violations`, `violationLogs`, and `proctoringSummary`.
  - Disallows any client injection of correctness or server-managed scoring fields.
- **Added `AttemptSubmitRequest`**:
  - Validates `isAutoSubmit`, `answers`, `currentAnswers`, `violations`, `violationLogs`, and `proctoringSummary`.

### 2.2 `backend/routers/attempts_router.py`
- **Updated `update_attempt` (`PUT /api/attempts/{attempt_id}`)**:
  - Replaced untyped `updates: dict` with `req: schemas.AttemptUpdateRequest`.
  - Enforced student ownership: returns `HTTP 403 Access denied` if `current_user.role == "student"` and `att.studentId != current_user.id`.
  - Enforced immutability: returns `HTTP 400 Bad Request` if `id`, `studentId`, `scheduleId`, `startedAt`, or `submittedAt` are present in `req.model_fields_set`.
  - Enforced lifecycle guard: returns `HTTP 400 Bad Request` if a student attempts to update an attempt with `status in ("submitted", "auto_submitted", "completed")`.
  - Enforced field allowlists: returns `HTTP 403 Forbidden` if a student attempts to modify `score`, `percentage`, `violations`, `violationLogs`, `proctoringSummary`, or `status`.
  - Removed dynamic `hasattr(att, k)` and `setattr` reflection. Explicitly assigns allowed attributes.
- **Updated `sync_answer` (`POST /api/attempts/{attempt_id}/sync-answer`)**:
  - Replaced untyped `payload: dict` with `payload: schemas.SyncAnswerRequest`.
  - Enforced ownership and lifecycle state: rejects requests if `att.status != "in_progress"` or `att.status in ("submitted", "auto_submitted", "completed")` with `HTTP 400 Bad Request`.
  - Enforced violation counter monotonicity: updates `att.violations = max(att.violations or 0, int(payload.violations))`, preventing cheating students from decrementing violation counts.
- **Updated `submit_attempt` (`POST /api/attempts/{attempt_id}/submit`)**:
  - Replaced untyped `data: dict` with `data: schemas.AttemptSubmitRequest`.
  - Enforced completion state check: returns `HTTP 400 Bad Request` if `att.status in ("submitted", "auto_submitted", "completed")`.
  - Implemented atomic conditional update: `db.query(models.Attempt).filter(id == attempt_id, status == "in_progress").update(...)`.
  - Safe against race conditions and concurrent requests: exactly one concurrent request succeeds; all others receive `HTTP 400 Bad Request`.
  - Strictly derives score, percentage, and answer correctness on the server against database `Question` and `QuestionOption` records.

### 2.3 `test_crit_001_attempts.py` (New Automated Test Suite)
- Comprehensive automated verification suite containing 16 distinct test cases spanning attempt updates, answer synchronization, submission lifecycle, concurrency, and staff workflows.

---

## 3. Authorization and State-Transition Rules

### 3.1 State Machine Enforcement

```
              ┌────────────────────────────────────────────────────────┐
              │                                                        │
              ▼                                                        │
     [ in_progress ] ──────────────► [ submitted ]                     │ Staff Manual
              │                             │                          │ Review / Score
              │                             ▼                          │ Adjustment
              └────────────────► [ auto_submitted ]                    │
                                            │                          │
                                            ▼                          │
                                      [ completed ] ───────────────────┘
```

1. **State Invariance for Students**:
   - Transition from `in_progress` to `submitted` (or `auto_submitted`) is **one-way**.
   - Once submitted, students cannot transition the attempt back to `in_progress`.
   - Students cannot call `update_attempt`, `sync_answer`, or `submit_attempt` on a submitted attempt.
2. **Identity & Ownership Immutability**:
   - `id`, `studentId`, `scheduleId`, `startedAt`, and `submittedAt` are immutable through API updates across all roles.
3. **Scoring Exclusivity**:
   - Only the server can compute `score` and `percentage` based on registered test questions.
   - Clients cannot supply `score` or `percentage` during active exam taking or submission.
   - Only authorized staff (`trainer`, `admin`) can modify scores on completed attempts.
4. **Proctoring Counter Monotonicity**:
   - During an active exam, `violations` may only increase. Client payloads cannot decrement or clear `violations`.

---

## 4. Tests Executed and Actual Results

All tests were executed against the active codebase:

### 4.1 Dedicated CRIT-01 Test Suite (`test_crit_001_attempts.py`)
Executed via: `backend/.venv/bin/python test_crit_001_attempts.py`

| Test Case | Description | Expected Status | Actual Result | Status |
| :--- | :--- | :---: | :---: | :---: |
| **Test 1** | In-progress attempt creation | 200 OK | 200 OK | **PASSED** |
| **Test 2** | Student score/percentage tampering | 403 Forbidden | 403 Forbidden | **PASSED** |
| **Test 3** | Student violation count/log tampering | 403 Forbidden | 403 Forbidden | **PASSED** |
| **Test 4** | Student status tampering via PUT | 403 Forbidden | 403 Forbidden | **PASSED** |
| **Test 5** | Student ownership (`studentId`) tampering | 400 Bad Request | 400 Bad Request | **PASSED** |
| **Test 6** | Cross-student attempt update | 403 Forbidden | 403 Forbidden | **PASSED** |
| **Test 7** | In-progress valid updates (`answers`, `deviceInfo`, `ipAddress`) | 200 OK | 200 OK | **PASSED** |
| **Test 8** | In-progress answer & proctoring telemetry sync | 200 OK | 200 OK | **PASSED** |
| **Test 9** | Cross-student answer sync | 403 Forbidden | 403 Forbidden | **PASSED** |
| **Test 10** | Monotonic violation count (cannot reduce via sync) | Preserve count | 2 preserved (not 0) | **PASSED** |
| **Test 11** | First valid submission with server scoring (5.0/5.0) | 200 OK | 200 OK (Score 5.0) | **PASSED** |
| **Test 12** | Repeated submission rejected without re-grading | 400 Bad Request | 400 Bad Request | **PASSED** |
| **Test 13** | Answer sync on submitted attempt rejected | 400 Bad Request | 400 Bad Request | **PASSED** |
| **Test 14** | Attempt update on submitted attempt rejected | 400 Bad Request | 400 Bad Request | **PASSED** |
| **Test 15** | Authorized trainer manual score/violation adjustment | 200 OK | 200 OK (Score 4.5) | **PASSED** |
| **Test 16** | Concurrent submission race condition safety | 1 OK, 4 Rejected | 1x 200, 4x 400 | **PASSED** |

**Summary**: **16 / 16 PASSED (100%)**

---

### 4.2 SEC-001 Regression Test Suite (`test_sec_001_questions.py`)
Executed via: `backend/.venv/bin/python test_sec_001_questions.py`
- Question API sanitization: **PASSED**
- Test-level authorization & schedule eligibility: **PASSED**
- Active exam response sanitization: **PASSED**
- Server-side graded review flow: **PASSED**
- **Summary**: **ALL TESTS PASSED (100%)**

---

### 4.3 SEC-002 Password Security & Migration Test Suite (`test_sec_002_passwords.py`)
Executed via: `backend/.venv/bin/python test_sec_002_passwords.py`
- Bcrypt verification and invalid format handling: **PASSED**
- Safe Alembic migration 0002 idempotency: **PASSED**
- End-to-end authentication: **PASSED**
- **Summary**: **ALL TESTS PASSED (100%)**

---

### 4.4 End-to-End Core Flows Test Suite (`e2e_test.py`)
Executed via: `backend/.venv/bin/python e2e_test.py`
- Admin login, Trainer registration & login, Student registration & login: **PASSED**
- Question bank & question creation: **PASSED**
- Test creation & scheduling: **PASSED**
- Student attempt start: **PASSED**
- Student submitting answer via `PUT /api/attempts/{id}` while in-progress: **PASSED**
- Student completing attempt via `POST /api/attempts/{id}/submit`: **PASSED**
- **Summary**: `[OK] All E2E Core Flows passed successfully!`

---

### 4.5 Batch Notifications Test Suite (`test_batch_notifications.py`)
Executed via: `backend/.venv/bin/python test_batch_notifications.py`
- Admin & student authentication, notification dispatch & filtering: **PASSED**
- **Summary**: `ALL BATCH NOTIFICATION TESTS PASSED SUCCESSFULLY! 🎉`

---

### 4.6 Frontend Production Build Verification
Executed via: `npm run build` in `frontend/`
- `tsc -b && vite build` compiled client bundle with 0 errors.

---

## 5. Tests Skipped or Unavailable

- No tests were skipped. All 16 CRIT-01 verification tests, SEC-001 regression tests, SEC-002 regression tests, E2E core flow tests, and frontend production builds executed completely and passed.

---

## 6. Compatibility and Operational Considerations

1. **Frontend Callers**:
   - `frontend/src/pages/student/TestAttempt.tsx` uses `sync-answer` for live answer and proctoring telemetry, and `submit` for final submission. Both continue to operate seamlessly within their validated schemas.
2. **Test Callers (`e2e_test.py`)**:
   - `e2e_test.py` sends `answers` via `PUT /api/attempts/{id}` during `in_progress` status. This workflow is explicitly preserved in the student allowlist.
3. **Staff Review**:
   - Trainers and admins can legitimately adjust scores, percentages, and review violations for manual grading and false-positive handling on submitted attempts.
4. **Data Integrity**:
   - Client-side manipulation of `score`, `percentage`, `violations`, `violationLogs`, `proctoringSummary`, `status`, `studentId`, and `scheduleId` is completely eliminated.

---

## 7. Conclusion

Vulnerability **CRIT-01: Post-Submission Score and Violation Tampering** is fully mitigated, verified through automated unit, integration, concurrency, and end-to-end tests without breaking legitimate client or administrative workflows.

**Final Verdict**: **IMPLEMENTED — READY FOR INDEPENDENT VERIFICATION**
