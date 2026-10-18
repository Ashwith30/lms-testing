"""
Automated Verification Test Suite for HIGH-07:
Production CORS Configuration, Explicit Origin Whitelisting, Credential Preservation, and Wildcard Exclusion
"""
import os
import sys
import time
import socket
import threading
import requests
import uvicorn

# Setup backend import path
_curr_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(_curr_dir, "backend") if os.path.exists(os.path.join(_curr_dir, "backend")) else os.path.abspath(os.path.join(_curr_dir, "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app, parse_cors_origins, DEFAULT_CORS_ORIGINS

def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def run_tests():
    print("==================================================================")
    print("RUNNING COMPREHENSIVE HIGH-07 CORS VERIFICATION TEST SUITE")
    print("==================================================================")

    # -------------------------------------------------------------
    # SECTION 1: Unit Testing of parse_cors_origins logic
    # -------------------------------------------------------------
    print("\n--- SECTION 1: CORS Origin Parsing & Normalization ---")

    # 1.1 Default fallback when empty string
    def_origins = parse_cors_origins("")
    assert "https://lms-frontend.onrender.com" in def_origins
    assert "http://localhost:5173" in def_origins
    assert "*" not in def_origins
    print("  [1/16] Empty string input returns safe defaults with production and dev origins")

    # 1.2 Whitespace and trailing slash normalization
    custom_raw = "  https://my-lms.edu/ , http://localhost:5173/ , https://portal.school.com  "
    custom_parsed = parse_cors_origins(custom_raw)
    assert custom_parsed == ["https://my-lms.edu", "http://localhost:5173", "https://portal.school.com"]
    print("  [2/16] Whitespace and trailing slashes correctly trimmed and normalized")

    # 1.3 Wildcard exclusion invariant
    wildcard_input = "*, https://lms-frontend.onrender.com, http://localhost:5173"
    sanitized_origins = parse_cors_origins(wildcard_input)
    assert "*" not in sanitized_origins
    assert sanitized_origins == ["https://lms-frontend.onrender.com", "http://localhost:5173"]
    print("  [3/16] Wildcard '*' strictly stripped when paired with other origins")

    # 1.4 Sole wildcard input falls back to safe explicit defaults
    only_wildcard = "*"
    fallback_origins = parse_cors_origins(only_wildcard)
    assert "*" not in fallback_origins
    assert "https://lms-frontend.onrender.com" in fallback_origins
    print("  [4/16] Sole wildcard '*' input safely falls back to explicit defaults without wildcard")

    # 1.5 Duplicate deduplication
    dup_input = "http://localhost:5173, http://localhost:5173/, https://lms-frontend.onrender.com"
    deduped = parse_cors_origins(dup_input)
    assert deduped.count("http://localhost:5173") == 1
    assert deduped.count("https://lms-frontend.onrender.com") == 1
    print("  [5/16] Duplicate origins safely deduplicated")

    # -------------------------------------------------------------
    # SECTION 2: Configuration Validation in render.yaml
    # -------------------------------------------------------------
    print("\n--- SECTION 2: Render Production Infrastructure Configuration ---")
    curr_dir = os.path.dirname(os.path.abspath(__file__))
    render_yaml_path = (
        os.path.join(curr_dir, "render.yaml")
        if os.path.exists(os.path.join(curr_dir, "render.yaml"))
        else os.path.abspath(os.path.join(curr_dir, "..", "render.yaml"))
    )
    with open(render_yaml_path, "r", encoding="utf-8") as f:
        render_content = f.read()

    # Find CORS_ORIGINS block in render.yaml
    cors_val = None
    lines = render_content.splitlines()
    for i, line in enumerate(lines):
        if "key: CORS_ORIGINS" in line and i + 1 < len(lines):
            next_line = lines[i + 1]
            if "value:" in next_line:
                cors_val = next_line.split("value:", 1)[1].strip().strip('"').strip("'")
                break

    assert cors_val is not None, "CORS_ORIGINS not found in render.yaml"
    assert "*" not in [o.strip() for o in cors_val.split(",")], "render.yaml MUST NOT contain wildcard '*' in CORS_ORIGINS!"
    assert "https://lms-frontend.onrender.com" in cors_val, "render.yaml MUST include https://lms-frontend.onrender.com"
    assert "http://localhost:5173" in cors_val, "render.yaml MUST include local dev origin http://localhost:5173"
    print(f"  [6/16] render.yaml verified: wildcard removed; explicit production & dev origins configured ({cors_val[:40]}...)")

    # -------------------------------------------------------------
    # SECTION 3: Live HTTP Preflight & CORS Middleware Testing
    # -------------------------------------------------------------
    print("\n--- SECTION 3: Live Preflight (OPTIONS) Requests ---")
    port = find_free_port()
    server_config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="error")
    server = uvicorn.Server(server_config)
    server_thread = threading.Thread(target=server.run, daemon=True)
    server_thread.start()
    time.sleep(1.2)

    base_url = f"http://127.0.0.1:{port}"

    try:
        # 3.1 Preflight from Production Frontend
        prod_preflight_headers = {
            "Origin": "https://lms-frontend.onrender.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization, content-type",
        }
        res_prod_opt = requests.options(f"{base_url}/api/health", headers=prod_preflight_headers)
        assert res_prod_opt.status_code in (200, 204), f"Preflight failed: {res_prod_opt.status_code}"
        assert res_prod_opt.headers.get("access-control-allow-origin") == "https://lms-frontend.onrender.com"
        assert res_prod_opt.headers.get("access-control-allow-credentials") == "true"
        assert "POST" in res_prod_opt.headers.get("access-control-allow-methods", "")
        print("  [7/16] Preflight OPTIONS from production frontend (https://lms-frontend.onrender.com) passed with credentials=true")

        # 3.2 Preflight from Local Vite Dev Origin (http://localhost:5173)
        dev_preflight_headers = {
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        }
        res_dev_opt = requests.options(f"{base_url}/api/health", headers=dev_preflight_headers)
        assert res_dev_opt.status_code in (200, 204)
        assert res_dev_opt.headers.get("access-control-allow-origin") == "http://localhost:5173"
        assert res_dev_opt.headers.get("access-control-allow-credentials") == "true"
        print("  [8/16] Preflight OPTIONS from local Vite dev (http://localhost:5173) passed with credentials=true")

        # 3.3 Preflight from Alternative Dev Origin (http://localhost:3000)
        dev3000_headers = {
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        }
        res_3000_opt = requests.options(f"{base_url}/api/health", headers=dev3000_headers)
        assert res_3000_opt.status_code in (200, 204)
        assert res_3000_opt.headers.get("access-control-allow-origin") == "http://localhost:3000"
        print("  [9/16] Preflight OPTIONS from alternative local dev (http://localhost:3000) passed")

        # 3.4 Preflight from 127.0.0.1:5173
        dev127_headers = {
            "Origin": "http://127.0.0.1:5173",
            "Access-Control-Request-Method": "GET",
        }
        res_127_opt = requests.options(f"{base_url}/api/health", headers=dev127_headers)
        assert res_127_opt.status_code in (200, 204)
        assert res_127_opt.headers.get("access-control-allow-origin") == "http://127.0.0.1:5173"
        print("  [10/16] Preflight OPTIONS from 127.0.0.1:5173 passed")

        # -------------------------------------------------------------
        # SECTION 4: Live Actual Credentialed Requests
        # -------------------------------------------------------------
        print("\n--- SECTION 4: Live Credentialed GET/POST Requests ---")

        # 4.1 Production Origin GET request
        res_prod_get = requests.get(
            f"{base_url}/api/health",
            headers={"Origin": "https://lms-frontend.onrender.com", "Authorization": "Bearer fake-token"}
        )
        assert res_prod_get.status_code == 200
        assert res_prod_get.headers.get("access-control-allow-origin") == "https://lms-frontend.onrender.com"
        assert res_prod_get.headers.get("access-control-allow-credentials") == "true"
        print("  [11/16] Actual GET with credentials from production origin correctly allowed")

        # 4.2 Dev Origin GET request
        res_dev_get = requests.get(
            f"{base_url}/api/health",
            headers={"Origin": "http://localhost:5173", "Authorization": "Bearer fake-token"}
        )
        assert res_dev_get.status_code == 200
        assert res_dev_get.headers.get("access-control-allow-origin") == "http://localhost:5173"
        assert res_dev_get.headers.get("access-control-allow-credentials") == "true"
        print("  [12/16] Actual GET with credentials from local dev origin correctly allowed")

        # -------------------------------------------------------------
        # SECTION 5: Disallowed Origins and Attack Defenses
        # -------------------------------------------------------------
        print("\n--- SECTION 5: Disallowed Origins & Anti-Spoofing Defenses ---")

        # 5.1 Completely arbitrary attacker domain
        attacker_origin = "https://malicious-attacker.com"
        res_atk_opt = requests.options(
            f"{base_url}/api/health",
            headers={"Origin": attacker_origin, "Access-Control-Request-Method": "GET"}
        )
        assert "access-control-allow-origin" not in res_atk_opt.headers, (
            f"Attacker origin {attacker_origin} MUST NOT receive access-control-allow-origin header!"
        )
        res_atk_get = requests.get(f"{base_url}/api/health", headers={"Origin": attacker_origin})
        assert "access-control-allow-origin" not in res_atk_get.headers, (
            f"Attacker GET request MUST NOT receive access-control-allow-origin header!"
        )
        print("  [13/16] Arbitrary malicious origin (https://malicious-attacker.com) strictly blocked")

        # 5.2 Subdomain suffix attack: https://lms-frontend.onrender.com.attacker.com
        suffix_attack = "https://lms-frontend.onrender.com.attacker.com"
        res_suffix = requests.get(f"{base_url}/api/health", headers={"Origin": suffix_attack})
        assert "access-control-allow-origin" not in res_suffix.headers
        print("  [14/16] Subdomain suffix spoofing (https://lms-frontend.onrender.com.attacker.com) strictly blocked")

        # 5.3 Prefix attack: https://evil-lms-frontend.onrender.com
        prefix_attack = "https://evil-lms-frontend.onrender.com"
        res_prefix = requests.get(f"{base_url}/api/health", headers={"Origin": prefix_attack})
        assert "access-control-allow-origin" not in res_prefix.headers
        print("  [15/16] Prefix attack (https://evil-lms-frontend.onrender.com) strictly blocked")

        # 5.4 Null origin attack
        res_null = requests.get(f"{base_url}/api/health", headers={"Origin": "null"})
        assert "access-control-allow-origin" not in res_null.headers
        print("  [16/16] Null origin attack strictly blocked without CORS reflection")

        print("\n==================================================================")
        print("ALL 16/16 HIGH-07 CORS VERIFICATION TESTS PASSED PERFECTLY (100%)!")
        print("==================================================================")

    finally:
        server.should_exit = True
        server_thread.join(timeout=2.0)

if __name__ == "__main__":
    run_tests()
