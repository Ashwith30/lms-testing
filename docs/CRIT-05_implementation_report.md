# CRIT-05 Implementation Report: Dependency Security Remediation

**Status**: FIX VERIFIED  
**Date**: 2026-10-16  
**Primary Reference**: `CRIT-05_investigation_report.md`  
**Target Vulnerabilities**: Supply-chain vulnerabilities across frontend (`axios`, `xlsx`, `source-map-js`, `sprintf-js`) and backend (`PyJWT`, `urllib3`, `Mako`, `pip`).

---

## 1. Executive Summary

Remediation for **CRIT-05** has been executed in controlled groups, addressing all direct and transitive vulnerabilities with targeted, non-breaking upgrades:
- **`axios` (Frontend Direct)**: Upgraded from `1.19.0` to `1.20.0`, eliminating 12 advisories including prototype pollution gadgets and ReDoS vulnerabilities.
- **`xlsx` (Frontend Direct)**: Upgraded from `0.18.5` to official SheetJS `0.20.3` (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`), resolving both Prototype Pollution (`GHSA-4r6h-8v6p-xvw6`) and ReDoS (`GHSA-5pgg-2g8v-p4x9`). This approach eliminated 8 legacy transitive packages (`wmf`, `word`, `ssf`, `frac`, `crc-32`, `codepage`, `cfb`, `adler-32`) while avoiding the introduction of 176 legacy Node.js dependencies that an `exceljs` migration would have incurred.
- **`source-map-js` (Frontend Transitive Dev)**: Upgraded from `1.2.1` to `1.2.2`, resolving the high-severity ReDoS / event-loop DoS (`GHSA-68fv-2mgg-jv7q`) in the PostCSS/Tailwind build toolchain.
- **`sprintf-js` (Frontend Transitive Unused)**: Evaluated carefully without running destructive `npm audit fix --force` (which would have forced a downgrade of `@tensorflow/tfjs` to `2.1.0` and broken proctoring/React 19). Traced and verified that neither `argparse` nor `sprintf-js` is imported by application code or bundled by Vite into `frontend/dist/`.
- **`PyJWT` (Backend Direct)**: Upgraded from `2.13.0` to `2.15.1` in `backend/requirements.txt` and virtualenv, resolving 28 advisories including the unauthenticated RecursionError DoS (`CVE-2026-102265` / `GHSA-8wjv-2p76-3863`). Compatibility with HMAC-SHA256 confirmed via all authentication regression suites.
- **`urllib3` (Backend Transitive Test-Only)**: Upgraded from `2.7.0` to `2.8.0`, resolving proxy bypass and chunked response DoS advisories (`CVE-2026-97687`, `CVE-2026-97688`, `CVE-2026-97689`).
- **`Mako` (Backend Transitive Migration-Only)**: Upgraded from `1.4.1` to `1.4.3`, resolving Windows drive-letter path traversal (`CVE-2026-102991`).
- **`pip` (Backend Tooling)**: Upgraded from `25.3` to `26.2.1` in the virtual environment.

All frontend builds, spreadsheet parser tests, backend authentication suites, and full security regression suites passed with 100% success.

---

## 2. Before-and-After Dependency Versions

| Component | Package | Before Version | After Version | Type | Advisories Addressed |
|---|---|---|---|---|---|
| **Frontend** | `axios` | `1.19.0` | `1.20.0` | Direct (Prod) | 12 advisories (`GHSA-vh66-26gq-q6x8`, `GHSA-9fr6-4gfg-395g`, `GHSA-c29m-xwm3-cm6r`, `GHSA-mghh-pgcx-3jjj`, `GHSA-x97p-jq2g-jp4f`, `GHSA-3pq3-5fj3-cg6v`, `GHSA-542g-h47m-68v8`, `GHSA-j8rh-479h-cp32`, `GHSA-4hqw-qxg8-jxx2`, `GHSA-m8m8-qj5v-23w3`, `GHSA-44g4-m2mj-wpvx`, `GHSA-r4gj-5m52-g5wh`) |
| **Frontend** | `xlsx` | `0.18.5` | `0.20.3` (SheetJS CDN) | Direct (Prod) | `GHSA-4r6h-8v6p-xvw6` (Prototype Pollution, CVSS 7.8)<br>`GHSA-5pgg-2g8v-p4x9` (ReDoS, CVSS 7.5) |
| **Frontend** | `source-map-js` | `1.2.1` | `1.2.2` | Transitive (Dev) | `GHSA-68fv-2mgg-jv7q` (Event loop DoS, CVSS 7.5) |
| **Frontend** | `sprintf-js` | `1.0.3` | `1.0.3` (Mitigated) | Transitive (Unused) | `GHSA-hp3w-g68c-fv3c` (Unused tfjs CLI utility; unbundled) |
| **Backend** | `PyJWT` | `2.13.0` | `2.15.1` | Direct (Prod) | 28 advisories including `CVE-2026-102265`, `CVE-2026-101917`, `CVE-2026-101918`, `CVE-2026-102266` |
| **Backend** | `urllib3` | `2.7.0` | `2.8.0` | Transitive (Test) | `CVE-2026-97687`, `CVE-2026-97688`, `CVE-2026-97689` |
| **Backend** | `Mako` | `1.4.1` | `1.4.3` | Transitive (Migration) | `CVE-2026-102991` (`GHSA-5639-2j2p-m4mx`) |
| **Backend** | `pip` | `25.3` | `26.2.1` | Tooling | `CVE-2026-3219`, `CVE-2026-1703`, `CVE-2026-6357`, `CVE-2026-13346`, `CVE-2026-8643` |

---

## 3. Implementation Details & Mitigation Rationale

### 3.1 Group A — Direct Dependencies

#### Axios (`^1.20.0`)
- **Modification**: `frontend/package.json` updated to `"axios": "^1.20.0"`. Lockfile updated via `npm install`.
- **Evidence**: `npm audit` confirms all 12 Axios CVEs and prototype pollution warnings are completely resolved.
- **Compatibility**: Verified zero regressions in `api.ts` request interceptors, JWT headers, and frontend builds.

#### PyJWT (`>=2.15.1`)
- **Modification**: `backend/requirements.txt` updated to `PyJWT>=2.15.1`. Installed in `backend/.venv` via pip.
- **Evidence**: OSV database scan confirms 0 vulnerabilities for `PyJWT==2.15.1` (previously 28).
- **Compatibility**: Verified against `test_sec_002_passwords.py` and `test_crit_004_profile_auth.py`. Tokens encoded with HMAC-SHA256 (`HS256`) decode with 100% fidelity.

#### SheetJS XLSX (`0.20.3` via Official CDN)
- **Evaluation & Choice**:
  - Investigated migrating to `exceljs@4.4.0`: ExcelJS is designed primarily for Node.js and introduces **176 legacy transitive packages** (including unmaintained libraries like `rimraf 2.7.1`, `mkdirp 0.5.6`, `traverse 0.3.10`, `fstream 1.0.12`). This would have severely degraded the supply-chain security of the frontend.
  - The official SheetJS CDN release (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`) is standalone, eliminated 8 separate sub-packages, and resolved both `GHSA-4r6h-8v6p-xvw6` and `GHSA-5pgg-2g8v-p4x9`.
