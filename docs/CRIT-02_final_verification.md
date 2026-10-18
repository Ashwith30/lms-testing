# CRIT-02 Final Independent Verification Report: Exam Schedule Authorization Bypass

**Verification Date:** 2026-10-14  
**Auditor:** Independent AI Security Agent  
**Component:** Attempt Creation & Schedule Authorization (`backend/routers/attempts_router.py`)  
**Verdict:** **CRIT-02 CLOSED**  

---

## 1. Executive Summary

An independent security verification was conducted on the remediation of **CRIT-02: Exam Schedule Authorization Bypass**. The audit inspected the application codebase, Pydantic schemas, routing logic, frontend callers, concurrency controls, and all associated regression suites (`test_crit_002_schedule_auth.py`, `test_crit_001_attempts.py`, `test_sec_001_questions.py`, `test_sec_002_passwords.py`, `backend/test_migration_local.py`, and frontend build).

The audit confirms that all 7 confirmed vulnerabilities under CRIT-02 have been completely eliminated:
1. **Rogue 2099 universal schedules**: 100% removed; verified zero auto-creation.
2. **Draft & unpublished test access**: Strictly blocked (`403 Forbidden`).
3. **Invalid & nonexistent schedule bypass**: Strictly blocked (`404 Not Found`).
4. **Cross-test schedule injection**: Strictly blocked (`400 Bad Request`).
5. **Student ID spoofing**: Strictly blocked (`403 Forbidden`).
6. **Arbitrary attempt deletion & submission reset**: Code completely excised; existing submissions are immutable.
7. **Duplicate in-progress attempts**: In-progress attempts are safely resumed; process-level concurrency is guarded by `attempt_creation_lock`.

---

## 2. In-Depth Technical Verification by Scope Item

