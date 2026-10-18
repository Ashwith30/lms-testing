# CRIT-04 Investigation Report: Student Profile and Authorization-Field Tampering

**Status:** INVESTIGATION COMPLETE  
**Verdict:** `READY TO FIX`  
**Date:** October 14, 2026  
**Primary Focus:** `backend/routers/users_router.py`, `backend/routers/auth_router.py`, `backend/auth.py`, `backend/schemas.py`, `backend/models.py`, `frontend/src/pages/student/Profile.tsx`  

---

## 1. Executive Summary

An independent security investigation of the user profile and authentication lifecycle has confirmed critical vulnerabilities classified under **CRIT-04**:

1. **Student Batch and Department Self-Reassignment (Exam Gate Bypass):**
   Students can invoke `PUT /api/users/{user_id}` on their own account and supply arbitrary `batch` and `department` fields. The backend executes `get_or_create_batch` and updates `student_profile.primaryBatchId` without role authorization, allowing students to switch cohorts and bypass batch-restricted exam schedule gates (`Schedule.assignedBatch`) enforced by CRIT-02.
2. **Institutional Identifier (`studentNumber`) Self-Modification:**
   Students can arbitrarily modify their institutional student number (`studentId` / `studentNumber`), breaking audit integrity, exam attendance tracking, and alternate login identification.
3. **Database Pollution via Dynamic Creation:**
   Passing non-existent department or batch names in profile updates invokes `get_or_create_department` and `get_or_create_batch`, permanently inserting arbitrary client-supplied strings into the `departments` and `batches` tables.
4. **Complete Absence of Account Status Enforcement:**
   Neither `POST /api/auth/login` nor `get_current_user` in `backend/auth.py` validates `user.status`. Users with status `"suspended"`, `"inactive"`, or `"archived"` can successfully authenticate, receive valid JWTs, access all protected endpoints, and start/submit exams.
5. **Untyped Request Payloads:**
   `PUT /api/users/{user_id}` accepts an untyped dictionary `payload: dict` with no Pydantic schema validation or `extra="forbid"` protection.

---

## 2. Confirmed Vulnerabilities and Code Evidence

### VULN-01: Batch and Department Self-Reassignment (`users_router.py:48-100`)
- **File:** `backend/routers/users_router.py`
- **Function:** `update_user`
- **Code Evidence:**
  ```python
  @router.put("/{user_id}", response_model=schemas.User)
  def update_user(
      user_id: str,
      payload: dict,
      db: Session = Depends(get_db),
      current_user: models.User = Depends(get_current_user)
  ):
      if current_user.role not in ("admin", "institution") and current_user.id != user_id:
          raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
      ...
      if user.role == "student":
          ...
          dept_name = payload.get("department")
          batch_name = payload.get("batch")
          if dept_name:
              dept_id = get_or_create_department(db, dept_name)
              user.student_profile.departmentId = dept_id
              if batch_name:
                  batch_id = get_or_create_batch(db, batch_name, dept_id)
                  user.student_profile.primaryBatchId = batch_id
  ```
- **Analysis:**
  Because `current_user.id == user_id` evaluates to `True` for self-updates, any authenticated student is authorized to enter this block. When a student passes `{"department": "Computer Science", "batch": "TargetBatch"}`, their `primaryBatchId` is updated to `TargetBatch`.
- **Authorization Bypass:**
  In `backend/routers/attempts_router.py:165-175`:
  ```python
  assigned_batch = schedule.assignedBatch
  if assigned_batch and assigned_batch.lower() != "all":
      student_profile = current_user.student_profile
      user_batch_id = student_profile.primaryBatchId if student_profile else None
      user_batch_name = current_user.batch
      if user_batch_id != assigned_batch and (not user_batch_name or user_batch_name.lower() != assigned_batch.lower()):
          raise HTTPException(status_code=403, detail=f"Access denied: This assessment is scheduled for batch '{assigned_batch}'.")
  ```
  By changing their batch via `PUT /api/users/{id}`, the student circumvents the batch authorization gate and successfully starts exams intended exclusively for other cohorts.

