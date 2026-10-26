"""
Master Regression Test Runner for LMS Testing
Executes all security, lifecycle, and authorization suites in sequence.
"""
import os
import sys
import subprocess
import time

SUITES = [
    ("HIGH-06 Analytics Memory Optimization", "test_high_006_analytics.py"),
    ("CRIT-01 Attempt Immutability & Server Scoring", "test_crit_001_attempts.py"),
    ("CRIT-02 Schedule Authorization & Start Gates", "test_crit_002_schedule_auth.py"),
    ("CRIT-03 Trainer Authorization Scoping", "test_crit_003_attempt_auth.py"),
    ("CRIT-04 Profile Authorization & Account Status", "test_crit_004_profile_auth.py"),
    ("CRIT-06 Multi-Worker Rate Limiting", "test_crit_006_rate_limiting.py"),
    ("HIGH-02 Option-Based MCQ Server Grading", "test_high_002_grading.py"),
    ("HIGH-03 Question Bank & Question Ownership", "test_high_003_question_auth.py"),
    ("HIGH-05 Student Materials Server Filtering", "test_high_005_materials_auth.py"),
    ("HIGH-07 Production CORS Hardening", "test_high_007_cors.py"),
    ("MED-03 & MED-06 Registration Security", "test_med_003_006_registration.py"),
    ("MED-05 Snapshot Offloading & Proctoring Storage", "test_med_005_snapshots.py"),
    ("INFO-01 Configurable JWT Lifespan & Token Expiry", "test_info_001_jwt_lifespan.py"),
    ("SEC-001 Question Protection & Answer Masking", "test_sec_001_questions.py"),
    ("SEC-002 Password Encryption & Migration", "test_sec_002_passwords.py"),
    ("MULTI-TENANCY Multi-College Data Isolation", "test_multi_tenancy_isolation.py"),
    ("BATCH-NOTIFICATIONS Targeted Dispatch & Filtering", "test_batch_notifications.py"),
]

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(base_dir, ".."))
    
    python_bin = sys.executable
    venv_candidates = [
        os.path.join(project_root, "backend", "venv", "Scripts", "python.exe"),
        os.path.join(project_root, "backend", ".venv", "Scripts", "python.exe"),
        os.path.join(project_root, "backend", ".venv", "bin", "python3"),
        os.path.join(project_root, "backend", "venv", "bin", "python3"),
    ]
    for cand in venv_candidates:
        if os.path.exists(cand):
            python_bin = cand
            break

    print("=" * 70)
    print(" LMS MASTER REGRESSION TEST RUNNER")
    print(f" Python Interpreter: {python_bin}")
    print(f" Test Suites: {len(SUITES)}")
    print("=" * 70)

    results = []
    total_start = time.time()

    for name, script in SUITES:
        script_path = os.path.join(base_dir, script)
        if not os.path.exists(script_path):
            results.append((name, "SKIPPED", "File not found", 0.0))
            continue

        print(f"\n[RUNNING] {name} ({script})...", flush=True)
        t0 = time.time()
        proc = subprocess.run(
            [python_bin, script_path],
            cwd=project_root,
            capture_output=True,
            text=True
        )
        elapsed = time.time() - t0

        if proc.returncode == 0:
            print(f"  -> PASSED ({elapsed:.2f}s)", flush=True)
            results.append((name, "PASSED", "", elapsed))
        else:
            print(f"  -> FAILED (exit {proc.returncode})", flush=True)
            error_tail = "\n".join(proc.stderr.splitlines()[-5:]) or "\n".join(proc.stdout.splitlines()[-5:])
            results.append((name, "FAILED", error_tail, elapsed))

    total_elapsed = time.time() - total_start
    print("\n" + "=" * 70)
    print(" FINAL REGRESSION RESULTS SUMMARY")
    print("=" * 70)
    
    all_passed = True
    for name, status, err, elapsed in results:
        status_str = f"[{status}]".ljust(10)
        print(f"{status_str} {name.ljust(45)} ({elapsed:.2f}s)")
        if status != "PASSED":
            all_passed = False
            if err:
                print(f"           Error: {err.strip()}")

    print("-" * 70)
    total_passed = sum(1 for _, s, _, _ in results if s == "PASSED")
    print(f"Total: {len(results)} | Passed: {total_passed} | Failed: {len(results) - total_passed} | Duration: {total_elapsed:.2f}s")
    print("=" * 70)

    if not all_passed:
        sys.exit(1)

if __name__ == "__main__":
    main()
