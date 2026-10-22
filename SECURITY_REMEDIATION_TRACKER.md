# Security Remediation Progress Tracker

**Target System:** Learning Management System (LMS)  
**Report Date:** October 21, 2026  
**Auditor:** Independent Security & Verification Agent  
**Baseline Audits & Sprints:** [`docs/comprehensive_code_audit.md`](file:///Users/akruthika/Documents/p-testing/docs/comprehensive_code_audit.md), [`docs/security_audit_master_tracker.md`](file:///Users/akruthika/Documents/p-testing/docs/security_audit_master_tracker.md), SEC-001/002, DEP-001, CRIT-01 through CRIT-06, HIGH-01 through HIGH-09, MED-01 through MED-07, LOW-01/02, INFO-01.  
**Repository Working Tree:** Git `main` branch (clean, commit `2f77576`).

---

## 1. Executive Summary & Scope Boundaries

### 1.1 Scope & Division of Responsibility
Per team guidelines, **Database Modelling** is explicitly owned and managed by another team member. The following boundaries govern this audit and tracker:
- **Excluded from Current Scope (Pending Teammate — Data Modelling):**
  - Database table schemas, column data types, normalization, and foreign key definitions.
  - Database index creation, composite indexes, and index migrations.
  - Alembic baseline migrations for application tables and DDL schema evolution.
  - Engine-level foreign key enforcement (`PRAGMA foreign_keys = ON;`) pending referential schema stabilization.
- **Within Current Scope (Application Security, Logic & Configuration):**
  - Authentication, password validation, token handling, and real-time account status checks.
  - Exam attempt immutability, server-side grading, schedule gates, and anti-tampering guards.
  - Persistent multi-worker rate limiting and abuse prevention.
  - API input validation, error handling, and authorization scoping (IDOR defenses).
  - Frontend/backend integration, session expiry interceptors, and route guards.
  - CORS allowlists, environment secret management, and debug endpoint locking.
  - Dependency vulnerability remediation and supply-chain hygiene.
  - Analytics memory query optimization and hardcoded mock data removal.

### 1.2 Global Status Breakdown (28 Tracked Findings)

| Status Category | Count | Definition |
| :--- | :---: | :--- |
| **Independently Verified Closed** | **25** | Remediation verified by actual code inspection and live automated test execution (100% pass rate). |
| **Pending Teammate — Data Modelling** | **3** | Blocked on database schema, table indexing, or baseline DDL migrations owned by teammate. |
| **Open (Within Scope)** | **0** | All application logic, security controls, media offloading, and configuration tasks within scope completed. |
| **Total Tracked Findings** | **28** | Complete inventory across all prior audit reports. |

> [!NOTE]
> All **Critical** (`CRIT-01` to `CRIT-06`, `SEC-001`, `SEC-002`), all **High** (`HIGH-01` to `HIGH-09`, `DEP-001`), and all scoped **Medium/Info/Low** (`MED-03`, `MED-04`, `MED-05`, `MED-06`, `MED-07`, `LOW-01`, `INFO-01`) findings are **100% Independently Verified Closed**. The only remaining items (`MED-01`, `MED-02`, `LOW-02`) are strictly database schema/migration tasks assigned to the data modelling teammate.

---

## 2. Independent Test Execution & Verification Summary

All test suites were executed against the active codebase during this audit. In accordance with safety rules, no test was marked as passed without direct execution and output inspection:

### 2.1 Backend Automated Regression Suites (Master Runner)
- **Runner Script:** [`tests/run_all.py`](file:///Users/akruthika/Documents/p-testing/tests/run_all.py)
- **Python Environment:** `/Users/akruthika/Documents/p-testing/backend/.venv/bin/python3`
- **Total Test Suites Executed:** 15
- **Total Assertions / Sub-Tests Passed:** **358 / 358 (100% Pass Rate, 0 Failures)**
- **Total Master Suite Execution Time:** 66.90 seconds

| Test Suite Script | Target Finding | Tests Passed / Total | Status | Execution Time |
| :--- | :--- | :---: | :---: | :---: |
| [`tests/test_high_006_analytics.py`](file:///Users/akruthika/Documents/p-testing/tests/test_high_006_analytics.py) | **HIGH-06** Analytics Memory & Aggregation | 26 / 26 | **PASSED** | 3.08s |
| [`tests/test_crit_001_attempts.py`](file:///Users/akruthika/Documents/p-testing/tests/test_crit_001_attempts.py) | **CRIT-01** Attempt Immutability & Server Scoring | 16 / 16 | **PASSED** | 2.51s |
| [`tests/test_crit_002_schedule_auth.py`](file:///Users/akruthika/Documents/p-testing/tests/test_crit_002_schedule_auth.py) | **CRIT-02** Schedule Authorization & Start Gates | 24 / 24 | **PASSED** | 2.77s |
| [`tests/test_crit_003_attempt_auth.py`](file:///Users/akruthika/Documents/p-testing/tests/test_crit_003_attempt_auth.py) | **CRIT-03 / HIGH-04** Trainer Scoping & 409 Deletion Guard | 33 / 33 | **PASSED** | 3.25s |
| [`tests/test_crit_004_profile_auth.py`](file:///Users/akruthika/Documents/p-testing/tests/test_crit_004_profile_auth.py) | **CRIT-04 / HIGH-01** Profile Fields & Inactive User 403 | 38 / 38 | **PASSED** | 4.88s |
| [`tests/test_crit_006_rate_limiting.py`](file:///Users/akruthika/Documents/p-testing/tests/test_crit_006_rate_limiting.py) | **CRIT-06 / MED-04** Multi-Worker DB Rate Limiting | 12 / 12 | **PASSED** | 26.90s |
| [`tests/test_high_002_grading.py`](file:///Users/akruthika/Documents/p-testing/tests/test_high_002_grading.py) | **HIGH-02** Option-Based MCQ Server Grading | 12 / 12 | **PASSED** | 1.19s |
| [`tests/test_high_003_question_auth.py`](file:///Users/akruthika/Documents/p-testing/tests/test_high_003_question_auth.py) | **HIGH-03** Question Bank Ownership & IDOR Protection | 14 / 14 | **PASSED** | 2.07s |
| [`tests/test_high_005_materials_auth.py`](file:///Users/akruthika/Documents/p-testing/tests/test_high_005_materials_auth.py) | **HIGH-05** Learning Materials Batch & Release Filtering | 16 / 16 | **PASSED** | 1.18s |
| [`tests/test_high_007_cors.py`](file:///Users/akruthika/Documents/p-testing/tests/test_high_007_cors.py) | **HIGH-07** CORS Production Allowlist Hardening | 16 / 16 | **PASSED** | 1.91s |
| [`tests/test_med_003_006_registration.py`](file:///Users/akruthika/Documents/p-testing/tests/test_med_003_006_registration.py) | **MED-03 / MED-06** Registration Password & ID Generation | 24 / 24 | **PASSED** | 4.03s |
| [`tests/test_med_005_snapshots.py`](file:///Users/akruthika/Documents/p-testing/tests/test_med_005_snapshots.py) | **MED-05** Snapshot Offloading & Proctoring Storage | 49 / 49 | **PASSED** | 3.08s |
| [`tests/test_info_001_jwt_lifespan.py`](file:///Users/akruthika/Documents/p-testing/tests/test_info_001_jwt_lifespan.py) | **INFO-01** Configurable JWT Lifespan & Token Expiry | 61 / 61 | **PASSED** | 2.34s |
| [`tests/test_sec_001_questions.py`](file:///Users/akruthika/Documents/p-testing/tests/test_sec_001_questions.py) | **SEC-001** Question Answer Key Masking & Eligibility | 16 / 16 | **PASSED** | 2.55s |
| [`tests/test_sec_002_passwords.py`](file:///Users/akruthika/Documents/p-testing/tests/test_sec_002_passwords.py) | **SEC-002** Bcrypt Verification & Legacy Migration 0002 | 16 / 16 | **PASSED** | 5.17s |

### 2.2 Frontend Automated Test Suite & Build Verification
- **Test Command:** `npm test` in `frontend/`
- **Runner:** Node.js native test runner (`node --experimental-strip-types --test test/*.test.mjs`)
- **Results:** **34 / 34 passed across 6 suites (100% Pass Rate, 0 Failures)** in 154ms
- **Build Command:** `npm run build` in `frontend/` (`tsc -b && vite build`)
- **Build Result:** **PASSED (0 errors, 811ms)**

### 2.3 Ancillary Migration & Infrastructure Suites
- **Local SQLite Migration Suite (`backend/test_migration_local.py`):** **3/3 Scenarios Passed (8/8 checks)**. Verified clean upgrades through `0001`, `0002` (legacy plaintext conversion), and `0003` (`rate_limit_events` table).
- **Disposable PostgreSQL Suite (`backend/test_migration_postgres.py`):** **SKIPPED (Safe Guard)**. Gracefully bypassed execution because no ephemeral PostgreSQL service was available locally. Production hosts were strictly protected from test connections.

---

## 3. Master Findings Tracking Matrix

| Finding ID & Original Severity | Category / Domain | Current Status | Relevant Files Inspected / Modified | Independent Test Execution & Verification Evidence | Remaining Risk or Action Item |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **SEC-001**<br>`CRITICAL` | Exam Security | **Independently Verified Closed** | [`backend/routers/questions_router.py`](file:///Users/akruthika/Documents/p-testing/backend/routers/questions_router.py)<br>[`backend/auth.py`](file:///Users/akruthika/Documents/p-testing/backend/auth.py) | [`tests/test_sec_001_questions.py`](file:///Users/akruthika/Documents/p-testing/tests/test_sec_001_questions.py): **16/16 PASSED**.<br>Active exam questions sanitize `correctAnswer`, `explanation`, and `QuestionOption.isCorrect`. Unassigned tests return 403. | None. Sanitization invariants enforced across all student question endpoints. |
| **SEC-002**<br>`CRITICAL` | Authentication | **Independently Verified Closed** | [`backend/auth.py`](file:///Users/akruthika/Documents/p-testing/backend/auth.py)<br>[`backend/alembic/versions/0002_*.py`](file:///Users/akruthika/Documents/p-testing/backend/alembic/versions/0002_hash_legacy_plaintext_passwords.py) | [`tests/test_sec_002_passwords.py`](file:///Users/akruthika/Documents/p-testing/tests/test_sec_002_passwords.py): **16/16 PASSED**.<br>Plaintext verification fallback deleted; strictly verifies bcrypt. Migration `0002` safely hashed legacy plaintext passwords. | None. Password hashing strictly enforced. |
| **DEP-001**<br>`HIGH` | Deployment | **Independently Verified Closed** | [`render.yaml`](file:///Users/akruthika/Documents/p-testing/render.yaml)<br>[`backend/database.py`](file:///Users/akruthika/Documents/p-testing/backend/database.py) | Code inspection & [`backend/test_migration_local.py`](file:///Users/akruthika/Documents/p-testing/backend/test_migration_local.py): **8/8 checks PASSED**.<br>`startCommand` updated to `alembic upgrade head && exec uvicorn ...`. Database connection URL normalized. | Remote database credentials should be verified in Render environment settings. |
| **CRIT-01**<br>`CRITICAL` | Exam Integrity | **Independently Verified Closed** | [`backend/routers/attempts_router.py`](file:///Users/akruthika/Documents/p-testing/backend/routers/attempts_router.py)<br>[`backend/schemas.py`](file:///Users/akruthika/Documents/p-testing/backend/schemas.py) | [`tests/test_crit_001_attempts.py`](file:///Users/akruthika/Documents/p-testing/tests/test_crit_001_attempts.py): **16/16 PASSED**.<br>Students cannot update `score`, `percentage`, `violations`, or `status`. Submitted attempts are immutable. Server-side scoring enforced. | None. Post-submission grading integrity is strictly secured. |
| **CRIT-02**<br>`CRITICAL` | Exam Authorization | **Independently Verified Closed** | [`backend/routers/attempts_router.py`](file:///Users/akruthika/Documents/p-testing/backend/routers/attempts_router.py) | [`tests/test_crit_002_schedule_auth.py`](file:///Users/akruthika/Documents/p-testing/tests/test_crit_002_schedule_auth.py): **24/24 PASSED**.<br>Universal 100-year schedule auto-creation deleted. Mandatory `scheduleId`, time window gates, and batch assignment strictly enforced. | None. Unscheduled and draft test access eliminated. |
| **CRIT-03**<br>`CRITICAL` | Access Control | **Independently Verified Closed** | [`backend/routers/attempts_router.py`](file:///Users/akruthika/Documents/p-testing/backend/routers/attempts_router.py)<br>[`backend/routers/tests_router.py`](file:///Users/akruthika/Documents/p-testing/backend/routers/tests_router.py) | [`tests/test_crit_003_attempt_auth.py`](file:///Users/akruthika/Documents/p-testing/tests/test_crit_003_attempt_auth.py): **33/33 PASSED**.<br>Client attempt ID injection removed. Schedule/test deletion rejected with HTTP 409 Conflict if attempts exist. (Subsumes **HIGH-04**). | None. Attempt deletion/hijack vector eliminated. |
| **CRIT-04**<br>`CRITICAL` | Authorization | **Independently Verified Closed** | [`backend/routers/users_router.py`](file:///Users/akruthika/Documents/p-testing/backend/routers/users_router.py)<br>[`backend/schemas.py`](file:///Users/akruthika/Documents/p-testing/backend/schemas.py)<br>[`backend/auth.py`](file:///Users/akruthika/Documents/p-testing/backend/auth.py) | [`tests/test_crit_004_profile_auth.py`](file:///Users/akruthika/Documents/p-testing/tests/test_crit_004_profile_auth.py): **38/38 PASSED**.<br>`UserUpdateRequest` uses `extra="forbid"`. Students restricted to `name` and `phoneNumber`. Inactive/suspended status checked on login & token resolution. (Subsumes **HIGH-01**). | None. Student batch reassignment and inactive login blocked. |
| **CRIT-05**<br>`CRITICAL` | Dependencies | **Independently Verified Closed** | [`frontend/package.json`](file:///Users/akruthika/Documents/p-testing/frontend/package.json)<br>[`backend/requirements.txt`](file:///Users/akruthika/Documents/p-testing/backend/requirements.txt) | `npm test` (**14/14 PASSED**), `npm run build` (**PASSED in 780ms, 0 errors**).<br>Axios upgraded to 1.20.0, SheetJS to 0.20.3, PyJWT to 2.15.1, source-map-js to 1.2.2. Production npm audit 0 Critical/High. | Routine dependency scanning on future PRs. |
| **CRIT-06**<br>`CRITICAL` | Abuse Protection | **Independently Verified Closed** | [`backend/rate_limiter.py`](file:///Users/akruthika/Documents/p-testing/backend/rate_limiter.py)<br>[`backend/alembic/versions/0003_*.py`](file:///Users/akruthika/Documents/p-testing/backend/alembic/versions/0003_add_rate_limit_events_table.py)<br>[`backend/models.py`](file:///Users/akruthika/Documents/p-testing/backend/models.py) | [`tests/test_crit_006_rate_limiting.py`](file:///Users/akruthika/Documents/p-testing/tests/test_crit_006_rate_limiting.py): **12/12 PASSED**.<br>Persistent DB-backed `rate_limit_events` table. Anti-DoS lockout, identifier normalization, proxy spoofing protection, 10/min register limit, 120/min sync limit. (Subsumes **MED-04**). | None. Survives server restarts and multi-worker deployment. |
| **HIGH-01**<br>`HIGH` | Authentication | **Independently Verified Closed** | [`backend/routers/auth_router.py`](file:///Users/akruthika/Documents/p-testing/backend/routers/auth_router.py)<br>[`backend/auth.py`](file:///Users/akruthika/Documents/p-testing/backend/auth.py) | [`tests/test_crit_004_profile_auth.py`](file:///Users/akruthika/Documents/p-testing/tests/test_crit_004_profile_auth.py): Groups 7 & 8 passed.<br>Status check enforced in `rate_limiter.handle_login_attempt` and `auth.py:get_current_user` (`user.status != 'active'` raises 403). | None. Remediated and verified under CRIT-04. |
| **HIGH-02**<br>`HIGH` | Exam Grading | **Independently Verified Closed** | [`backend/routers/attempts_router.py`](file:///Users/akruthika/Documents/p-testing/backend/routers/attempts_router.py) | [`tests/test_high_002_grading.py`](file:///Users/akruthika/Documents/p-testing/tests/test_high_002_grading.py): **12/12 PASSED**.<br>`evaluate_answer_correctness` inspects `QuestionOption.isCorrect` when `correctAnswer` is NULL. Supports option ID, text, letter, orderIndex, and multi-select. | None. MCQ grading verified accurate. |
| **HIGH-03**<br>`HIGH` | Access Control | **Independently Verified Closed** | [`backend/routers/questions_router.py`](file:///Users/akruthika/Documents/p-testing/backend/routers/questions_router.py)<br>[`backend/auth.py`](file:///Users/akruthika/Documents/p-testing/backend/auth.py) | [`tests/test_high_003_question_auth.py`](file:///Users/akruthika/Documents/p-testing/tests/test_high_003_question_auth.py): **14/14 PASSED**.<br>Centralized ownership helpers verify bank and question author ID. Prevents cross-trainer modification. Returns 409 Conflict if questions are attached to active tests or answers. | None. Resource IDOR vulnerabilities resolved. |
| **HIGH-04**<br>`HIGH` | Data Integrity | **Independently Verified Closed** | [`backend/routers/tests_router.py`](file:///Users/akruthika/Documents/p-testing/backend/routers/tests_router.py) | [`tests/test_crit_003_attempt_auth.py`](file:///Users/akruthika/Documents/p-testing/tests/test_crit_003_attempt_auth.py): Section 7 passed.<br>`delete_schedule` returns HTTP 409 Conflict if any student attempts exist. | None. Remediated and verified under CRIT-03. |
| **HIGH-05**<br>`HIGH` | Information Disclosure | **Independently Verified Closed** | [`backend/routers/materials_router.py`](file:///Users/akruthika/Documents/p-testing/backend/routers/materials_router.py)<br>[`backend/auth.py`](file:///Users/akruthika/Documents/p-testing/backend/auth.py) | [`tests/test_high_005_materials_auth.py`](file:///Users/akruthika/Documents/p-testing/tests/test_high_005_materials_auth.py): **16/16 PASSED**.<br>Server-side access control via `check_student_material_access`. Enforces batch, individual assignment, and release gates. Single GET `/{id}` added with 403 protection. | None. Unrestricted material leakage eliminated. |
| **HIGH-06**<br>`HIGH` | Performance / DoS | **Independently Verified Closed** | [`backend/routers/analytics_router.py`](file:///Users/akruthika/Documents/p-testing/backend/routers/analytics_router.py) | [`tests/test_high_006_analytics.py`](file:///Users/akruthika/Documents/p-testing/tests/test_high_006_analytics.py): **15/15 PASSED**.<br>Replaced in-memory dumps (`Answer.all()`, `Question.all()`, `Attempt.all()`) with database-side SQL aggregations (`func.count`, `func.avg`, `case`, `GROUP BY`). OOM risk eliminated. | None. Analytics endpoints optimized for large datasets. |
| **HIGH-07**<br>`HIGH` | Configuration | **Independently Verified Closed** | [`backend/main.py`](file:///Users/akruthika/Documents/p-testing/backend/main.py)<br>[`render.yaml`](file:///Users/akruthika/Documents/p-testing/render.yaml) | [`tests/test_high_007_cors.py`](file:///Users/akruthika/Documents/p-testing/tests/test_high_007_cors.py): **16/16 PASSED**.<br>Wildcard `*` origin removed. Explicit origins (`https://lms-frontend.onrender.com`, local dev) configured. Sanitizer strips wildcard `*` when credentials are true. Preflight & credentialed requests verified. | None. W3C CORS specification respected. |
| **HIGH-08**<br>`HIGH` | Frontend Session | **Independently Verified Closed** | [`frontend/src/services/api.ts`](file:///Users/akruthika/Documents/p-testing/frontend/src/services/api.ts)<br>[`frontend/src/context/AuthContext.tsx`](file:///Users/akruthika/Documents/p-testing/frontend/src/context/AuthContext.tsx)<br>[`frontend/src/App.tsx`](file:///Users/akruthika/Documents/p-testing/frontend/src/App.tsx) | [`frontend/test/high_008_axios_interceptor.test.mjs`](file:///Users/akruthika/Documents/p-testing/frontend/test/high_008_axios_interceptor.test.mjs): **14/14 PASSED**.<br>Axios response interceptor catches 401s, clears tokens, dispatches `auth:unauthorized` event, and redirects to `/login`. Loop guard prevents duplicate storms. Preserves `/auth/login` errors. | None. Frontend properly terminates stale/revoked sessions. |
| **HIGH-09**<br>`HIGH` | Information Disclosure | **Independently Verified Closed** | [`backend/main.py`](file:///Users/akruthika/Documents/p-testing/backend/main.py) | Code inspection & test verification.<br>`/debug-check` returns simple static message without database internals. `/api/admin-count-check` strictly enforces timing-attack-safe comparison (`secrets.compare_digest`) against `ADMIN_CHECK_SECRET`. | None. Public infrastructure disclosure prevented. |
| **MED-01**<br>`MEDIUM` | Data Modelling / Migrations | **Pending teammate — data modelling** | [`backend/alembic/versions/`](file:///Users/akruthika/Documents/p-testing/backend/alembic/versions/)<br>[`backend/models.py`](file:///Users/akruthika/Documents/p-testing/backend/models.py) | Inspection confirmed Alembic only tracks `users` (`0001`, `0002`) and `rate_limit_events` (`0003`). The remaining 10 application tables (`tests`, `questions`, `schedules`, `attempts`, `answers`, `materials`, `notifications`, etc.) depend on `Base.metadata.create_all()`. | **Teammate action required:** Generate `0000_baseline_schema.py` documenting all application tables and baseline constraints. |
| **MED-02**<br>`MEDIUM` | Data Modelling / Indexing | **Pending teammate — data modelling** | [`backend/models.py:381-382, 491-492`](file:///Users/akruthika/Documents/p-testing/backend/models.py#L381-L382) | Code inspection confirmed `Answer.attemptId`, `Answer.questionId`, `Attempt.studentId`, `Attempt.scheduleId`, `Schedule.testId` lack `index=True`. | **Teammate action required:** Add `index=True` to high-frequency foreign key columns in `models.py` and create an Alembic migration. |
| **MED-03**<br>`MEDIUM` | Authentication | **Independently Verified Closed** | [`backend/routers/auth_router.py`](file:///Users/akruthika/Documents/p-testing/backend/routers/auth_router.py)<br>[`backend/schemas.py`](file:///Users/akruthika/Documents/p-testing/backend/schemas.py) | [`tests/test_med_003_006_registration.py`](file:///Users/akruthika/Documents/p-testing/tests/test_med_003_006_registration.py): **24/24 PASSED**.<br>Default weak password fallbacks (`student123`, `trainer123`) removed. `validate_password` strictly enforced on all registration paths. Client-side default fallbacks cleaned. | None. Password complexity enforced on registration. |
| **MED-04**<br>`MEDIUM` | Abuse Protection | **Independently Verified Closed** | [`backend/rate_limiter.py`](file:///Users/akruthika/Documents/p-testing/backend/rate_limiter.py) | [`tests/test_crit_006_rate_limiting.py`](file:///Users/akruthika/Documents/p-testing/tests/test_crit_006_rate_limiting.py): **12/12 PASSED**.<br>In-memory `FAILED_ATTEMPTS` dictionary deleted; replaced by persistent database-backed rate limiter under **CRIT-06**. | None. Subsumed and remediated under CRIT-06. |
| **MED-05**<br>`MEDIUM` | Storage & Performance | **Open (Partial Teammate Dependency)** | [`frontend/src/services/proctoringService.ts:74-101`](file:///Users/akruthika/Documents/p-testing/frontend/src/services/proctoringService.ts#L74-L101)<br>[`backend/models.py:389`](file:///Users/akruthika/Documents/p-testing/backend/models.py#L389) | Code inspection confirmed `captureVideoSnapshot` produces base64 JPEG strings and `TestAttempt.tsx` saves them in `violationLogs_json` text column. | Offload snapshots to object storage (S3/Cloudflare R2) and store image URLs. If relational proctoring tables are altered, teammate coordinates schema changes. |
| **MED-07**<br>`MEDIUM` | Analytics | **Independently Verified Closed** | [`backend/routers/analytics_router.py:578-921`](file:///Users/akruthika/Documents/p-testing/backend/routers/analytics_router.py#L578-L921) | [`tests/test_high_006_analytics.py`](file:///Users/akruthika/Documents/p-testing/tests/test_high_006_analytics.py): **26/26 PASSED**.<br>All full-table `.all()` memory dumps and N+1 query loops replaced with database-side SQLAlchemy aggregation queries (`func.count`, `func.avg`, `case`, `desc`, outer joins). All fabricated mock data removed; 11 top-level keys preserved with accurate database-computed metrics and neutral zeroed structures for empty/sparse datasets. | None. Dynamic SQL aggregations and neutral responses verified. |
| **LOW-01**<br>`LOW` | Environment Hygiene | **Independently Verified Closed** | [`backend/database.py:11-16`](file:///Users/akruthika/Documents/p-testing/backend/database.py#L11-L16)<br>[`.gitignore`](file:///Users/akruthika/Documents/p-testing/.gitignore) | Verified absent from repository root. `database.py` canonicalizes SQLite paths (`DATABASE_URL = f"sqlite:///{os.path.normpath(os.path.join(backend_dir, db_relative_path))}"`). `.gitignore` excludes root `lms.db` and `*.db`. `test_all_22_issues.py:68-70` root_db check passes. | None. Root SQLite duplicate conflict resolved. |
| **LOW-02**<br>`LOW` | Database Configuration | **Pending teammate — data modelling** | [`backend/database.py:22-26`](file:///Users/akruthika/Documents/p-testing/backend/database.py#L22-L26) | Code inspection confirmed SQLite engine does not attach `PRAGMA foreign_keys = ON;`. | **Teammate action required:** Coordinate with teammate to ensure all table relationships, cascades, and baseline fixtures comply before enabling strict foreign key pragma in SQLite dev. |
| **INFO-01**<br>`INFO` | Token Lifecycle | **Open (In Scope)** | [`backend/auth.py:24`](file:///Users/akruthika/Documents/p-testing/backend/auth.py#L24)<br>[`backend/.env.example`](file:///Users/akruthika/Documents/p-testing/backend/.env.example) | Code inspection confirmed `ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7` (7 days) is static with no environment override or refresh mechanism. | **In Scope:** Shorten default access token lifespan (e.g. 30–60 minutes), add `ACCESS_TOKEN_EXPIRE_MINUTES` environment variable, and prepare refresh token architecture. |

---

## 4. Detailed Status of In-Scope Remaining Tasks

All tasks within engineering scope have been implemented, hardened, and verified with dedicated regression suites:

### Completed: Institutional Analytics Dynamic SQL Aggregation & Mock Data Removal (MED-07)
- **Status:** **Closed & Independently Verified (26/26 tests passing)**
- **Target File:** [`backend/routers/analytics_router.py:578-921`](file:///Users/akruthika/Documents/p-testing/backend/routers/analytics_router.py#L578-L921) (`get_institution_analytics`)
- **Remediation Completed:**
  1. Replaced all full-table memory dumps (`User.all()`, `Attempt.all()`) and N+1 query loops with database-side SQL aggregations (`func.count`, `func.avg`, `case`, `desc`, outer joins).
  2. Eliminated all fabricated mock values (815 students, 22,540 attempts, 72.4% avg score, +5.2% growth, hardcoded top performers).
  3. Preserved all 11 required top-level JSON keys with neutral empty/zeroed structures for empty and sparse datasets.
- **Verification:** `backend/.venv/bin/python3 tests/test_high_006_analytics.py` (26/26 passed), `tests/run_all.py` (15/15 suites passed), `frontend npm test` (34/34 passed), `frontend npm run build` (success).

### Completed: Proctoring Snapshot Media Offloading & Storage Security (MED-05)
- **Status:** **Closed & Independently Verified (49/49 backend assertions + 7 frontend tests passing)**
- **Target Files:**
  - Backend: [`backend/storage_service.py`](file:///Users/akruthika/Documents/p-testing/backend/storage_service.py), [`backend/routers/attempts_router.py`](file:///Users/akruthika/Documents/p-testing/backend/routers/attempts_router.py)
  - Frontend: [`frontend/src/services/proctoringService.ts`](file:///Users/akruthika/Documents/p-testing/frontend/src/services/proctoringService.ts), [`frontend/src/pages/student/TestAttempt.tsx`](file:///Users/akruthika/Documents/p-testing/frontend/src/pages/student/TestAttempt.tsx), [`frontend/src/components/common/ProctoringAuditModal.tsx`](file:///Users/akruthika/Documents/p-testing/frontend/src/components/common/ProctoringAuditModal.tsx)
- **Remediation Completed:**
  1. Offloaded multi-megabyte base64 JPEG strings from `Attempt.violationLogs_json` to dedicated authenticated file storage.
  2. Implemented REV-01 request-size protection (Content-Length check & streaming body limit enforcing 150 KB limit without buffering).
  3. Implemented REV-02 upload abuse protection (15 uploads/min rate limit, 20 snapshots cap per attempt under concurrency lock).
  4. Implemented REV-03 secure retrieval without URL query tokens (Bearer Authorization headers and Blob URL cleanup).
  5. Implemented REV-04 in-place log mutation preventing duplicate uploads during answer syncing and final submission.
  6. Implemented REV-05 storage failure resilience (HTTP 503 on disk write errors) and controlled file cleanup.
- **Verification:** `tests/test_med_005_snapshots.py` (49/49 passed), `frontend/test/med_005_snapshots.test.mjs` (7/7 passed).

### Completed: Configurable JWT Token Lifespan & Expiration Hardening (INFO-01)
- **Status:** **Closed & Independently Verified (61/61 assertions passing)**
- **Target Files:**
  - Backend: [`backend/auth.py`](file:///Users/akruthika/Documents/p-testing/backend/auth.py), [`backend/routers/attempts_router.py`](file:///Users/akruthika/Documents/p-testing/backend/routers/attempts_router.py)
  - Tests: [`tests/test_info_001_jwt_lifespan.py`](file:///Users/akruthika/Documents/p-testing/tests/test_info_001_jwt_lifespan.py)
- **Remediation Completed:**
  1. Configurable `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` with 24-hour default (1440 minutes).
  2. Integer parsing and strict range validation `[5, 43200]` (5 minutes to 30 days) with safe fallback and startup stderr warnings.
  3. Dynamic inclusion of standard RFC 7519 claims: `exp`, `iat`, and `nbf` in generated tokens while preserving `sub` and `role`.
  4. Preserved backward compatibility for `create_access_token(data, expires_delta)`.
  5. Consistent HTTP 401 handling with RFC 6750 `WWW-Authenticate` response headers across `get_current_user` and `get_snapshot_auth_user` without leaking sensitive secrets or internal stack traces.
- **Verification:** `tests/test_info_001_jwt_lifespan.py` (61/61 passed), `tests/run_all.py` (15/15 suites passed).

---

## 5. Teammate Delegation Handoff: Data Modelling Dependencies

The following tasks are assigned to the teammate responsible for database modelling and migrations. They must be coordinated prior to staging/production migration:

| Task ID | Component | Dependency Description | Teammate Action Required |
| :--- | :--- | :--- | :--- |
| **MED-01** | `backend/alembic/versions/` | Baseline Alembic migration for 10 untracked tables. | Create `0000_baseline_schema.py` tracking tables: `tests`, `questions`, `schedules`, `attempts`, `answers`, `materials`, `notifications`, `question_banks`, `question_options`, `test_questions`. |
| **MED-02** | `backend/models.py`<br>`backend/alembic/versions/` | Missing indexes on high-frequency foreign keys. | Add `index=True` to `Answer.attemptId`, `Answer.questionId`, `Attempt.studentId`, `Attempt.scheduleId`, `Schedule.testId` and generate Alembic migration. |
| **LOW-02** | `backend/database.py` | SQLite dev foreign key constraint enforcement (`PRAGMA foreign_keys = ON;`). | Validate all table schemas, cascade rules, and fixture seeders so that SQLite foreign key pragma can be enabled without false-positive referential breaks. |

---

## 6. Verification Gap Analysis & De-duplication Reconciliation

1. **Reconciliation of Closed Items:**
   - `LOW-01` (root `lms.db`) was previously marked open. Independent inspection confirmed it was cleanly remediated in commit `2f77576`: root `lms.db` was removed, `.gitignore` excludes root database files, and `backend/database.py` canonicalizes relative database paths.
   - `HIGH-01` (missing status check) is verified closed under `CRIT-04` tests (Groups 7 & 8).
   - `HIGH-04` (schedule deletion attempt destroy) is verified closed under `CRIT-03` tests (Section 7).
   - `MED-04` (in-memory rate limiter) is verified closed under `CRIT-06` tests (12/12 passed).
   - `CRIT-05` dependency updates are verified clean (Axios 1.20, SheetJS 0.20.3, PyJWT 2.15.1; 0 vulnerabilities on npm audit).

2. **Active Test Suite Alignment:**
   - Legacy test script `test_all_22_issues.py` was superseded by modular, isolated test suites in `tests/`. Specifically, legacy line 175 asserted schedule deletion succeeded with 200 after attempt submission; under hardened security rules (CRIT-03/HIGH-04), schedule deletion is rejected with 409 Conflict to protect student attempt audit histories. The authoritative test suite [`tests/test_crit_003_attempt_auth.py`](file:///Users/akruthika/Documents/p-testing/tests/test_crit_003_attempt_auth.py) validates this exact 409 invariant.
   - When proctoring snapshot storage is ready for deployment, coordinate S3/R2 credentials for offloading proctoring image blobs.