### VULN-02: Institutional Identifier (`studentNumber`) Tampering (`users_router.py:87-88`)
- **File:** `backend/routers/users_router.py`
- **Code Evidence:**
  ```python
  if "studentId" in payload or "studentNumber" in payload:
      user.student_profile.studentNumber = payload.get("studentId") or payload.get("studentNumber")
  ```
- **Analysis:**
  `studentNumber` serves as an official academic credential and an alternate login identifier (`auth_router.py:55`). Permitting students to modify this field allows identity manipulation, collisions, and audit log distortion.

### VULN-03: Unrestricted Database Pollution (`helpers.py:5-34`)
- **File:** `backend/helpers.py`
- **Functions:** `get_or_create_department`, `get_or_create_batch`
- **Code Evidence:**
  ```python
  def get_or_create_batch(db: Session, batch_name: Optional[str], dept_id: Optional[str]) -> Optional[str]:
      ...
      new_id = models.generate_uuid("batch-")
      new_batch = models.Batch(id=new_id, name=batch_name, departmentId=dept_id)
      db.add(new_batch)
      db.commit()
      return new_id
  ```
- **Analysis:**
  Any student submitting random strings (e.g. `{"department": "Fake_Dept", "batch": "Fake_Batch"}`) causes permanent records to be created in the `departments` and `batches` tables.

### VULN-04: Missing Account Status Verification in Login (`auth_router.py:41-71`)
- **File:** `backend/routers/auth_router.py`
- **Function:** `login`
- **Code Evidence:**
  ```python
  @router.post("/login", response_model=schemas.LoginResponse)
  def login(creds: dict, db: Session = Depends(get_db)):
      ...
      if user and verify_password(password, user.password_hash):
          clear_failed_login(identifier)
          user.lastLoginAt = models.get_utc_now()
          db.commit()
          token = create_access_token({"sub": user.id, "role": user.role})
          return {"token": token, "user": user}
  ```
- **Analysis:**
  `login` verifies only password correctness. It completely ignores `user.status`. Users marked `"suspended"`, `"inactive"`, or `"archived"` receive an active JWT.

### VULN-05: Missing Account Status Verification in Session Dependency (`auth.py:67-93`)
- **File:** `backend/auth.py`
- **Function:** `get_current_user`
- **Code Evidence:**
  ```python
  def get_current_user(
      credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
      db: Session = Depends(get_db)
  ) -> models.User:
      ...
      user = db.query(models.User).filter(models.User.id == user_id).first()
      if user is None:
          raise credentials_exception
      return user
  ```
- **Analysis:**
  `get_current_user` verifies the token signature and that the user exists in the database. It does not check `user.status`. As a result, suspended accounts retain full access to all protected endpoints, including `POST /api/attempts` (starting exams), `POST /api/attempts/{id}/sync-answer`, and `GET /api/attempts`.

---

## 3. Accepted and Protected Field Audit

### Endpoint: `PUT /api/users/{user_id}`

| Field Name | Target Column | Handled In Code? | Current Student Self-Update | Security Implication | Recommended Policy |
|---|---|---|---|---|---|
| `name` | `StudentProfile.firstName`, `lastName` | Yes | Permitted | Display name update | **Allow for self-update** |
| `phoneNumber` | `StudentProfile.phoneNumber` | Yes | Permitted | Personal contact info | **Allow for self-update** |
| `email` | `User.email` | Yes | Permitted | Account credential | **Admin/Institution only** |
| `department` | `StudentProfile.departmentId` | Yes | Permitted | Academic tracking / permissions | **Admin/Institution only** |
| `batch` | `StudentProfile.primaryBatchId` | Yes | Permitted | **Bypasses CRIT-02 Exam Gates** | **Admin/Institution only** |
| `studentId` / `studentNumber` | `StudentProfile.studentNumber` | Yes | Permitted | Institutional credential | **Admin/Institution only** |
| `status` | `User.status` | Yes | Blocked (Role-checked) | Account suspension | **Admin/Institution only** |
| `role` | `User.role` | No | Ignored | Privilege escalation | **Immutable / Admin only** |
| `password` | N/A | No | Ignored (No op) | Frontend sends, backend ignores | **Dedicated password flow** |
| `specialization` | `TrainerProfile.specialization` | Yes | Trainer only | Trainer profile info | **Trainer self-update only** |
| `employeeId` | `TrainerProfile.employeeId` | Yes | Trainer only | Staff credential | **Admin/Institution only** |
| `institutionName` | `InstitutionProfile.institutionName` | Yes | Institution only | Institution info | **Admin/Institution only** |

