# HIGH-03 Implementation Report: Question Bank and Question Authorization & Integrity

**Status**: `FIX VERIFIED`  
**Date**: 2026-10-17  
**Finding ID**: `HIGH-03` (Reference: `security_audit_master_tracker.md`, `comprehensive_code_audit.md`)  
**Severity**: High  
**Vulnerability Type**: Insecure Direct Object References (IDOR), Missing Function Level Access Control, Silent Cascade Deletion Risk  

---

## 1. Executive Summary

A vulnerability was identified in `backend/routers/questions_router.py` where endpoints `DELETE /api/question-banks/{bank_id}`, `DELETE /api/questions/{question_id}`, and `POST /api/questions` allowed any authenticated user with the `trainer` role to delete or modify questions and entire question banks owned by other trainers. Furthermore, `POST /api/question-banks` accepted client-supplied `ownerId` and `uploadedBy` parameters, enabling trainers to spoof ownership or masquerade under another trainer's ID. Finally, deleting questions or question banks did not check for active assessment usage (`TestQuestion`) or historical student responses (`Answer`), introducing database integrity risks and silent deletion of assessment audit trails.

Remediation has introduced centralized authorization helper functions in `backend/auth.py`, strict ownership verification, role preservation for platform administrators and institutions, identity spoofing prevention, and explicit conflict checks (`HTTP 409 Conflict`) preventing deletion of questions linked to tests or student exam attempts. All changes are backward compatible with existing frontend callers and verified by a 14-test verification suite alongside 156 regression tests.

---

## 2. Changed Files & Scope of Remediation

### 2.1 Backend Changes

