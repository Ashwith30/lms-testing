# SEC-001 Follow-Up Implementation & Verification Report

**Issue Title**: SEC-001: Question API and Client Service Expose Exam Answers to Students  
**Audit Context**: Resolution of remaining defects identified in `SEC-001_verification_report.md`:
1. Issue 1: Missing Test-Level Authorization on `get_exam_attempt_questions`
2. Issue 2: Broken Post-Exam Review in `TestResult.tsx`

**Date**: October 10, 2026  
**Final Status**: **FULLY FIXED & VERIFIED (All 16 Tests Passed)**

---

## 1. Summary of Changes

| Component / File | Purpose & Specific Implementation |
|---|---|
| [`backend/routers/questions_router.py`](file:///Users/akruthika/Documents/p-testing/backend/routers/questions_router.py) | **Test-Level Authorization**: Updated `get_exam_attempt_questions` (and its aliases `/tests/{test_id}/questions`, `/questions/attempt/{test_id}`) to enforce: <br>1. Test publishing status (`test.status == "Published"`). Draft/Archived tests return HTTP 403.<br>2. Schedule presence & student assignment: Verifies student belongs to `assignedBatch` or `assignedStudents` (or `"all"`). Unassigned students return HTTP 403.<br>3. Schedule time window: Checks active schedule (`startTime <= now <= endTime`), resuming in-progress attempts, and attempt count limits. Future tests return HTTP 403 ("Scheduled test has not started yet."); expired tests return HTTP 403 ("Scheduled test session has expired.").<br>4. Staff roles (`admin`, `trainer`, `institution`) bypass student schedule constraints. |
| [`backend/schemas.py`](file:///Users/akruthika/Documents/p-testing/backend/schemas.py) | Added [`ReviewQuestion`](file:///Users/akruthika/Documents/p-testing/backend/schemas.py#L221) schema for post-submission review, including `id`, `text`, `question`, `options`, `userSelectedOption`, `isCorrect`, `correctAnswer`, and `explanation`. |
| [`backend/models.py`](file:///Users/akruthika/Documents/p-testing/backend/models.py) | Updated `Attempt.answers` property to include trusted server-graded `"isCorrect": ans.isCorrect` when the attempt has status `"submitted"` or `"auto_submitted"`. During active exam (`in_progress`), `isCorrect` remains `None`. |
| [`backend/routers/attempts_router.py`](file:///Users/akruthika/Documents/p-testing/backend/routers/attempts_router.py) | **Authorized Post-Submission Review Endpoint**: Implemented `GET /api/attempts/{attempt_id}/review`: <br>1. Enforces student ownership: `att.studentId == current_user.id` (returns HTTP 403 on cross-student access).<br>2. Enforces attempt completion: Only submitted/auto-submitted attempts can be reviewed (returns HTTP 400 for in-progress attempts; no answer leakage before submission).<br>3. Enforces test policy: If `showResultImmediately` is `False`, returns HTTP 403.<br>4. Returns per-question server-graded review items (`ReviewQuestion`). |
| [`frontend/src/services/testService.ts`](file:///Users/akruthika/Documents/p-testing/frontend/src/services/testService.ts) | Added `getAttemptReview(attemptId)` calling `GET /attempts/${attemptId}/review`. |
| [`frontend/src/pages/student/TestResult.tsx`](file:///Users/akruthika/Documents/p-testing/frontend/src/pages/student/TestResult.tsx) | Updated `fetchResults` to load review data using `testService.getAttemptReview(attempt.id)` when `showResultImmediately` is enabled. Updated stats breakdown and question review cards to evaluate correctness using trusted server-graded `isCorrect`. |
| [`frontend/src/types/index.ts`](file:///Users/akruthika/Documents/p-testing/frontend/src/types/index.ts) | Added optional `isCorrect` and `userSelectedOption` to `Question` and `isCorrect` to `AnswerRecord` to align TypeScript types with server response schemas. |

---

## 2. Security Verification Details

### A. Test-Level Authorization (Defect 1 Addressed)
- **Draft & Archived Test Protection**: Students cannot retrieve questions for any test whose status is not `"Published"`. Returned status is HTTP 403 Forbidden (`detail="Test is not published."`).
- **Batch & Student Assignment Protection**: Students cannot retrieve questions for tests belonging to another batch or where their student ID is not in `assignedStudents`. Returned status is HTTP 403 Forbidden (`detail="Student is not assigned to this scheduled test session."`).
- **Time Window Enforcement**: 
  - If all eligible schedules are in the future, access is denied with HTTP 403 (`detail="Scheduled test has not started yet."`).
  - If all eligible schedules have passed, access is denied with HTTP 403 (`detail="Scheduled test session has expired."`).
  - If a student has an existing `in_progress` attempt within an active schedule, they are authorized to fetch questions during the test attempt.
- **Alias Coverage**: All endpoint aliases (`/api/tests/{test_id}/attempt-questions`, `/api/tests/{test_id}/questions`, `/api/questions/attempt/{test_id}`) route through the same handler, preventing alias bypasses.
- **Staff Workflow Preservation**: Admin and Trainer users can still view/preview questions for both Published and Draft tests.

### B. Post-Exam Review Security & Integrity (Defect 2 Addressed)
- **Zero Pre-Submission Answer Leakage**: The active exam question endpoint (`/api/tests/{test_id}/attempt-questions`) remains strictly sanitized, never returning `correctAnswer`, `explanation`, or `isCorrect`.
- **In-Progress Attempt Protection**: Attempt review via `/api/attempts/{attempt_id}/review` requires the attempt to be completed (`status in ("submitted", "auto_submitted")`). In-progress attempts receive HTTP 400 Bad Request.
- **Strict Ownership Isolation**: Students can only review their own attempts. Attempts by other students return HTTP 403 Forbidden.
- **Trusted Server-Side Grading**: The review UI displays correctness calculated and stored on the server during submission (`models.Answer.isCorrect`). The frontend never calculates or submits correctness.
- **Accurate Review Display**: `TestResult.tsx` renders correct badges (`Correct (+marks)`), incorrect indicators, option highlights (`(Your Answer)`, `(Correct)`), explanations, and statistical counters.

---

## 3. Test Evidence

### Test Execution: `backend/.venv/bin/python test_sec_001_questions.py`
All 16 automated tests passed:
```
==================================================================
RUNNING COMPREHENSIVE SECURITY & AUTHORIZATION TEST SUITE: SEC-001
==================================================================

--- PART 1: Question Management Endpoint Restrictions ---
  [PASSED] Unauthenticated access to /questions returned 401 Unauthorized
  [PASSED] Student access to /questions strictly forbidden (403)
  [PASSED] Admin and Trainer can access /questions and view question metadata

--- PART 2: Test-Level Authorization & Eligibility Enforcement ---
  [PASSED] Student cannot access questions for Draft test (403 Forbidden)
  [PASSED] Trainer can preview Draft test questions (200 OK)
  [PASSED] Student blocked from test assigned to another batch (403 Forbidden)
  [PASSED] Student blocked from test scheduled in the future (403 Forbidden)
  [PASSED] Student blocked from expired test session (403 Forbidden)
  [PASSED] Eligible student successfully retrieved questions for active assigned test (200 OK)
  [PASSED] All alternate endpoint aliases strictly enforce authorization guards

--- PART 3: Active Exam Response Sanitization ---
  [PASSED] Active exam question response completely excludes answer keys, explanations, and isCorrect flags

--- PART 4: Attempt Submission & Post-Exam Review ---
  [PASSED] Student started attempt (ID: att-2a68eac2-2614-4531-9285-02deb9f5d28c)
  [PASSED] In-progress attempt review strictly rejected (400 Bad Request)
  [PASSED] Server-side grading verified: Score = 2.0 / 3.0
  [PASSED] Cross-student attempt review strictly blocked (403 Forbidden)
  [PASSED] Post-submission review delivers accurate server-graded results, answers, and explanations
  [PASSED] Attempt.answers reliably provides server-graded isCorrect status

==================================================================
ALL SEC-001 SECURITY & AUTHORIZATION TESTS PASSED PERFECTLY (100%)!
==================================================================
```

### Regression & Build Verification
1. **Frontend Production Build**:
   - Command: `npm run build` in `frontend/`
   - Result: `tsc -b && vite build` succeeded in 740ms with **0 errors**.
2. **Database Migration Lifecycle**:
   - Command: `backend/.venv/bin/python backend/test_migration_local.py`
   - Result: All 3 migration and auth scenarios passed **100% OK**.

---

## 4. Failures & Remaining Risks

- **Failures Observed**: None. All automated test cases passed.
- **Remaining Risks**:
  - If a test is configured with `showResultImmediately: false`, students cannot review their questions immediately after submission (as intended by policy); results will become available only when the trainer publishes or completes evaluation.
  - In environments with multi-tenant institutions, ensuring trainers only access tests created within their own institution should be covered in subsequent tenant-isolation audit items (AUTH/TENANT assessments).
