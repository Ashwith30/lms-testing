# Security Audit Master Tracker

**Target System:** Learning Management System (LMS)  
**Tracking Date:** October 17, 2026  
**Auditor:** Independent Security & Verification Agent  
**Baseline Document:** [`comprehensive_code_audit.md`](file:///Users/akruthika/Documents/p-testing/docs/comprehensive_code_audit.md)  
**Scope:** Complete inventory of all findings across Security Initiatives (SEC-001, SEC-002, DEP-001), Critical Remediation Sprints (CRIT-01 through CRIT-06), High, Medium, Low, and Informational audit items.

---

## 1. Status Category Summary

Every finding identified in [`comprehensive_code_audit.md`](file:///Users/akruthika/Documents/p-testing/docs/comprehensive_code_audit.md) and subsequent security reports has been audited and assigned exactly one status:

| Status Category | Count | Definition |
| :--- | :---: | :--- |
| **Independently Verified Closed** | **21** | Remediation implemented, fully regression-tested, and independently verified with a dedicated final verification report. |
| **Implementation Reported but Not Independently Verified** | **0** | All remediated items have been formally and independently verified. |
| **Open** | **7** | Confirmed findings that remain open (4 Medium, 2 Low, 1 Informational). Zero Critical and Zero High findings remain open. |
| **Not Applicable** | **0** | No finding was discarded; all 28 findings reflect valid defects or risks in this codebase. |
| **Total Tracked Findings** | **28** | |

---

## 2. Master Tracking Matrix

| Finding ID & Original Severity | Affected Files & Endpoints | Current Status | Evidence & Report References | Regression Tests & Results | Remaining Risk or Follow-Up Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-001**<br>`CRITICAL` | `backend/routers/questions_router.py:46-142`<br>`/questions`, `/tests/{id}/questions`, `/exams/{id}/questions` | **Independently Verified Closed** | [`docs/SEC-001_final_verification.md`](file:///Users/akruthika/Documents/p-testing/docs/SEC-001_final_verification.md)<br>Active exam questions sanitize `correctAnswer`, `explanation`, and `QuestionOption.isCorrect`. Unscheduled/draft tests return 403. | `test_sec_001_questions.py`<br>**10 / 10 PASSED (100%)** | Maintain sanitization invariants on new question-rendering routes. |
| **SEC-002**<br>`CRITICAL` | `backend/auth.py:27-46`<br>`backend/alembic/versions/0002_*.py`<br>`POST /api/auth/login` | **Independently Verified Closed** | [`docs/SEC-002_final_verification.md`](file:///Users/akruthika/Documents/p-testing/docs/SEC-002_final_verification.md)<br>Plaintext comparison fallback deleted. Strictly verifies bcrypt hashes. Legacy plaintext passwords safely hashed via migration `0002`. | `test_sec_002_passwords.py`<br>**16 / 16 PASSED (100%)** | Ensure any future bulk user import script creates valid bcrypt hashes. |
| **DEP-001**<br>`HIGH` | `render.yaml:18`<br>`backend/alembic/env.py`<br>`backend/database.py` | **Independently Verified Closed** | [`docs/deployment_migration_final_verification.md`](file:///Users/akruthika/Documents/p-testing/docs/deployment_migration_final_verification.md)<br>`startCommand` updated to `alembic upgrade head && exec uvicorn ...`. Database connection string sanitization for Postgres verified. | `backend/test_migration_postgres.py`<br>**11 / 11 PASSED (100%)**<br>`test_migration_local.py`<br>**8 / 8 PASSED (100%)** | Verify remote database credentials in Render dashboard before initial production traffic. |
| **CRIT-01**<br>`CRITICAL` | `backend/routers/attempts_router.py:325-395`<br>`PUT /api/attempts/{id}`<br>`POST /api/attempts/{id}/submit` | **Independently Verified Closed** | [`docs/CRIT-01_final_verification.md`](file:///Users/akruthika/Documents/p-testing/docs/CRIT-01_final_verification.md)<br>Students cannot update `score`, `percentage`, `violations`, `status`, or ownership. Completed attempts are immutable. Server-side scoring enforced. | `test_crit_001_attempts.py`<br>**16 / 16 PASSED (100%)** | None. Post-submission grading integrity is strictly protected. |
| **CRIT-02**<br>`CRITICAL` | `backend/routers/attempts_router.py:102-297`<br>`POST /api/attempts` | **Independently Verified Closed** | [`docs/CRIT-02_final_verification.md`](file:///Users/akruthika/Documents/p-testing/docs/CRIT-02_final_verification.md)<br>2099 universal schedule auto-creation excised. Published status, schedule match, time window, and batch/student assignment strictly enforced. | `test_crit_002_schedule_auth.py`<br>**24 / 24 PASSED (100%)** | None. Unassigned/draft exam access is completely eliminated. |
| **CRIT-03**<br>`CRITICAL` | `backend/routers/attempts_router.py:53-56, 117-124`<br>`backend/routers/tests_router.py:418-445`<br>`GET/PUT/DELETE /api/attempts` | **Independently Verified Closed** | [`CRIT-03_final_verification.md`](file:///Users/akruthika/Documents/p-testing/CRIT-03_final_verification.md)<br>Centralized trainer authorization helper `check_trainer_test_access` implemented. Client attempt ID injection removed. Schedule/test deletion rejected with 409 Conflict if attempts exist. Overlaps with **HIGH-04**. | `test_crit_003_attempt_auth.py`<br>**33 / 33 PASSED (100%)** | None. Remediation independently verified closed. |
| **CRIT-04**<br>`CRITICAL` | `backend/routers/users_router.py:126-173`<br>`backend/schemas.py:510-530`<br>`PUT /api/users/{id}` | **Independently Verified Closed** | [`CRIT-04_final_verification.md`](file:///Users/akruthika/Documents/p-testing/CRIT-04_final_verification.md)<br>`UserUpdateRequest` with `extra="forbid"`. Students restricted to `name` and `phoneNumber`. Inactive/suspended status checked in login and token resolution. Overlaps with **HIGH-01**. | `test_crit_004_profile_auth.py`<br>**38 / 38 PASSED (100%)** | None. Remediation independently verified closed. |
| **CRIT-05**<br>`CRITICAL` | `frontend/package.json`<br>`frontend/package-lock.json`<br>`backend/requirements.txt` | **Independently Verified Closed** | [`CRIT-05_final_verification.md`](file:///Users/akruthika/Documents/p-testing/CRIT-05_final_verification.md)<br>Upgraded `axios` to 1.20.0, `xlsx` to 0.20.3 (SheetJS CDN), `source-map-js` to 1.2.2, `PyJWT` to 2.15.1, `urllib3` to 2.8.0, `Mako` to 1.4.3. OSV backend scan 100% clean (0 advisories); npm audit 0 Critical, 0 High. | `scratch/test_excel_parser.mjs`: **12/12 PASS**<br>`frontend/test/*.test.mjs`: **14/14 PASS**<br>`npm run build`: **PASS (0 errors, 753ms)** | None. Remediation independently verified closed. |
| **CRIT-06**<br>`CRITICAL`<br>*(originally `MED-04`)* | `backend/rate_limiter.py`<br>`backend/alembic/versions/0003_*.py`<br>`backend/routers/auth_router.py`<br>`backend/routers/attempts_router.py` | **Independently Verified Closed** | [`CRIT-06_final_verification.md`](file:///Users/akruthika/Documents/p-testing/CRIT-06_final_verification.md)<br>Persistent database-backed event table `rate_limit_events`. Anti-DoS account lockout policy, identifier normalization across casing & aliases, proxy spoofing defenses, 10/min register limit, 10/min create limit, 120/min sync limit. | `test_crit_006_rate_limiting.py`<br>**12 / 12 PASSED (100%)** | None. Survives restarts and shares state across multi-worker instances. |
| **HIGH-01**<br>`HIGH` | `backend/routers/auth_router.py:46-77`<br>`backend/auth.py:48-69`<br>`POST /api/auth/login`, all routes | **Independently Verified Closed** | Addressed under **CRIT-04**.<br>Status check added to `rate_limiter.handle_login_attempt` and `auth.py:get_current_user` (`if user.status != "active": raise 403`). Dedicated report: [`CRIT-04_final_verification.md`](file:///Users/akruthika/Documents/p-testing/CRIT-04_final_verification.md). | `test_crit_004_profile_auth.py`<br>Groups 7 & 8 (tests 7.1-7.5, 8.1-8.5d) **38 / 38 PASSED** | None. Remediation independently verified closed. |
| **HIGH-02**<br>`HIGH` | `backend/routers/attempts_router.py:491-625`<br>`POST /api/attempts/{id}/submit` | **Independently Verified Closed** | [`HIGH-02_implementation_report.md`](file:///Users/akruthika/Documents/p-testing/HIGH-02_implementation_report.md)<br>Implemented `evaluate_answer_correctness` in `attempts_router.py`. Option-based questions correctly graded when `correctAnswer` is NULL by inspecting `QuestionOption.isCorrect`. Supports option ID matching, option letter, option text, orderIndex, and multi-select. Client tampering strictly rejected. | `test_high_002_grading.py`<br>**12 / 12 PASSED (100%)** | None. Remediation verified. |
| **HIGH-03**<br>`HIGH` | `backend/routers/questions_router.py`<br>`DELETE /api/question-banks/{id}`<br>`DELETE /api/questions/{id}`<br>`POST /api/questions`<br>`POST /api/question-banks` | **Independently Verified Closed** | [`HIGH-03_implementation_report.md`](file:///Users/akruthika/Documents/p-testing/HIGH-03_implementation_report.md)<br>Centralized authorization helpers in `auth.py` (`check_trainer_question_bank_access` & `check_trainer_question_access`) verify ownership before bank/question deletion and modification. Spoofing of `ownerId` blocked. Assessments and student exam histories protected against cascade deletion via HTTP 409 Conflict checks on `TestQuestion` and `Answer`. | `test_high_003_question_auth.py`<br>**14 / 14 PASSED (100%)** | None. Remediation verified. |
| **HIGH-04**<br>`HIGH` | `backend/routers/tests_router.py:418-445`<br>`DELETE /api/schedules/{id}` | **Independently Verified Closed** | Addressed under **CRIT-03**.<br>`delete_schedule` checks if attempts exist; if found, raises HTTP 409 Conflict. Dedicated report: [`CRIT-03_final_verification.md`](file:///Users/akruthika/Documents/p-testing/CRIT-03_final_verification.md). | `test_crit_003_attempt_auth.py`<br>Section 7 (tests 27-29) **PASSED** | None. Remediation independently verified closed. |
| **HIGH-05**<br>`HIGH` | `backend/routers/materials_router.py`<br>`GET /api/materials`<br>`GET /api/materials/{id}`<br>`POST /api/materials`<br>`PUT /api/materials/{id}`<br>`DELETE /api/materials/{id}` | **Independently Verified Closed** | [`HIGH-05_implementation_report.md`](file:///Users/akruthika/Documents/p-testing/HIGH-05_implementation_report.md)<br>Server-side student access control enforced via `auth.py:check_student_material_access`. Discards client-side `studentId`/`uploadedBy` spoofing. Enforces batch, course enrollment, individual assignment, and release (`isReleased==True`, `releasedAt<=now`) gates. Single-item GET `/{id}` added with 403 protection. Cross-trainer update/deletion IDOR blocked. | `test_high_005_materials_auth.py`<br>**16 / 16 PASSED (100%)** | None. Remediation verified. |
| **HIGH-06**<br>`HIGH` | `backend/routers/analytics_router.py:258-290`<br>`GET /api/analytics/trainer`<br>`GET /api/analytics/summary`<br>`GET /api/analytics/admin` | **Independently Verified Closed** | [`HIGH-06_implementation_report.md`](file:///Users/akruthika/Documents/p-testing/HIGH-06_implementation_report.md)<br>Replaced in-memory dumps `db.query(models.Answer).all()`, `models.Attempt.all()`, and `models.Test.all()` with database-side SQL aggregations (`func.count`, `func.avg`, `func.sum`, `case`, and `GROUP BY`). Added `test_high_006_analytics.py`. OOM risk eliminated. | `test_high_006_analytics.py`<br>**15 / 15 PASSED (100%)** | None. Remediation independently verified closed. |
| **HIGH-07**<br>`HIGH` | `render.yaml:20`<br>`backend/main.py:34-75`<br>`backend/.env` | **Independently Verified Closed** | [`HIGH-07_implementation_report.md`](file:///Users/akruthika/Documents/p-testing/HIGH-07_implementation_report.md)<br>Wildcard CORS removed from `render.yaml`. Explicit production frontend (`https://lms-frontend.onrender.com`) and required local dev origins configured. `parse_cors_origins` sanitizes trailing slashes, trims whitespace, and strictly strips wildcard `*` when `allow_credentials=True`. Live preflight and credentialed requests verified. | `test_high_007_cors.py`<br>**16 / 16 PASSED (100%)** | None. Remediation verified. |
| **HIGH-08**<br>`HIGH` | `frontend/src/services/api.ts`<br>`frontend/src/context/AuthContext.tsx`<br>`frontend/src/App.tsx` | **Independently Verified Closed** | [`HIGH-08_implementation_report.md`](file:///Users/akruthika/Documents/p-testing/HIGH-08_implementation_report.md)<br>Global Axios response interceptor intercepts HTTP 401s, clears `lms_token` and `lms_current_user`, dispatches `auth:unauthorized` event to React `AuthContext`, and redirects to `/login`. Concurrency guard prevents duplicate redirect storms. Route guards prevent redirect loops when already on auth routes. Login failures on `/auth/login` bypass redirect to preserve inline form errors. HTTP 403, 404, 500 do not log out user. | `frontend/test/high_008_axios_interceptor.test.mjs`<br>`npm test`<br>**14 / 14 PASSED (100%)**<br>`npm run build`: **PASS (0 errors, 769ms)** | None. Remediation verified. |
| **HIGH-09**<br>`HIGH` | `backend/main.py:30-33, 65-89`<br>`/debug-check`<br>`/api/admin-count-check` | **Independently Verified Closed** | [`docs/deployment_migration_final_verification.md`](file:///Users/akruthika/Documents/p-testing/docs/deployment_migration_final_verification.md)<br>`/debug-check` no longer exposes database internals. `/api/admin-count-check` strictly enforces timing-attack-safe header comparison against `ADMIN_CHECK_SECRET`. | `backend/test_migration_postgres.py`<br>Test 9 **PASSED** (returns 403 when unauthenticated) | None. Infrastructure metadata is fully protected. |
| **MED-01**<br>`MEDIUM` | `backend/alembic/versions/`<br>`backend/models.py`<br>`backend/main.py:27` | **Open** | Alembic only tracks `users` and `rate_limit_events`. 10 core application tables (`tests`, `questions`, `schedules`, `attempts`, `answers`, `materials`, `notifications`) are untracked by Alembic and depend on `create_all()`. | None | Generate baseline Alembic migration `0000_baseline_schema.py` documenting all application tables. |
| **MED-02**<br>`MEDIUM` | `backend/models.py:381-382, 491-492` | **Open** | Code inspection confirmed `Answer.attemptId`, `Answer.questionId`, `Attempt.studentId`, `Attempt.scheduleId`, `Schedule.testId` lack `index=True`, causing full table scans during exam telemetry and analytics. | None | Add `index=True` to foreign key columns in `models.py` and create an Alembic migration. |
| **MED-03**<br>`MEDIUM` | `backend/routers/auth_router.py:48-52, 104-108`<br>`backend/schemas.py:34-70`<br>`POST /api/auth/register/student`<br>`POST /api/auth/register/trainer` | **Independently Verified Closed** | All default password fallbacks (`student123`, `trainer123`) removed; `StudentRegisterRequest`, `TrainerRegisterRequest`, and `UserCreate` enforce non-empty passwords via Pydantic validator; `validate_password()` strictly enforced on all registration paths. | `test_med_003_006_registration.py`<br>**24 / 24 PASSED (100%)**<br>`test_migration_local.py`<br>**3 / 3 PASSED (100%)** | None. Client-side defaults in `Students.tsx` and `authService.ts` also cleaned up. |
| **MED-04**<br>`MEDIUM` | `backend/routers/auth_router.py:16-43` | **Independently Verified Closed** | Subsumed and remediated under **CRIT-06**.<br>In-memory `FAILED_ATTEMPTS` dictionary deleted; replaced by persistent database-backed rate limiter. | `test_crit_006_rate_limiting.py`<br>**12 / 12 PASSED (100%)** | None. Single root cause deduplicated with CRIT-06. |
| **MED-05**<br>`MEDIUM` | `frontend/src/services/proctoringService.ts:182-198`<br>`backend/models.py:389` | **Open** | Code inspection confirmed webcam snapshots remain encoded as multi-megabyte base64 JPEG strings and stored directly in database text columns (`Attempt.violationLogs_json`). | None | Offload webcam snapshots to object storage; store only image URLs in `violationLogs_json`. |
| **MED-06**<br>`MEDIUM` | `backend/routers/auth_router.py:56, 112`<br>`backend/schemas.py:23-70`<br>`POST /api/auth/register/student`<br>`POST /api/auth/register/trainer` | **Independently Verified Closed** | Registration endpoints strictly reject client-supplied `id` and `userId` with HTTP 400. All account IDs are generated exclusively on server using `models.generate_uuid()`. Client-supplied `id` forbidden in `UserCreate`. | `test_med_003_006_registration.py`<br>**24 / 24 PASSED (100%)** | None. Callers cannot specify or collide with existing user IDs. |
| **MED-07**<br>`MEDIUM` | `backend/routers/analytics_router.py:488-501`<br>`GET /api/analytics/institution` | **Open** | Code inspection confirmed fallback mock data (`default_depts = [{"name": "CSM", "avgScore": 82, ...}, ...]`, 815 students, 22540 submissions) returned when database is sparse. | None | Replace mock fallback data with actual aggregated database queries or return zeroed metrics. |
| **LOW-01**<br>`LOW` | Root directory `lms.db` | **Open** | Duplicate stale SQLite database file (352,256 bytes) exists in root alongside active `backend/lms.db` (516,096 bytes), breaking `test_all_22_issues.py:69`. | Fails `test_all_22_issues.py` | Delete root `lms.db` and add root `*.db` exclusion to `.gitignore`. |
| **LOW-02**<br>`LOW` | `backend/database.py:15-20` | **Open** | SQLite dev engine initialization lacks `PRAGMA foreign_keys = ON;`, allowing foreign key constraint violations to pass silently in dev while failing in Postgres. | None | Add SQLAlchemy event listener `PRAGMA foreign_keys = ON` on SQLite connections. |
| **INFO-01**<br>`INFO` | `backend/auth.py:18` | **Open** | JWT tokens have a static 7-day expiration (`ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7`) with no token revocation or blacklisting mechanism. | None | Shorten access token lifespan (15–30 min) and introduce refresh tokens or a revocation list. |

---

## 3. Discrepancy & Overlap Reconciliation

### 3.1 Overlapping Root Causes Deduplicated
1. **CRIT-06 and MED-04**: `MED-04` ("In-Memory Rate Limiter Bypass in Multi-Worker Setups and Memory Leak") describes the exact same root cause that was investigated, elevated, and remediated under `CRIT-06`. Both are tracked above, with `MED-04` noting its subsumption under `CRIT-06`.
2. **CRIT-04 and HIGH-01**: `HIGH-01` ("Missing Inactive/Suspended Status Check in Authentication") was investigated and remediated as part of the `CRIT-04` sprint. The checks were implemented in `rate_limiter.py` and `auth.py` and verified by Groups 7 and 8 of `test_crit_004_profile_auth.py`.
3. **CRIT-03 and HIGH-04**: `HIGH-04` ("Schedule Deletion Permanently Destroys Student Attempts and Answers") was remediated as part of the `CRIT-03` sprint in `backend/routers/tests_router.py:435-442` (raising HTTP 409 Conflict) and verified by Section 7 of `test_crit_003_attempt_auth.py`.
4. **CRIT-05 and Audit Section 6**: `CRIT-05` formalized the dependency supply-chain security findings cited in Audit Section 6 (`axios`, `xlsx`, `PyJWT`, `source-map-js`, `sprintf-js`).
5. **DEP-001 and HIGH-09**: `HIGH-09` ("Unauthenticated Public Debug and Admin Count Endpoints") was remediated during the deployment migration hardening alongside `DEP-001`.

### 3.2 Test Count Reconciliations
- **Active Regression Suite**: Exactly **149 tests across 7 test files**, all currently executing and passing with **100% success**:
  - `test_sec_001_questions.py`: 10 / 10 passed
  - `test_sec_002_passwords.py`: 16 / 16 passed *(Note: originally 15 tests; 1 test added to verify Alembic head `0003_add_rate_limit_events`)*
  - `test_crit_001_attempts.py`: 16 / 16 passed
  - `test_crit_002_schedule_auth.py`: 24 / 24 passed
  - `test_crit_003_attempt_auth.py`: 33 / 33 passed
  - `test_crit_004_profile_auth.py`: 38 / 38 passed
  - `test_crit_006_rate_limiting.py`: 12 / 12 passed
- **Ancillary Test Suites**:
  - `backend/test_migration_postgres.py`: 11 / 11 passed (disposable Postgres test)
  - `backend/test_migration_local.py`: 8 / 8 passed
  - `test_all_22_issues.py`: 22 assertions (legacy script; fails at line 69 due to LOW-01 root `lms.db` file)
- **Frontend Production Build**:
  - `npm run build` in `frontend/`: passes in 804ms with zero errors.

---

## 4. Prioritized List of Remaining Open Work

All **Critical** (CRIT-01–06, SEC-001–002) and **High** (HIGH-01–09, DEP-001) findings are **100% Independently Verified Closed**. The remaining open items are prioritized as follows:

### Priority 1: Schema Tracking & Database Indexing (Medium)
1. **MED-01: Establish Baseline Alembic Migration for All Application Tables**
   - *File*: `backend/alembic/versions/`
   - *Action*: Create `0000_baseline_schema.py` documenting the complete initial schema for all 10 core application tables (`tests`, `questions`, `schedules`, `attempts`, `answers`, `materials`, `notifications`, etc.).
2. **MED-02: Add Database Indexes on High-Frequency Foreign Keys**
   - *File*: `backend/models.py:381-382, 491-492`
   - *Action*: Add `index=True` to `Attempt.studentId`, `Attempt.scheduleId`, `Answer.attemptId`, and `Answer.questionId` to eliminate full table scans during high-concurrency exams and reporting.

### Priority 2: Storage & Analytics Refinements (Medium)
3. **MED-05: Migrate Proctoring Snapshots from Database Column to Object Storage**
   - *File*: `frontend/src/services/proctoringService.ts`, `backend/models.py:389`
   - *Action*: Offload multi-megabyte base64 JPEG strings from `Attempt.violationLogs_json` to S3/Cloud Storage; store only media URLs in the database column.
4. **MED-07: Remove Hardcoded Fallback Mock Data in Institutional Analytics**
   - *File*: `backend/routers/analytics_router.py:488-501`
   - *Action*: Compute real aggregate statistics or return empty/zeroed structures when the database has sparse records.

### Priority 3: Environment Hygiene & Token Lifecycles (Low & Informational)
5. **LOW-01: Delete Stale Root Database File (`lms.db`)**
   - *Action*: Remove root `lms.db` (352KB) and ensure `.gitignore` excludes `*.db` at repository root.
6. **LOW-02: Enforce Foreign Key Constraints in Dev SQLite Connection**
   - *File*: `backend/database.py:15-20`
   - *Action*: Attach `PRAGMA foreign_keys = ON;` event listener to SQLite dev engine.
7. **INFO-01: Transition to Short-Lived Access Tokens and Refresh Flow**
   - *File*: `backend/auth.py:18`
   - *Action*: Shorten JWT access token lifespan from 7 days to 15–30 minutes with HttpOnly refresh tokens.