### 1. Elimination of Universal Schedule Auto-Creation
- **Inspection**: [`backend/routers/attempts_router.py`](file:///Users/akruthika/Documents/p-testing/backend/routers/attempts_router.py) lines 50–120.
- **Evidence**:
  - Grep searches for `models.Schedule(` and `"2099-12-31T23:59:59Z"` in `attempts_router.py` return **0 matches**.
  - The entire block that previously auto-created a 100-year universal schedule when `scheduleId` was missing has been permanently excised.
  - Automated test step `[2/24]` verified via direct database inspection that requesting an unscheduled test creates **no** schedule records in the database.

### 2. Mandatory Published Test, Schedule Match, Assignment, and Time Window
- **Inspection**: [`backend/routers/attempts_router.py:75-175`](file:///Users/akruthika/Documents/p-testing/backend/routers/attempts_router.py#L75-L175).
- **Evidence**:
  - **Test Existence & Publishing**:
    ```python
    test = db.query(models.Test).filter(models.Test.id == req.testId).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found.")
    if current_user.role == "student" and (test.status or "").lower() != "published":
        raise HTTPException(status_code=403, detail="Test is not published.")
    ```
    Verified: Draft tests (`test-draft-c2`) and Archived tests (`test-archived-c2`) return `403 Forbidden ("Test is not published.")`.
  - **Schedule-Test Binding**:
    ```python
    if sched.testId != test.id:
        raise HTTPException(status_code=400, detail="Schedule does not belong to the specified test.")
    ```
    Verified: Supplying a schedule from Test A when attempting Test B returns `400 Bad Request ("Schedule does not belong to the specified test.")`.
  - **Time Window Verification**:
    ```python
    if now < sched.startTime:
        raise HTTPException(status_code=400, detail="Scheduled test has not started yet.")
    if now > sched.endTime:
        raise HTTPException(status_code=400, detail="Scheduled test has already ended.")
    ```
    Verified: Future schedules (`2090`) and expired schedules (`2020`) return `400 Bad Request`.
  - **Batch & Student Assignment**:
    ```python
    if assigned_batch and str(assigned_batch).strip().lower() != "all":
        if not current_user.batch or current_user.batch.strip().lower() != str(assigned_batch).strip().lower():
            is_assigned = False
    if assigned_students and len(assigned_students) > 0 and "all" not in assigned_students:
        if current_user.id not in assigned_students:
            is_assigned = False
    if not is_assigned:
        raise HTTPException(status_code=403, detail="Student is not assigned to this scheduled test session.")
    ```
    Verified: Students in Batch-Beta attempting Batch-Alpha tests return `403 Forbidden`. Students not listed in individual student assignments return `403 Forbidden`.

### 3. Missing and Invalid Schedule IDs Cannot Bypass Authorization
- **Inspection**: [`backend/routers/attempts_router.py:88-140`](file:///Users/akruthika/Documents/p-testing/backend/routers/attempts_router.py#L88-L140).
- **Evidence**:
  - **Invalid Schedule ID**:
    ```python
    sched = db.query(models.Schedule).filter(models.Schedule.id == req.scheduleId).first()
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found.")
    ```
    Unlike the old implementation where `if sched:` silently bypassed validation when `sched` was `None`, nonexistent IDs now raise `HTTP 404 Not Found`.
  - **Missing / Omitted Schedule ID**:
    When `req.scheduleId` is omitted (`None`), lines 100–130 filter all active schedules assigned to the student. If 0 active schedules match, it raises `HTTP 403 Forbidden ("This test is not currently scheduled.")`. If multiple active schedules match, it raises `HTTP 400 Bad Request ("Multiple active schedules found for this test; please specify scheduleId.")`. If exactly 1 matches, it safely resolves to that schedule.

### 4. Client-Supplied Identity, Attempt IDs, and Tampering Fields
- **Inspection**: [`backend/schemas.py:334-348`](file:///Users/akruthika/Documents/p-testing/backend/schemas.py#L334-L348) and [`backend/routers/attempts_router.py:53-73`](file:///Users/akruthika/Documents/p-testing/backend/routers/attempts_router.py#L53-L73).
- **Evidence**:
  - `AttemptCreateRequest` is configured with `ConfigDict(extra="forbid")`. Arbitrary unknown fields return `HTTP 422 Unprocessable Entity`.
  - Client-controlled fields (`id`, `status`, `score`, `percentage`, `violations`, `violationLogs`, `proctoringSummary`) are intercepted and rejected with `HTTP 400 Bad Request`.
  - **Student ID Spoofing**:
    ```python
    if current_user.role == "student":
        if req.studentId and req.studentId != current_user.id:
            raise HTTPException(status_code=403, detail="Cannot create attempt for another student.")
        st_id = current_user.id
    ```
    Verified: Attempting to supply another student's ID returns `403 Forbidden`.
  - **No Attempt Deletion**: Lines 119–124 (`db.delete(existing_att)`) were completely removed. Passing an existing attempt ID is rejected with `400 Bad Request`, and existing attempts in the database remain intact.

### 5. In-Progress Resumption vs Completed Attempt Immutability
- **Inspection**: [`backend/routers/attempts_router.py:150-185`](file:///Users/akruthika/Documents/p-testing/backend/routers/attempts_router.py#L150-L185).
- **Evidence**:
  - **In-Progress Resumption**:
    ```python
    in_prog = db.query(models.Attempt).filter(
        models.Attempt.studentId == st_id,
        models.Attempt.scheduleId == schedule_id,
        models.Attempt.status == "in_progress"
    ).first()
    if in_prog:
        return in_prog
    ```
    Verified: If a student reconnects or calls `POST /api/attempts` with an active attempt in progress, the backend returns the existing attempt (idempotent, no duplicates).
  - **Completed Attempt Protection**:
    Once an attempt is submitted (`submitted`, `auto_submitted`, `completed`), `in_prog` is `None`. The count of completed attempts is evaluated against `sched.attemptsAllowed`. If the limit is reached, it returns `HTTP 400 Bad Request ("Maximum allowed attempts reached for this test.")`.

### 6. Concurrency Safety & Multi-Worker Risk Assessment
- **Inspection**: [`backend/routers/attempts_router.py:8, 142-205`](file:///Users/akruthika/Documents/p-testing/backend/routers/attempts_router.py#L8).
- **Evidence**:
  - `attempt_creation_lock = threading.Lock()` wraps the check for `in_progress` attempts, completed count verification, and the insertion of `db_att`.
  - **Concurrency Test Execution**: Tested with 5 simultaneous OS threads using `concurrent.futures.ThreadPoolExecutor(max_workers=5)`. All 5 threads returned `HTTP 200` with the **identical attempt ID**, and exactly 1 attempt row was created in the database.
  - **Multi-Worker / Multi-Instance Analysis**:
    `attempt_creation_lock` is **process-local** (lives in the memory of the Python process).
    - In the current single-process deployment (`exec uvicorn main:app` without `--workers` in `render.yaml`), this lock provides serialization against concurrent requests.
    - **Deployment Note**: If the deployment scales horizontally to multiple containers or runs with multiple Uvicorn worker processes (`--workers > 1`), concurrent requests hitting separate workers simultaneously could theoretically bypass process-local locks. For multi-node deployments, adding a database-level partial unique index (`CREATE UNIQUE INDEX uq_att_in_prog ON attempts (studentId, scheduleId) WHERE status = 'in_progress';`) or PostgreSQL advisory lock is recommended.

### 7. Staff Preview Privileges Separation
- **Inspection**: [`backend/routers/attempts_router.py:65-85`](file:///Users/akruthika/Documents/p-testing/backend/routers/attempts_router.py#L65-L85).
- **Evidence**:
  - All preview exemptions are wrapped in `if current_user.role != "student":` or check `if current_user.role == "student": ... raise 403`.
  - A student user (`role == "student"`) can never trigger staff preview behavior. Tests `[12/24]` and `[15/24]` confirm that student requests on draft tests or specifying other student IDs fail with `403 Forbidden`. Test `[24/24]` confirms that trainers can preview draft tests and delegate `studentId` without error.

### 8. Frontend Workflow Compatibility
- **Inspection**: [`frontend/src/services/testService.ts:212-225`](file:///Users/akruthika/Documents/p-testing/frontend/src/services/testService.ts#L212-L225), [`TestDetails.tsx:86-88`](file:///Users/akruthika/Documents/p-testing/frontend/src/pages/student/TestDetails.tsx#L86-L88), [`TestAttempt.tsx:240`](file:///Users/akruthika/Documents/p-testing/frontend/src/pages/student/TestAttempt.tsx#L240).
- **Evidence**:
  - `testService.startAttempt` payload was updated to omit deprecated fields (`violations: 0`, `status: "in_progress"`), sending only `{ testId, scheduleId, answers }`.
  - `TestDetails.tsx` and `TestAttempt.tsx` resolve `schedule?.id` and pass it to `startAttempt`.
  - `npm run build` compiled cleanly (`tsc -b && vite build` built in 782ms with 0 errors).

### 9. Genuine Test Execution (No Mocking of Authorization Guards)
- **Inspection**: `test_crit_002_schedule_auth.py`.
- **Evidence**:
  - Connects to an actual SQLite database file using SQLAlchemy ORM.
  - Runs a live Uvicorn HTTP server in a background thread over TCP port 8896.
  - Transmits real HTTP requests using `requests` with signed JWT bearer tokens.
  - Validates real database side-effects (row creation, attempt statuses, answer associations).

### 10. Prior Security Fixes Remain Intact
- **CRIT-01** (Score & Violation Immutability): `test_crit_001_attempts.py` passed all 16 tests.
- **SEC-001** (Question Sanitization & Anti-Leakage): `test_sec_001_questions.py` passed all 17 assertion steps.
- **SEC-002** (Password Encryption & Migration): `test_sec_002_passwords.py` passed all 20 assertion steps.
- **Local Migration Audit**: `backend/test_migration_local.py` passed all 3 scenarios.

---

## 3. Test Reconciliation and Accounting

During the implementation report, a total count of **73 tests** was reported. Here is the exact reconciliation of test cases, assertions, scenarios, and build checks based on actual test-run outputs:

### 1. Breakdown by Test Suite and Actual Outputs

| Suite / Check | File Path | Reported in Table | Actual Output Metric | Output Detail |
| :--- | :--- | :---: | :---: | :--- |
| **CRIT-02 Suite** | `test_crit_002_schedule_auth.py` | 24 | **24** | 24 numbered test assertions (`[1/24]` to `[24/24]`) |
| **CRIT-01 Suite** | `test_crit_001_attempts.py` | 16 | **16** | 16 numbered test assertions (`[1/16]` to `[16/16]`) |
| **SEC-001 Suite** | `test_sec_001_questions.py` | 14 | **17** | 17 individual `[PASSED]` verification steps |
| **SEC-002 Suite** | `test_sec_002_passwords.py` | 15 | **20** | 20 individual `[PASSED]` verification steps |
| **Migration Suite**| `backend/test_migration_local.py` | 3 | **3** (13 sub-tests) | 3 high-level scenarios containing 13 distinct passed assertions |
| **Frontend Build** | `npm run build` | 1 | **1** | Production TypeScript type-check and Vite build |

### 2. Explanation of the "73 vs 72" Discrepancy
- The listed counts in the implementation report table were:
  - CRIT-02: 24
  - CRIT-01: 16
  - SEC-001: 14 (coarse-grained group count)
  - SEC-002: 15 (coarse-grained group count)
  - Migration Local: 3 (high-level scenarios)
  - **Sum of test suites alone**: $24 + 16 + 14 + 15 + 3 = \mathbf{72}$.
- The author of the implementation report added **+1** for the **Frontend Build (`npm run build`)** to reach the reported total:
  $$72 \text{ (test suites)} + 1 \text{ (frontend build check)} = \mathbf{73 \text{ total checks}}.$$
- When measured by **distinct assertion steps executed and confirmed**:
  $$24 \text{ (CRIT-02)} + 16 \text{ (CRIT-01)} + 17 \text{ (SEC-001)} + 20 \text{ (SEC-002)} + 13 \text{ (Migration checks)} = \mathbf{90 \text{ automated test assertions passed}}.$$

In all calculations, **0 tests failed and 0 tests were skipped**.

---

## 4. Remaining Risks and Production Recommendations

1. **Multi-Instance Concurrency (Low / Moderate Risk in Cluster Environments)**:
   - `attempt_creation_lock` is process-local. It provides concurrency protection in the default Render configuration (`exec uvicorn main:app` single process).
   - If scaled horizontally to multiple worker processes or containers, a student firing simultaneous requests across different processes could theoretically create duplicate attempts.
   - **Recommendation**: In a future migration, add a partial unique index in PostgreSQL:
     ```sql
     CREATE UNIQUE INDEX IF NOT EXISTS uq_attempts_in_progress
     ON attempts ("studentId", "scheduleId")
     WHERE status = 'in_progress';
     ```
2. **Third-Party API Integrations**:
   - Any external scripts or automation tools calling `POST /api/attempts` must omit `status`, `violations`, `score`, and `id` to comply with the `extra="forbid"` schema.

---

## 5. Verification Conclusion

The code changes are verified, targeted, robust, and clean. All vulnerability reproduction scripts confirmed that the flaws are completely resolved. Legitimate student workflows, resumption contracts, and staff preview capabilities operate correctly. All prior security and migration test suites pass with 100% integrity.

**FINAL VERDICT: CRIT-02 CLOSED**