---

## 4. Cross-User Modification Findings

Inspecting lines 54-56 of `backend/routers/users_router.py`:
```python
if current_user.role not in ("admin", "institution") and current_user.id != user_id:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
```
- **Student vs. Another Student:** Blocked (`HTTP 403 Forbidden`).
- **Student vs. Staff:** Blocked (`HTTP 403 Forbidden`).
- **Trainer vs. Any Student:** Blocked (`HTTP 403 Forbidden`). Trainers currently have no permissions to update student profiles through this endpoint.
- **Admin / Institution vs. Any User:** Allowed (`HTTP 200 OK`).

---

## 5. Controlled Reproduction Evidence

A reproduction script was executed in an isolated local SQLite environment:
`scratch/reproduce_crit04.py`

### Reproduction Output:
```
==================================================================
RUNNING CONTROLLED REPRODUCTION: CRIT-04
==================================================================

--- REPRODUCTION 1: Student Batch Reassignment Exam Gate Bypass ---
  Initial attempt to access Batch-Beta exam by Student 1: HTTP 403 (Student is not assigned to this scheduled test session.)
  Student 1 self-update of batch to 'Batch-Beta': HTTP 200
  [DB Verification] Student 1 primaryBatchId is now: batch-beta
  Post-tampering attempt to access Batch-Beta exam: HTTP 200 (Attempt ID: att-6a89f590-35d7-4fa3-92e9-3a78c3e64c15)
  => VULNERABILITY CONFIRMED: Student bypassed exam schedule batch gate via profile self-update!

--- REPRODUCTION 2: Student Self-Modification of Student ID ---
  Student 1 self-update of studentId to 'SPOOFED-99999': HTTP 200
  [DB Verification] Student 1 studentNumber is now: SPOOFED-99999
  => VULNERABILITY CONFIRMED: Student can arbitrarily alter institutional student ID!

--- REPRODUCTION 3: Database Pollution via Unrestricted Dynamic Creation ---
  Student 1 self-update with arbitrary dept and batch: HTTP 200
  [DB Verification] Polluted department created in DB: True (ID: dept-21a52727-c1ea-447f-ad67-1a1026f26852)
  [DB Verification] Polluted batch created in DB: True (ID: batch-1dad2a11-8ce3-4900-8636-e19e9fbe4ba7)
  => VULNERABILITY CONFIRMED: Arbitrary inputs create unwanted database records!

--- REPRODUCTION 4: Suspended User Login & JWT Issuance ---
  Suspended user login response: HTTP 200
  Suspended user received valid JWT token: eyJhbGciOiJIUzI1NiIsInR5c...
  => VULNERABILITY CONFIRMED: Suspended accounts can successfully log in and receive JWTs!

--- REPRODUCTION 5: Suspended User Protected Endpoint & Exam Access ---
  Suspended user accessing GET /api/users/user-suspended-c4: HTTP 200
  Suspended user accessing GET /api/attempts: HTTP 200
  Suspended user accessing GET /api/batches: HTTP 200
  => VULNERABILITY CONFIRMED: Suspended accounts can access all protected endpoints!

--- BASELINE CHECKS: Cross-User Modification ---
  Student 1 attempting cross-student update on Student 2: HTTP 403 (Access denied)
  Trainer attempting update on Student 1: HTTP 403 (Access denied)
  Admin updating Student 1 status to suspended: HTTP 200
  Admin update succeeded and verified in database.
```

---

## 6. Minimal Remediation Recommendations

### 1. Request Schema and Field Allowlists ([backend/schemas.py](file:///Users/akruthika/Documents/p-testing/backend/schemas.py))
- Introduce validated Pydantic update schemas:
  - `UserUpdateRequest` with `model_config = ConfigDict(extra="forbid")`.
  - Fields: `name: Optional[str]`, `phoneNumber: Optional[str]`, `email: Optional[EmailStr]`, `department: Optional[str]`, `batch: Optional[str]`, `studentId: Optional[str]`, `status: Optional[str]`, `specialization: Optional[str]`, `employeeId: Optional[str]`.

