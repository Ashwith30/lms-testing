# HIGH-02 Implementation Report: Option-Based MCQ Silent Zero-Grading Remediation

**Status**: `FIX VERIFIED`  
**Date**: 2026-10-17  
**Finding ID**: `HIGH-02` (Reference: `security_audit_master_tracker.md`, `comprehensive_code_audit.md`)  
**Severity**: High  
**Vulnerability Type**: Assessment Grading Defect / Logic Error / Inaccurate Evaluation  

---

## 1. Executive Summary

In `backend/routers/attempts_router.py`, the scoring loop in `POST /api/attempts/{id}/submit` contained a logic defect around line 598. The check for question options (`elif q.question_options:`) was nested entirely inside the condition `if selected_val and q.correctAnswer:`. Consequently, whenever `q.correctAnswer` was `NULL` or empty—the standard data representation for question banks where answer keys are defined via `QuestionOption.isCorrect = True`—the option check was bypassed entirely, silently awarding 0 marks (0.0%) to students even when they selected the correct answer. In addition, the check only compared string equality against `opt_row.optionText`, failing to recognize modern frontend submissions that pass option database IDs (`opt_row.id`), option letters (`A`, `B`, `C`, `D`), or option indices.

Remediation has introduced a dedicated server-side grading evaluation helper, `evaluate_answer_correctness`, in [`backend/routers/attempts_router.py`](file:///Users/akruthika/Documents/p-testing/backend/routers/attempts_router.py). The scoring loop now cleanly resolves correctness across option IDs, letters, texts, and order indices without requiring `correctAnswer` to be populated in the question root. Furthermore, malformed and unkeyed questions are safely handled without granting unintended marks, client-supplied scores are strictly discarded, and [`models.Question.correctAnswer`](file:///Users/akruthika/Documents/p-testing/backend/models.py) now safely falls back to `None` instead of falsely returning `"A"`. The fix has been verified with a 12-test dedicated test suite alongside 186 passing security regression tests.

---

## 2. Changed Files & Scope of Remediation

### 2.1 Backend Changes

1. **[`backend/routers/attempts_router.py`](file:///Users/akruthika/Documents/p-testing/backend/routers/attempts_router.py)**:
   - Implemented `evaluate_answer_correctness(question, selected_raw)`:
     - Handles both JSON string lists (e.g. `'["opt-1"]'`), plain strings, and raw Python lists.
     - Safely returns `False` for unanswered questions (`None`, `""`, `[]`, `"null"`, `"None"`).
     - Resolves correct options from `question.question_options` where `isCorrect == True`. If no options are marked `isCorrect` but `question.correctAnswer` is defined, maps `correctAnswer` to the matching option.
     - **Option ID matching**: Exact match against `opt.id`.
     - **Option letter matching**: Case-insensitive match against option position letter (`A`, `B`, `C`, `D`).
     - **Option text matching**: Case-insensitive match against `opt.optionText`.
     - **Option index matching**: Match against `opt.orderIndex` or list index.
     - **Multi-select support**: Validates that all correct options and no incorrect options are selected.
     - Direct fallback to `question.correctAnswer` for standalone questions.
   - Refactored `submit_attempt` scoring loop:
     - Replaced fragile nested `if selected_val and q.correctAnswer:` block with `evaluate_answer_correctness(q, ans.selectedOptionIds)`.
     - Preserves strict server-side grading; any client-supplied `score`, `percentage`, or `isCorrect` fields are completely ignored.
     - Unanswered questions are included in `total` marks but receive 0 marks.

2. **[`backend/models.py`](file:///Users/akruthika/Documents/p-testing/backend/models.py)**:
   - Modified `@property def correctAnswer(self)` on `Question`:
     - Returns `letters[i]` for the option where `opt.isCorrect == True`.
     - Safely falls back to `None` (previously returned `"A"`, which caused unkeyed questions with no correct option to falsely award marks for guessing "A").

3. **[`test_high_002_grading.py`](file:///Users/akruthika/Documents/p-testing/test_high_002_grading.py)**:
   - Created standalone comprehensive automated test suite covering 12 grading and evaluation scenarios.

---

## 3. Answer Matching Logic & Supported Formats

| Student Submission Format | Example Input | Resolution Against `QuestionOption` | Result |
|:---|:---|:---|:---:|
| **Option Letter** | `"B"` or `["B"]` | Matches `letters[opt.orderIndex]` where `opt.isCorrect == True` | **Marked Correct** |
| **Option ID** | `"opt-h2-q1-b"` or `["opt-h2-q1-b"]` | Matches `opt.id` where `opt.isCorrect == True` | **Marked Correct** |
| **Option Text** | `"Paris"` or `["Paris"]` | Matches `opt.optionText` where `opt.isCorrect == True` | **Marked Correct** |
| **Option Order Index** | `"1"` or `1` | Matches `opt.orderIndex` where `opt.isCorrect == True` | **Marked Correct** |
| **Multi-Select Array** | `["opt-1", "opt-3"]` | Matches all `opt.isCorrect == True` options with 0 wrong options | **Marked Correct** |
| **Incorrect Letter/ID** | `"A"` or `"opt-wrong"` | Matches an option where `opt.isCorrect == False` | **0 Marks** |
| **Unanswered / Empty** | `None`, `[]`, `""`, `"null"` | Identified as unanswered | **0 Marks** |
| **Unkeyed Question** | Any selection | No option has `isCorrect == True`; `correctAnswer` is `None` | **0 Marks** |
| **Client-Supplied Score** | `{"score": 100.0}` | Root tampering rejected (422); inner marks ignored | **Server-Graded** |

---

## 4. Test Verification & Results

### 4.1 HIGH-02 Dedicated Test Suite (`test_high_002_grading.py`)

```text
==================================================================
RUNNING COMPREHENSIVE HIGH-02 VERIFICATION TEST SUITE
==================================================================

--- SECTION 1: Option-Based MCQ Correct Answer Formats ---
  [1/12] Option letters ('B', 'C') correctly scored: 5.0 / 5.0 (100.0%)
  [2/12] Option IDs ('opt-h2-q1-b', 'opt-h2-q2-c') correctly scored: 5.0 / 5.0 (100.0%)
  [3/12] Option Text values ('4', 'Paris') correctly scored: 5.0 / 5.0 (100.0%)
  [4/12] Option orderIndex ('1', '2') correctly scored: 5.0 / 5.0 (100.0%)

--- SECTION 2: Incorrect Answers & Zero-Mark Enforcement ---
  [5/12] Incorrect Option letters ('A', 'A') strictly receive 0.0 marks (0.0%)
  [6/12] Incorrect Option IDs strictly receive 0.0 marks (0.0%)

--- SECTION 3: Unanswered, Partial, and Malformed Submissions ---
  [7/12] Unanswered questions included in total marks but receive 0: 2.0 / 5.0 (40.0%)
  [8/12] Malformed selection values (None, 'null') safely evaluate to False: 0.0 marks
  [9/12] Malformed question with no correct answer never awards unintended marks

--- SECTION 4: Multi-Select & Server-Side Security ---
  [10/12] Multi-select question scored correctly when all correct options selected (4.0 / 5.0)
  [11/12] Client-supplied fake score and isCorrect flags strictly rejected/ignored; server-graded 0.0

--- SECTION 5: Post-Submission Review Verification ---
  [12/12] Post-submission review confirms accurate server-graded isCorrect and correct answers

==================================================================
ALL 12/12 HIGH-02 VERIFICATION TESTS PASSED (100%)!
==================================================================
```

### 4.2 Security Regression Suite Results

| Test Suite | Coverage Area | Tests Passed | Status |
|:---|:---|:---:|:---:|
| `test_high_002_grading.py` | HIGH-02 Option-Based MCQ Grading | **12 / 12** | **PASSED (100%)** |
| `test_high_005_materials_auth.py` | HIGH-05 Student Materials Access Control | **16 / 16** | **PASSED (100%)** |
| `test_high_003_question_auth.py` | HIGH-03 Question Bank & Question Ownership | **14 / 14** | **PASSED (100%)** |
| `test_sec_001_questions.py` | SEC-001 Question Leakage & Sanitization | **15 / 15** | **PASSED (100%)** |
| `test_sec_002_passwords.py` | SEC-002 Password Hashing & Migration | **18 / 18** | **PASSED (100%)** |
| `test_crit_001_attempts.py` | CRIT-01 Student Tampering & Server Scoring | **16 / 16** | **PASSED (100%)** |
| `test_crit_002_schedule_auth.py` | CRIT-02 Schedule Authorization & Injection | **24 / 24** | **PASSED (100%)** |
| `test_crit_003_attempt_auth.py` | CRIT-03 Trainer Authorization Scoping | **33 / 33** | **PASSED (100%)** |
| `test_crit_004_profile_auth.py` | CRIT-04 Profile Fields & Account Status | **38 / 38** | **PASSED (100%)** |
| `test_crit_006_rate_limiting.py` | CRIT-06 Rate Limiting & Abuse Defense | **12 / 12** | **PASSED (100%)** |
| **Total Automated Tests** | | **198 / 198** | **PASSED (100%)** |

Frontend production build (`npm run build` in `frontend/`) compiled in **765ms** with 0 errors.

---

## 5. Remaining Limitations & Recommendations

1. **Partial Credit on Multi-Select**:
   - The current grading model uses all-or-nothing evaluation for multi-select questions. If partial credit is required in the future (e.g., awarding half marks for selecting 1 of 2 correct options), a fractional scoring formula should be added under an assessment setting flag (`allowPartialCredit: true`).
2. **Subjective / Free-Text Questions**:
   - Subjective questions (`type == "SUBJECTIVE"`) continue to require trainer manual review and grading via `PUT /api/attempts/{id}`.

---

## Final Verdict
**`FIX VERIFIED`**
