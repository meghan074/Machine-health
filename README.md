# Predictive Maintenance and Machine Health Monitoring System

An industrial machine health monitoring and predictive maintenance platform powered by **Random Forest**, **XGBoost**, **SHAP Explainable AI**, **Remaining Useful Life (RUL)** prognostics, and enterprise **Role-Based Access Control (RBAC)** with **Worker Machine Isolation**.

Built with a high-contrast industrial interface (**Dark Theme with Crimson Red & Cyan Accents**).

---

## Architecture & Authentication Overview

### 1. Three Dedicated Entry Portals
* **Worker Portal**:
  * Authenticates using **Employee ID** and **Password** (e.g. `WRK-2001` or worker username).
  * Enforces **Machine Isolation**: workers only see and interact with machinery assigned to them.
  * Access to real-time machine telemetry, manual sensor input & ML health scoring, SHAP risk drivers, and alert acknowledgment.
* **Company User Portal**:
  * Authenticates using **Username** or **Corporate Email** and **Password** (e.g. `organiser` / `organiser123`).
  * Fleet-wide oversight across Manufacturing, Automotive, and Energy sectors.
  * Machine registration, sensor definition configuration, alert dispatch, and email audit logs.
* **Administrator Security Console**:
  * Authenticates using **Administrator Username** and **Password**.
  * Provision and delete user, worker, and admin accounts.
  * Dynamically assign and reassign machine limits to workers.
  * **Instant Account Suspension & Session Revocation**: suspending an account immediately terminates all active sessions.

### 2. Cryptographic Security Standards
* **Database**: Local SQLite database stored at `backend/auth.db`.
* **Password Hashing**: **PBKDF2-HMAC-SHA256** with **600,000 iterations** and unique 16-byte cryptographically random salts.
* **Zero Plaintext**: Passwords, hashes, salts, and session tokens are never returned in client API responses.
* **No Default Admin**: To comply with zero-trust security standards, no hardcoded or default admin credentials (`admin`/`admin`) exist in the system.
* **Dual-Track Migration**: Legacy SHA-256 account hashes are automatically upgraded to PBKDF2 (600,000 iterations) upon successful login.

### 3. Worker Machine Assignment Enforcement
* Backend authorization strictly enforces machine ownership on all endpoints:
  * `GET /api/machines`: Scoped to worker's assigned machines.
  * `GET /api/machines/{id}`: Blocks unassigned access with `403 Forbidden`.
  * `POST /api/machines/{id}/update-sensors`: Workers can only update readings for assigned machines; cannot alter metadata or sensor definitions.
  * `POST /api/predictions/manual`: Blocked for unassigned machines.
  * `GET /api/shap/{id}` & `GET /api/rul/{id}`: Blocked for unassigned machines.
  * `WS /ws/telemetry`: Telemetry streaming frame is strictly scoped to assigned machines.

### 4. Hardware IoT Device Authentication
* Hardware sensors ingest telemetry via `POST /api/machines/{id}/telemetry/hardware`.
* Authenticated using dedicated hardware device keys via `X-Device-Key` header.
* User session tokens are strictly rejected on hardware endpoints to maintain isolated credentials.
* Validated telemetry marks machine status as `HARDWARE_CONNECTED` and locks out synthetic simulation overwrites.

### 5. In-Band WebSocket Telemetry
* WebSocket endpoint: `ws://127.0.0.1:8000/ws/telemetry`.
* Requires in-band handshake frame within 5 seconds: `{"action": "AUTHENTICATE", "token": "<session_token>"}`.
* Prevents tokens from leaking into query parameters or web server URL logs.

---

## Machine Learning Capabilities

* **AI4I 2020 Dataset**: 10,000 industrial machine operational samples with physical process parameters.
* **Dual Classification Models**:
  * **Random Forest Classifier**: Accuracy ~98.4%, balanced bagging ensemble.
  * **XGBoost Classifier**: Accuracy ~98.55%, gradient boosted trees optimized for minority failure classes.
* **SHAP (SHapley Additive exPlanations)**:
  * Real `shap.TreeExplainer` computed for XGBoost and Random Forest.
  * Quantifies exact marginal contributions for Torque, Rotational Speed, Tool Wear, and Process Temperatures.
* **Remaining Useful Life (RUL) Prognostics**:
  * Mechanical strain trajectory modeling based on cumulative tool wear and thermal stress.
  * Outputs remaining operating hours, cycle estimates, and prescriptive maintenance recommendations.

---

## How to Initialize Administrator & Run

### 1. Provision an Administrator Account
Before initial admin login, create an administrator account using the secure interactive CLI:

```powershell
cd backend
python create_admin.py
```
*You will be securely prompted for admin username, full name, email, and password (masked).*

Alternatively, you can provide environment variables before starting the backend:
```powershell
$env:ADMIN_INITIAL_USERNAME="chief_admin"
$env:ADMIN_INITIAL_PASSWORD="SecurePassword2026!"
```

### 2. Launch the Application

#### Option A: One-Click Launch
Double-click `start.bat` in the root directory.

#### Option B: Manual Command Line
```powershell
# Terminal 1 - Backend
cd backend
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Open your browser at: **`http://localhost:5173`**

### 3. Pre-Seeded Demonstration Accounts

| Role | Username / Employee ID | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Worker** | `WRK-2001` *(or worker_meghan)* | `worker123` | Assigned machines (`CNC-M14860`, `CNC-L47181`, `MOT-IND-01`, `BRG-AUTO-03`, `PUMP-HP-02`, `COMP-GAS-05`) |
| **User** | `organiser` *(or organiser@company.com)* | `organiser123` | Full fleet operations, machine registration, sensor config, alert dispatch |
| **Admin** | Provisioned via `python create_admin.py` | Set during creation | User provisioning, machine assignment, session revocation, governance |

---

## Automated Verification Suite

Run the complete 48-point automated test suite covering authentication, role authorization, worker isolation, hardware IoT ingestion, WebSocket handshake, account suspension, dynamic alert emails, and ML model outputs:

```powershell
cd backend
python test_suite.py
```