- **Modification**: `frontend/package.json` updated to `"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"`.
- **Testing**: Dedicated spreadsheet test suite verified normal workbooks, malformed schemas, and prototype pollution injection safety.

### 3.2 Group B — Transitive Dependencies

#### Source Map JS (`1.2.2`)
- **Modification**: Resolved in `frontend/package-lock.json` via `npm update source-map-js`.
- **Evidence**: `npm ls source-map-js` verifies deduplication to `1.2.2`. High-severity vulnerability `GHSA-68fv-2mgg-jv7q` completely resolved.

#### Sprintf-js / Argparse Analysis & Defensible Mitigation
- **Advisory**: `GHSA-hp3w-g68c-fv3c` affects all `sprintf-js<=1.1.3` (unbounded precision specifier DoS). Upstream has released no patch.
- **Rejection of Force Downgrade**: Running `npm audit fix --force` would downgrade `@tensorflow/tfjs` from `4.22.0` to `2.1.0`. This would break React 19 compatibility, break WebGL backend initialization, and disable the `@tensorflow-models/coco-ssd` webcam proctoring engine.
- **Verified Mitigation**:
  - Traced dependency graph: `@tensorflow/tfjs@4.22.0` -> `argparse@1.0.10` -> `sprintf-js@1.0.3`.
  - Inspected `@tensorflow/tfjs` source code: `argparse` is an unused CLI dependency (`bin/tfjs-custom-module`) and is never imported in `@tensorflow/tfjs` runtime modules (`dist/index.js`, `dist/tf.min.js`).
  - Inspected production bundle (`frontend/dist/`): Verified via grep search that neither `argparse` nor `sprintf` is present in the compiled JavaScript bundle.
  - **Verdict**: Accepted build-time artifact limitation with zero runtime attack surface.

#### Urllib3 (`>=2.8.0`)
- **Modification**: Pinned `urllib3>=2.8.0` in `backend/requirements.txt`. Installed in `backend/.venv`.
- **Evidence**: OSV scan confirms 0 advisories for `urllib3==2.8.0` (previously 6). Compatible with `requests==2.34.2`.

