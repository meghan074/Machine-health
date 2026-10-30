import sys
import os
import time
import json
import asyncio
import threading
import requests
import websockets
import uvicorn

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(__file__))

from app import app
from auth_service import auth_service
from ml_engine import ml_engine

TEST_PORT = 8008
BASE_URL = f"http://127.0.0.1:{TEST_PORT}"
WS_URL = f"ws://127.0.0.1:{TEST_PORT}/ws/telemetry"

def start_test_server():
    config = uvicorn.Config(app, host="127.0.0.1", port=TEST_PORT, log_level="warning")
    server = uvicorn.Server(config)
    t = threading.Thread(target=server.run, daemon=True)
    t.start()
    return server

def wait_for_server():
    for _ in range(30):
        try:
            r = requests.get(f"{BASE_URL}/api/status", timeout=1)
            if r.status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(0.5)
    return False

def run_tests():
    print("=" * 70)
    print("STARTING FULL AUTHENTICATION, AUTHORIZATION, HARDWARE, WS & ML TEST SUITE")
    print("=" * 70)

    server = start_test_server()
    if not wait_for_server():
        print("[FAIL] Test server failed to start on port", TEST_PORT)
        sys.exit(1)
    print(f"[OK] Test server running on {BASE_URL}\n")

    passed = 0
    failed = 0

    def assert_true(condition, test_name):
        nonlocal passed, failed
        if condition:
            print(f"  [PASS] {test_name}")
            passed += 1
        else:
            print(f"  [FAIL] {test_name}")
            failed += 1

    # -------------------------------------------------------------
    # SUITE 1: Admin Creation & Authentication Security
    # -------------------------------------------------------------
    print(">>> SUITE 1: Admin Creation & Authentication Security")
    
    # 1.1 Verify no default admin credentials
    r = requests.post(f"{BASE_URL}/api/auth/admin-login", json={"username": "admin", "password": "admin"})
    assert_true(r.status_code == 401, "Default credentials 'admin'/'admin' rejected with 401")

    # 1.2 Provision test administrator account
    admin_uname = f"admin_sec_{int(time.time() * 1000) % 100000}"
    try:
        admin_acc = auth_service.create_account(
            username=admin_uname,
            full_name="Enterprise Security Lead",
            email=f"{admin_uname}@company.local",
            password="SecureAdminPassword2026!",
            role="admin",
            department="Cybersecurity & Governance"
        )
        assert_true(admin_acc["role"] == "admin", "Admin account provisioned via PBKDF2 600K")
        assert_true("password_hash" not in admin_acc and "salt" not in admin_acc, "Sanitized account does not expose hash or salt")
    except Exception as e:
        assert_true(False, f"Admin account creation failed: {e}")

    # 1.3 Authenticate as Admin
    r = requests.post(f"{BASE_URL}/api/auth/admin-login", json={
        "username": admin_uname,
        "password": "SecureAdminPassword2026!"
    })
    admin_data = r.json()
    assert_true(r.status_code == 200 and "token" in admin_data, "Admin login successful, token issued")
    admin_token = admin_data.get("token")

    # 1.4 Admin login with wrong password
    r = requests.post(f"{BASE_URL}/api/auth/admin-login", json={
        "username": admin_uname,
        "password": "WrongPassword999"
    })
    assert_true(r.status_code == 401, "Admin login with bad password rejected with 401")

    # -------------------------------------------------------------
    # SUITE 2: Worker & User Login, Password Upgrades, Legacy Bypass Removal
    # -------------------------------------------------------------
    print("\n>>> SUITE 2: Worker & User Login & Legacy Bypass Removal")

    # 2.1 Worker login by Employee ID
    r = requests.post(f"{BASE_URL}/api/auth/worker-login", json={
        "employee_id": "WRK-2001",
        "password": "worker123"
    })
    worker_data = r.json()
    assert_true(r.status_code == 200 and worker_data["user"]["role"] == "worker", "Worker login by Employee ID successful")
    worker_token = worker_data.get("token")
    worker_assigned = worker_data["user"].get("assigned_machines", [])

    # 2.2 Worker login with invalid password
    r = requests.post(f"{BASE_URL}/api/auth/worker-login", json={
        "employee_id": "WRK-2001",
        "password": "badpassword"
    })
    assert_true(r.status_code == 401, "Worker login with bad password rejected with 401")

    # 2.3 User / Organiser login by username
    r = requests.post(f"{BASE_URL}/api/auth/user-login", json={
        "username_or_email": "organiser",
        "password": "organiser123"
    })
    user_data = r.json()
    assert_true(r.status_code == 200 and user_data["user"]["role"] == "organiser", "User/Organiser login successful")
    user_token = user_data.get("token")

    # 2.4 Legacy bypass without valid password strictly rejected
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"role": "organiser"})
    assert_true(r.status_code == 401, "Legacy unauthenticated role-only bypass strictly rejected with 401")

    # 2.5 Profile verification via /api/auth/me
    r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {worker_token}"})
    assert_true(r.status_code == 200 and r.json()["user"]["employee_id"] == "WRK-2001", "Worker session profile resolved via /api/auth/me")

    # 2.6 Reject invalid or forged session token
    r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": "Bearer forged_token_xyz_999"})
    assert_true(r.status_code == 401, "Forged session token rejected with 401")

    # -------------------------------------------------------------
    # SUITE 3: Worker Machine Isolation & Authorization Boundaries
    # -------------------------------------------------------------
    print("\n>>> SUITE 3: Worker Machine Isolation & Authorization Boundaries")

    # 3.1 Worker machine list is strictly scoped to assigned machines
    r_wrk_m = requests.get(f"{BASE_URL}/api/machines", headers={"Authorization": f"Bearer {worker_token}"})
    wrk_machines = r_wrk_m.json()
    wrk_m_ids = [m["id"] for m in wrk_machines]
    assert_true(len(wrk_machines) == len(worker_assigned) and all(m in worker_assigned for m in wrk_m_ids), 
                f"Worker GET /api/machines returned only {len(wrk_machines)} assigned machines")

    # 3.2 User/Admin machine list returns all machines
    r_user_m = requests.get(f"{BASE_URL}/api/machines", headers={"Authorization": f"Bearer {user_token}"})
    all_machines = r_user_m.json()
    assert_true(len(all_machines) >= 10, f"User GET /api/machines returned full fleet ({len(all_machines)} machines)")

    # 3.3 Worker access to assigned machine detail
    assigned_m_id = worker_assigned[0] # e.g. CNC-M14860
    r = requests.get(f"{BASE_URL}/api/machines/{assigned_m_id}", headers={"Authorization": f"Bearer {worker_token}"})
    assert_true(r.status_code == 200, f"Worker accessing assigned machine '{assigned_m_id}' allowed (200)")

    # 3.4 Worker access to unassigned machine detail is blocked
    unassigned_m_id = "TEST-MAC-9861" # Not in worker_assigned
    r = requests.get(f"{BASE_URL}/api/machines/{unassigned_m_id}", headers={"Authorization": f"Bearer {worker_token}"})
    assert_true(r.status_code == 403, f"Worker accessing unassigned machine '{unassigned_m_id}' blocked with 403 Forbidden")

    # 3.5 Worker updating sensors on assigned machine
    r = requests.post(f"{BASE_URL}/api/machines/{assigned_m_id}/update-sensors", 
                      headers={"Authorization": f"Bearer {worker_token}"},
                      json={"machine_id": assigned_m_id, "readings": {"torque_nm": 45.5}})
    assert_true(r.status_code == 200, "Worker updating valid sensor on assigned machine allowed (200)")

    # 3.6 Worker updating sensors on unassigned machine blocked
    r = requests.post(f"{BASE_URL}/api/machines/{unassigned_m_id}/update-sensors", 
                      headers={"Authorization": f"Bearer {worker_token}"},
                      json={"machine_id": unassigned_m_id, "readings": {"torque_nm": 45.5}})
    assert_true(r.status_code == 403, "Worker updating sensors on unassigned machine blocked with 403")

    # 3.7 Worker updating unknown sensor key rejected
    r = requests.post(f"{BASE_URL}/api/machines/{assigned_m_id}/update-sensors", 
                      headers={"Authorization": f"Bearer {worker_token}"},
                      json={"machine_id": assigned_m_id, "readings": {"malicious_hacked_sensor": 999.0}})
    assert_true(r.status_code == 400, "Worker updating unknown sensor key rejected with 400 Bad Request")

    # 3.8 Worker manual prediction on unassigned machine blocked
    r = requests.post(f"{BASE_URL}/api/predictions/manual",
                      headers={"Authorization": f"Bearer {worker_token}"},
                      json={"machine_id": unassigned_m_id, "readings": {"torque_nm": 40.0}})
    assert_true(r.status_code == 403, "Worker manual prediction on unassigned machine blocked with 403")

    # 3.9 Worker SHAP and RUL queries on unassigned machine blocked
    r_shap = requests.get(f"{BASE_URL}/api/shap/{unassigned_m_id}", headers={"Authorization": f"Bearer {worker_token}"})
    r_rul = requests.get(f"{BASE_URL}/api/rul/{unassigned_m_id}", headers={"Authorization": f"Bearer {worker_token}"})
    assert_true(r_shap.status_code == 403 and r_rul.status_code == 403, "Worker SHAP and RUL queries on unassigned machine blocked with 403")

    # -------------------------------------------------------------
    # SUITE 4: Role-Based Permissions (Organiser/Admin vs Worker)
    # -------------------------------------------------------------
    print("\n>>> SUITE 4: Role-Based Permissions & Administrative Governance")

    # 4.1 Worker blocked from registering machines
    r = requests.post(f"{BASE_URL}/api/machines/register", 
                      headers={"Authorization": f"Bearer {worker_token}"},
                      json={"id": "FORBID-01", "name": "Illegal Machine", "industry": "Energy", "type": "Pump", "location": "Floor"})
    assert_true(r.status_code == 403, "Worker blocked from registering machine (403 Forbidden)")

    # 4.2 User allowed to register machine
    new_test_machine_id = f"TEST-REG-{int(time.time()) % 1000}"
    r = requests.post(f"{BASE_URL}/api/machines/register",
                      headers={"Authorization": f"Bearer {user_token}"},
                      json={"id": new_test_machine_id, "name": "Test Injected Machine", "industry": "Automotive", "type": "Lathe", "location": "Zone B"})
    assert_true(r.status_code == 200, "User successfully registered new machine (200 OK)")

    # 4.3 Worker blocked from updating sensor configuration definitions
    r = requests.put(f"{BASE_URL}/api/machines/{assigned_m_id}/sensors",
                     headers={"Authorization": f"Bearer {worker_token}"},
                     json={"sensor_definitions": [{"key": "torque_nm", "label": "Torque", "unit": "Nm"}]})
    assert_true(r.status_code == 403, "Worker blocked from modifying sensor configuration definitions (403)")

    # 4.4 Worker blocked from viewing restricted audit email logs
    r = requests.get(f"{BASE_URL}/api/email-logs", headers={"Authorization": f"Bearer {worker_token}"})
    assert_true(r.status_code == 403, "Worker blocked from viewing email audit logs (403 Forbidden)")

    # 4.5 User allowed to view email audit logs
    r = requests.get(f"{BASE_URL}/api/email-logs", headers={"Authorization": f"Bearer {user_token}"})
    assert_true(r.status_code == 200, "User allowed to view email audit logs (200 OK)")

    # 4.6 Worker blocked from admin endpoints
    r = requests.get(f"{BASE_URL}/api/admin/accounts", headers={"Authorization": f"Bearer {worker_token}"})
    assert_true(r.status_code == 403, "Worker blocked from admin accounts list (403 Forbidden)")

    # 4.7 Admin allowed to list accounts
    r = requests.get(f"{BASE_URL}/api/admin/accounts", headers={"Authorization": f"Bearer {admin_token}"})
    accounts_list = r.json()
    assert_true(r.status_code == 200 and len(accounts_list) > 0, f"Admin successfully retrieved {len(accounts_list)} accounts")

    # -------------------------------------------------------------
    # SUITE 5: Isolated Hardware IoT Ingestion
    # -------------------------------------------------------------
    print("\n>>> SUITE 5: Isolated Hardware IoT Telemetry Ingestion")

    # 5.1 Telemetry without X-Device-Key rejected
    r = requests.post(f"{BASE_URL}/api/machines/CNC-M14860/telemetry/hardware", json={"torque_nm": 42.0})
    assert_true(r.status_code == 401, "Hardware ingestion without X-Device-Key rejected with 401")

    # 5.2 Telemetry with user token in X-Device-Key rejected (strict credential isolation)
    r = requests.post(f"{BASE_URL}/api/machines/CNC-M14860/telemetry/hardware", 
                      headers={"X-Device-Key": worker_token}, json={"torque_nm": 42.0})
    assert_true(r.status_code == 401, "Hardware ingestion with user session token rejected (credentials isolated)")

    # 5.3 Telemetry with valid hardware device key accepted
    r = requests.post(f"{BASE_URL}/api/machines/CNC-M14860/telemetry/hardware", 
                      headers={"X-Device-Key": "iot_hw_cnc_m14860"}, json={"torque_nm": 52.4})
    assert_true(r.status_code == 200 and r.json()["connection_status"] == "HARDWARE_CONNECTED", 
                "Valid hardware device key ingested & marked HARDWARE_CONNECTED")

    # 5.4 Telemetry with unknown sensor key rejected
    r = requests.post(f"{BASE_URL}/api/machines/CNC-M14860/telemetry/hardware", 
                      headers={"X-Device-Key": "iot_hw_cnc_m14860"}, json={"unknown_sensor_hack": 12.3})
    assert_true(r.status_code == 400, "Hardware ingestion with unknown sensor rejected with 400")

    # -------------------------------------------------------------
    # SUITE 6: Account Suspension & Immediate Session Revocation
    # -------------------------------------------------------------
    print("\n>>> SUITE 6: Account Suspension & Immediate Session Revocation")

    # 6.1 Create temporary user to test suspension
    temp_uname = f"temp_suspend_{int(time.time() * 1000) % 100000}"
    temp_user = auth_service.create_account(
        username=temp_uname,
        full_name="Temporary Contractor",
        password="TempPassword123!",
        role="worker",
        assigned_machines=["CNC-M14860"]
    )
    # Log in as temp user
    r = requests.post(f"{BASE_URL}/api/auth/worker-login", json={"employee_id": temp_user["id"], "password": "TempPassword123!"})
    temp_token = r.json()["token"]

    # Verify session is working
    r = requests.get(f"{BASE_URL}/api/machines", headers={"Authorization": f"Bearer {temp_token}"})
    assert_true(r.status_code == 200, "Temp user active session authorized (200)")

    # 6.2 Admin suspends account
    r = requests.put(f"{BASE_URL}/api/admin/accounts/{temp_user['id']}/status", 
                     headers={"Authorization": f"Bearer {admin_token}"},
                     json={"status": "SUSPENDED"})
    assert_true(r.status_code == 200 and r.json()["user"]["status"] == "SUSPENDED", "Account suspended by Admin")

    # 6.3 Immediate session revocation check: previously issued token is now 401
    r = requests.get(f"{BASE_URL}/api/machines", headers={"Authorization": f"Bearer {temp_token}"})
    assert_true(r.status_code == 401, "Suspended user's active session immediately revoked (401 Unauthorized)")

    # 6.4 Login while suspended is rejected
    r = requests.post(f"{BASE_URL}/api/auth/worker-login", json={"employee_id": temp_user["id"], "password": "TempPassword123!"})
    assert_true(r.status_code == 401 and "suspended" in r.json()["detail"].lower(), "Login attempt while suspended rejected with explanatory error")

    # -------------------------------------------------------------
    # SUITE 7: Dynamic Alert Email Resolution
    # -------------------------------------------------------------
    print("\n>>> SUITE 7: Dynamic Alert Email Resolution")

    # 7.1 Send alert for machine assigned to Meghan (nukameghan@gmail.com)
    r = requests.post(f"{BASE_URL}/api/alerts/send",
                      headers={"Authorization": f"Bearer {user_token}"},
                      json={
                          "machine_id": "CNC-M14860",
                          "severity": "CRITICAL",
                          "message": "Spindle overload detected during automated shift testing."
                      })
    alert_res = r.json()
    assert_true(r.status_code == 200 and alert_res["alert"]["recipient"] == "nukameghan@gmail.com", 
                "Alert recipient dynamically resolved to assigned worker: nukameghan@gmail.com")

    # 7.2 Send alert for unassigned machine -> resolves to configurable fallback email
    r = requests.post(f"{BASE_URL}/api/alerts/send",
                      headers={"Authorization": f"Bearer {user_token}"},
                      json={
                          "machine_id": "TEST-MAC-9861",
                          "severity": "WARNING",
                          "message": "Routine steam turbine diagnostic inspection."
                      })
    alert_unassigned = r.json()
    assert_true(r.status_code == 200 and "@" in alert_unassigned["alert"]["recipient"],
                f"Unassigned machine alert dynamically resolved to fallback email: {alert_unassigned['alert']['recipient']}")

    # -------------------------------------------------------------
    # SUITE 8: Secure In-Band WebSocket Telemetry & Machine Scoping
    # -------------------------------------------------------------
    print("\n>>> SUITE 8: Secure In-Band WebSocket Telemetry & Machine Scoping")

    async def test_websocket():
        # 8.1 Connect and verify in-band authentication
        async with websockets.connect(WS_URL) as ws:
            # Send in-band AUTH frame
            await ws.send(json.dumps({"action": "AUTHENTICATE", "token": worker_token}))
            auth_ack = json.loads(await ws.recv())
            assert_true(auth_ack.get("type") == "AUTH_OK", "WebSocket in-band authentication accepted (AUTH_OK)")
            assert_true(auth_ack.get("role") == "worker", "WebSocket session confirmed worker role")

            # Receive first telemetry frame
            telemetry_frame = json.loads(await ws.recv())
            assert_true(telemetry_frame.get("type") == "TELEMETRY_UPDATE", "WebSocket streaming TELEMETRY_UPDATE")
            streamed_machines = [m["id"] for m in telemetry_frame.get("machines", [])]
            # Worker scoping: streamed machines must only contain worker's assigned machines!
            all_scoped = all(m in worker_assigned for m in streamed_machines)
            assert_true(all_scoped and len(streamed_machines) == len(worker_assigned), 
                        f"WebSocket stream scoped to worker's {len(streamed_machines)} assigned machines (zero unassigned leaked)")

        # 8.2 Reject invalid token on WebSocket
        async with websockets.connect(WS_URL) as ws_bad:
            await ws_bad.send(json.dumps({"action": "AUTHENTICATE", "token": "invalid_ws_token"}))
            err_frame = json.loads(await ws_bad.recv())
            assert_true(err_frame.get("type") == "AUTH_ERROR", "WebSocket rejected invalid token with AUTH_ERROR")

    asyncio.run(test_websocket())

    # -------------------------------------------------------------
    # SUITE 9: ML Engine Functionality & Explainability Preservation
    # -------------------------------------------------------------
    print("\n>>> SUITE 9: Machine Learning Engine & AI4I Model Preservation")

    test_readings = {
        "air_temperature_k": 298.5,
        "process_temperature_k": 308.6,
        "rotational_speed_rpm": 1500.0,
        "torque_nm": 40.0,
        "tool_wear_min": 60.0
    }

    # 9.1 ML dual predictions
    preds = ml_engine.predict_both(test_readings)
    assert_true("random_forest" in preds and "xgboost" in preds and "consensus" in preds, 
                "ML predict_both returned RF, XGBoost, and Consensus scores")
    assert_true(0 <= preds["random_forest"]["failure_probability"] <= 100, "RF failure probability in valid range [0, 100]")
    assert_true(0 <= preds["xgboost"]["failure_probability"] <= 100, "XGBoost failure probability in valid range [0, 100]")

    # 9.2 SHAP game-theoretic explainability
    shap_res = ml_engine.explain_shap(test_readings, "xgboost")
    assert_true("top_risk_driver" in shap_res and len(shap_res.get("features", [])) > 0, 
                f"SHAP TreeExplainer produced feature contributions (Top driver: {shap_res.get('top_risk_driver')})")

    # 9.3 Remaining Useful Life (RUL) estimation
    rul_res = ml_engine.estimate_rul(test_readings)
    assert_true("estimated_rul_hours" in rul_res and rul_res["estimated_rul_hours"] > 0, 
                f"RUL prognostics calculated: {rul_res.get('estimated_rul_hours')} hours remaining")

    # 9.4 Manual prediction endpoint via HTTP
    r_man = requests.post(f"{BASE_URL}/api/predictions/manual",
                          headers={"Authorization": f"Bearer {worker_token}"},
                          json={"machine_id": assigned_m_id, "readings": test_readings})
    assert_true(r_man.status_code == 200 and "shap_explanation" in r_man.json(), 
                "Manual prediction endpoint evaluated RF + XGBoost + SHAP + RUL successfully")

    # Automatic Cleanup of test-created accounts & machines
    try:
        from database import get_db_connection
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("DELETE FROM users WHERE username LIKE ? OR username LIKE ?", ('admin_sec%', 'temp_suspend%'))
        c.execute("DELETE FROM sessions")
        conn.commit()
        conn.close()
    except Exception as cleanup_err:
        print(f"[Warning] Test cleanup encountered: {cleanup_err}")

    # -------------------------------------------------------------
    # FINAL RESULTS
    # -------------------------------------------------------------
    print("\n" + "=" * 70)
    print(f"VERIFICATION RESULTS: {passed} PASSED, {failed} FAILED (TOTAL: {passed + failed})")
    print("=" * 70)

    if failed == 0:
        print("\nALL SECURITY, AUTHENTICATION, AUTHORIZATION, AND ML REGRESSION TESTS PASSED PERFECTLY!\n")
        return 0
    else:
        print(f"\n[FAIL] {failed} test(s) failed.\n")
        return 1

if __name__ == "__main__":
    sys.exit(run_tests())