1. **[`backend/auth.py`](file:///Users/akruthika/Documents/p-testing/backend/auth.py)**:
   - Added `check_trainer_question_bank_access(user, bank, db, for_deletion=False)`:
     - Admins and institutions have full management and deletion authority.
     - Inactive, suspended, or archived user accounts are strictly denied access (`False`).
     - Bank owner (`bank.ownerId == user.id`) is always permitted (`True`).
     - If `for_deletion=True`: Restricted strictly to direct bank owner or admins/institutions. Non-owners cannot delete a bank even if assigned to a matching course or topic.
     - If `for_deletion=False`: In addition to bank owner, trainers with an active `TrainerAssignment` on the bank's `courseId` or `topicId` are authorized to manage questions within the bank.
   - Added `check_trainer_question_access(user, question, db, for_deletion=False)`:
     - Resolves parent question bank and delegates to `check_trainer_question_bank_access`.

2. **[`backend/routers/questions_router.py`](file:///Users/akruthika/Documents/p-testing/backend/routers/questions_router.py)**:
   - `POST /api/question-banks`: Enforced that for users with the `trainer` role, `owner_id` is automatically set to `current_user.id`, ignoring any spoofed client-supplied `ownerId` or `uploadedBy`.
   - `DELETE /api/question-banks/{bank_id}`:
     - Enforces `check_trainer_question_bank_access(current_user, bank, db, for_deletion=True)`; raises `HTTP 403 Forbidden` if unauthorized.
     - Exam integrity check: Queries all questions in the bank. If any question is assigned to a test (`TestQuestion`), raises `HTTP 409 Conflict` ("Cannot delete question bank containing questions currently assigned to one or more assessments.").
     - Exam history check: If any question in the bank has recorded student answers (`Answer`), raises `HTTP 409 Conflict` ("Cannot delete question bank containing questions with existing assessment attempts.").
   - `POST /api/questions`:
     - Validates payload format (object or list).
     - Prior to creating questions, validates existence of target question banks (returns `404 Not Found` if missing) and checks authorization via `check_trainer_question_bank_access(current_user, bank, db, for_deletion=False)`; raises `HTTP 403 Forbidden` if trainer attempts to inject questions into another trainer's bank without authorization.
   - `DELETE /api/questions/{question_id}`:
     - Enforces `check_trainer_question_access(current_user, db_q, db, for_deletion=True)`; raises `HTTP 403 Forbidden` if unauthorized.
     - Protects active assessments: Checks `TestQuestion`; raises `HTTP 409 Conflict` if the question is used in any test.
     - Protects exam records: Checks `Answer`; raises `HTTP 409 Conflict` if student answers exist for the question.

3. **[`test_high_003_question_auth.py`](file:///Users/akruthika/Documents/p-testing/test_high_003_question_auth.py)**:
   - Created standalone comprehensive verification suite covering 14 test scenarios with zero external mock dependencies.

---

## 3. Authorization Rules & Matrix

| User Role | Question Bank Action | Question Action | Authorization Rule |
|---|---|---|---|
| **Admin** | Create, View, Delete | Create, View, Delete | Permitted across all question banks and questions. Cannot delete if referenced in tests/answers (409). |
| **Institution** | Create, View, Delete | Create, View, Delete | Permitted platform-wide. Cannot delete if referenced in tests/answers (409). |
| **Trainer (Owner)** | Create, View, Delete | Create, View, Delete | Permitted for banks/questions they created (`ownerId == user.id`). Cannot delete if referenced in tests/answers (409). |
| **Trainer (Assigned)** | View, Add Questions | View, Add Questions | Permitted if active `TrainerAssignment` exists on bank's `courseId` or `topicId`. Deletion is **strictly forbidden** (403). |
| **Trainer (Unrelated)** | View Public only | View Public only | Deletion or modification of banks/questions owned by other trainers is **strictly forbidden** (403). |
| **Student** | None | View active sanitized exam questions | Cannot create, modify, or delete any question banks or questions (403). |
| **Unauthenticated** | None | None | All mutation endpoints return `401 Unauthorized`. |

---

## 4. Test Verification & Results

### 4.1 HIGH-03 Verification Test Suite (`test_high_003_question_auth.py`)

```
==================================================================
RUNNING COMPREHENSIVE HIGH-03 VERIFICATION TEST SUITE
==================================================================

--- SECTION 1: Trainer Ownership Enforcement on Question Banks ---
  [1/14] Trainer A cannot delete Trainer B's question bank (403 Forbidden)
  [2/14] Database verified: Trainer B's question bank remains intact after unauthorized attempt

--- SECTION 2: Trainer Ownership Enforcement on Individual Questions ---
  [3/14] Trainer A cannot delete Trainer B's question (403 Forbidden)
  [4/14] Database verified: Trainer B's question remains intact after unauthorized attempt

--- SECTION 3: Question Creation & Identity Spoofing Protection ---
  [5/14] Trainer A cannot add questions to Trainer B's question bank (403 Forbidden)
  [6/14] Bank creation forces ownerId to authenticated trainer; spoofing blocked (200 OK)

--- SECTION 4: Legitimate Authorized Deletion Workflows ---
  [7/14] Authorized trainer successfully deleted own question and question bank (200 OK)
  [8/14] Admin permissions preserved: can delete question banks across trainers (200 OK)
  [9/14] Institution permissions preserved: can delete question banks across trainers (200 OK)

--- SECTION 5: Role-Based Route Guarding ---
  [10/14] Student attempts to delete question bank or question strictly forbidden (403)
  [11/14] Unauthenticated attempts to delete return 401 Unauthorized

--- SECTION 6: Assessment & Exam History Integrity (Conflict Checks) ---
  [12/14] Deleting question assigned to test rejected with 409 Conflict (assessment protected)
  [13/14] Deleting question with student answers rejected with 409 Conflict (answers protected)
  [14/14] Deleting question bank containing test/attempt questions rejected with 409 Conflict

==================================================================
ALL 14/14 HIGH-03 VERIFICATION TESTS PASSED (100%)!
==================================================================
```

### 4.2 Comprehensive Security Regression Suites

| Test Suite | Purpose | Tests Passed | Status |
|---|---|---|---|
| `test_high_003_question_auth.py` | HIGH-03 Ownership & Integrity Verification | 14 / 14 | **PASS (100%)** |
| `test_sec_001_questions.py` | SEC-001 Question Leakage & Sanitization | 15 / 15 | **PASS (100%)** |
| `test_sec_002_passwords.py` | SEC-002 Password Hashing & Migration | 18 / 18 | **PASS (100%)** |
| `test_crit_001_attempts.py` | CRIT-01 Attempt Manipulation & Scoring | 16 / 16 | **PASS (100%)** |
| `test_crit_002_schedule_auth.py` | CRIT-02 Schedule Authorization & Session Hijacking | 24 / 24 | **PASS (100%)** |
| `test_crit_003_attempt_auth.py` | CRIT-03 Trainer Authorization Scoping & Reconduct Safety | 33 / 33 | **PASS (100%)** |
| `test_crit_004_profile_auth.py` | CRIT-04 Student Profile Tampering & Account Status | 38 / 38 | **PASS (100%)** |
| `test_crit_006_rate_limiting.py` | CRIT-06 Rate Limiting & Abuse Protection | 12 / 12 | **PASS (100%)** |
| **Total Automated Tests** | | **170 / 170** | **PASS (100%)** |

### 4.3 Frontend Build Verification

```
> lms--testing@0.0.0 build
> tsc -b && vite build

vite v8.2.1 building client environment for production...
✓ 3768 modules transformed.
dist/index.html                                     0.50 kB │ gzip:   0.31 kB
dist/assets/index-Deq01Hcg.css                    128.54 kB │ gzip:  18.72 kB
dist/assets/index-DzyUEkfp.js                   3,042.87 kB │ gzip: 802.02 kB
✓ built in 782ms
```

---

## 5. Database Integrity Checks

1. **Foreign Key Cascade Safety**:
   - `models.QuestionBank` defines `questions = relationship("Question", cascade="all, delete-orphan")`.
   - `models.Question` defines `options = relationship("QuestionOption", cascade="all, delete-orphan")`.
   - Before this remediation, deleting a bank would trigger SQLite/PostgreSQL foreign key exceptions or cascade deletes affecting `test_questions` and `answers`.
   - With explicit `HTTP 409 Conflict` guards checking `TestQuestion` and `Answer`, assessment templates and completed student exam records cannot be deleted or corrupted via question bank deletion.
2. **State Immutability on Unauthorized Requests**:
   - Tests verify that when Trainer A attempts an unauthorized delete against Trainer B's question bank or question, the database records remain unchanged.

---

## 6. Remaining Risks & Recommendations

1. **Frontend Error UX for 409 Conflicts**:
   - When a trainer attempts to delete a question or question bank that is actively assigned to an exam or contains student submissions, the backend now returns HTTP 409 with an explanatory message. Frontend toast notifications should display this message clearly (e.g., "Cannot delete: This question is part of an active assessment or past exam.").
2. **Soft Deletion / Archiving**:
   - Future enhancement: Introduce an `isArchived` flag for question banks and questions, allowing trainers to hide older questions without breaking foreign key references in historical attempts.

---

## Final Verdict
**`FIX VERIFIED`**