#### Mako (`>=1.4.3`)
- **Modification**: Pinned `Mako>=1.4.3` in `backend/requirements.txt`. Installed in `backend/.venv`.
- **Evidence**: OSV scan confirms 0 advisories for `Mako==1.4.3`. Compatible with `alembic==1.19.2`.

#### Pip (`26.2.1`)
- **Modification**: Upgraded in virtual environment via `pip install --upgrade pip`.
- **Evidence**: OSV scan confirms 0 advisories for `pip==26.2.1` (previously 10).

---

## 4. Manifests and Lockfiles Changed

1. `frontend/package.json`:
   - Updated `"axios": "^1.20.0"`
   - Updated `"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"`
2. `frontend/package-lock.json`:
   - Regenerated with upgraded `axios@1.20.0`, `xlsx@0.20.3`, and `source-map-js@1.2.2`.
3. `backend/requirements.txt`:
   - Updated `PyJWT>=2.15.1`
   - Added `Mako>=1.4.3`
   - Added `urllib3>=2.8.0`
4. `backend/.venv` (Python Virtual Environment):
   - Installed `PyJWT 2.15.1`, `urllib3 2.8.0`, `Mako 1.4.3`, `pip 26.2.1`.

---

## 5. Test Results and Security Verification

### 5.1 Verification Test Summary

| Test Suite | Focus Area | Command | Result |
|---|---|---|---|
| **Python OSV Audit** | 30 virtualenv packages against OSV database | `backend/.venv/bin/python scratch/audit_python_deps.py` | **100% Clean (0 advisories)** |
| **npm Audit** | Frontend package tree audit | `npm audit` | **0 High, 0 Critical** (Only unbundled sprintf-js remains) |
| **Frontend Compilation & Build** | TypeScript checking & Vite production bundle | `npm run build` | **PASS (Exit 0, 750ms)** |
| **Spreadsheet Parser Suite** | Normal, malformed & prototype-pollution workbooks | `node scratch/test_excel_parser.mjs` | **12/12 PASS (100%)** |
| **SEC-002 Regression** | Bcrypt passwords, migrations, PyJWT auth | `backend/.venv/bin/python test_sec_002_passwords.py` | **PASS (100%)** |
| **CRIT-04 Regression** | Profile validation, account status enforcement | `backend/.venv/bin/python test_crit_004_profile_auth.py` | **38/38 PASS (100%)** |
| **CRIT-01 Regression** | Attempt score & violation immutability | `backend/.venv/bin/python test_crit_001_attempts.py` | **16/16 PASS (100%)** |
| **CRIT-02 Regression** | Schedule validation & attempt gates | `backend/.venv/bin/python test_crit_002_schedule_auth.py` | **24/24 PASS (100%)** |
| **CRIT-03 Regression** | Trainer authorization & deletion integrity | `backend/.venv/bin/python test_crit_003_attempt_auth.py` | **33/33 PASS (100%)** |
| **SEC-001 Regression** | Exam answer masking & question endpoints | `backend/.venv/bin/python test_sec_001_questions.py` | **PASS (100%)** |
| **Alembic Migration Suite** | Schema upgrades with updated Mako | `backend/.venv/bin/python backend/test_migration_local.py` | **3/3 Scenarios PASS (100%)** |

### 5.2 Tests That Could Not Run
None. All frontend and backend automated test suites were executed successfully against local, isolated environments.

---

## 6. Remaining Vulnerabilities and Accepted Risks

1. **`sprintf-js@1.0.3` via `@tensorflow/tfjs`**:
   - **Severity**: Moderate (`GHSA-hp3w-g68c-fv3c`).
   - **Reason for Acceptance**: No patched version exists upstream (`<=1.1.3` affected). Subdependency of `argparse@1.0.10`, which is only referenced by `@tensorflow/tfjs` CLI build tools. It is completely unreferenced by `@tensorflow/tfjs` browser runtime modules and is not present in the Vite client production bundle (`frontend/dist/`).
   - **Safety**: Proctoring engine and TensorFlow.js remain fully functional on modern React 19 without risk of runtime exploitation.

---

## 7. Conclusion

All actionable, reachable, and high-severity supply-chain vulnerabilities in `axios`, `xlsx`, `source-map-js`, `PyJWT`, `urllib3`, and `Mako` have been resolved with verified, safe, and compatible releases. Full regression testing confirms zero degradation across all security protections (CRIT-01, CRIT-02, CRIT-03, CRIT-04, SEC-001, SEC-002).

**Verdict**: `FIX VERIFIED`