### 2. Role-Based Field Enforcement ([backend/routers/users_router.py](file:///Users/akruthika/Documents/p-testing/backend/routers/users_router.py))
- In `update_user`:
  - If `current_user.role == "student"`:
    - Permit updates **only** to `name` and `phoneNumber`.
    - If `batch`, `department`, `studentId`, `email`, `role`, or `status` are present in payload, reject with `HTTP 403 Forbidden` (`detail="Students are not authorized to modify academic or account authorization fields."`).
  - If `current_user.role == "trainer"` updating self:
    - Permit updates to `name`, `phoneNumber`, and `specialization`. Reject `employeeId`, `email`, `role`, `status`.
  - If `current_user.role in ("admin", "institution")`:
    - Permit administrative updates (`batch`, `department`, `studentId`, `status`, `email`).
    - When updating `batch` or `department`, look up **existing** records only. Do not invoke `get_or_create` to prevent database pollution.

### 3. Account Status Enforcement ([backend/auth.py](file:///Users/akruthika/Documents/p-testing/backend/auth.py) & [backend/routers/auth_router.py](file:///Users/akruthika/Documents/p-testing/backend/routers/auth_router.py))
- **`POST /api/auth/login`**:
  - Before generating a JWT, verify `if user.status and user.status.lower() != "active":`
  - Raise `HTTP 403 Forbidden` with detail `"Account is inactive or suspended. Please contact your administrator."`.
- **`get_current_user` in `backend/auth.py`**:
  - After retrieving `user = db.query(models.User).filter(models.User.id == user_id).first()`:
  - Verify `if user.status and user.status.lower() != "active":`
  - Raise `HTTP 403 Forbidden` with detail `"Account is inactive or suspended."`.
  - This single gate immediately secures all authenticated endpoints (attempts, tests, analytics, questions) against suspended tokens.

### 4. Frontend Profile View Synchronization ([frontend/src/pages/student/Profile.tsx](file:///Users/akruthika/Documents/p-testing/frontend/src/pages/student/Profile.tsx))
- In `frontend/src/pages/student/Profile.tsx`:
  - Mark `department` and `batch` as disabled / read-only fields during edit mode with explanatory labels (`Academic Branch (Managed by Institution)`, `Graduation Batch (Managed by Institution)`).
  - Submit only `name` and `phoneNumber` in the profile update payload.

---

## 7. Regression Tests and Compatibility Considerations

### Required Test Coverage
1. **Student Self-Update Boundaries:**
   - Updating `name` and `phoneNumber` succeeds (200 OK).
   - Attempting to update `batch` is rejected (403 Forbidden).
   - Attempting to update `department` is rejected (403 Forbidden).
   - Attempting to update `studentId` is rejected (403 Forbidden).
   - Attempting to update `email` is rejected (403 Forbidden).
   - Attempting to update `status` is rejected (403 Forbidden).
   - Unknown/arbitrary payload fields rejected by Pydantic (422 Unprocessable Entity).
2. **Account Status Gates:**
   - Active user login succeeds (200 OK).
   - Suspended user login rejected (403 Forbidden).
   - Inactive user login rejected (403 Forbidden).
   - Token issued to suspended user rejected across protected endpoints (403 Forbidden).
   - Exam start (`POST /api/attempts`) blocked for suspended accounts (403 Forbidden).
3. **Admin Administrative Updates:**
   - Admin can update batch, department, studentId, and status for a student (200 OK).
   - Target batch/department must exist in database.
4. **Preservation of Existing Protections:**
   - Run CRIT-01, CRIT-02, CRIT-03, SEC-001, and SEC-002 test suites to confirm no regressions.

---

## Final Investigation Verdict

All vulnerabilities have been reproduced and confirmed with database-backed evidence. The remediation path is minimal, strictly scoped, and backward-compatible with legitimate user workflows.

**VERDICT: `READY TO FIX`**
