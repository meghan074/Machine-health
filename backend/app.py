import os
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, Header, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from ml_engine import ml_engine
from email_service import email_service, DEFAULT_ALERT_EMAIL
from data_loader import data_manager
from auth_service import auth_service
from prediction_history_store import prediction_history_store
from machine_storage import machine_storage

app = FastAPI(
    title="Predictive Maintenance & Machine Health Monitoring API",
    description="Backend API for industrial machine health, dual model ML (Random Forest + XGBoost), SHAP explainability, RUL estimation, secure role-based access control, worker machine isolation, and hardware IoT telemetry.",
    version="2.0.0"
)

# CORS setup for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory alerts store (pre-populated with realistic initial alert)
alerts_db = [
    {
        "id": "ALT-1001",
        "machine_id": "CNC-M14860",
        "machine_name": "Titan 5-Axis CNC Milling Center",
        "severity": "CRITICAL",
        "sender": "Company Organiser",
        "recipient": DEFAULT_ALERT_EMAIL,
        "message": "High cutting torque and excessive tool wear detected. Immediate spindle inspection and tool replacement required.",
        "rf_probability": 48.2,
        "xgb_probability": 78.6,
        "rul_hours": 18.5,
        "top_shap_driver": "Tool Wear (min)",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "status": "SENT",
        "email_dispatched": True,
        "worker_acknowledged": False
    }
]

# Security scheme for token extraction
bearer_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token")
) -> Dict[str, Any]:
    token = None
    if auth_header and auth_header.credentials:
        token = auth_header.credentials.strip()
    elif x_session_token:
        token = x_session_token.strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide a valid session token in Authorization: Bearer <token> or X-Session-Token header."
        )

    user = auth_service.validate_session(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid, expired, or revoked session token. Please log in again."
        )
    return user

def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = (current_user.get("role") or "").lower()
        allowed = [r.lower() for r in allowed_roles]
        if user_role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: Role '{user_role}' is not authorized to access this resource. Allowed roles: {allowed_roles}"
            )
        return current_user
    return role_checker

def check_machine_access(machine_id: str, current_user: Dict[str, Any]):
    """
    Enforces machine assignment boundaries for workers.
    Organisers, users, and admins have full fleet oversight.
    """
    user_role = (current_user.get("role") or "").lower()
    if user_role == "worker":
        assigned = [m.strip().upper() for m in current_user.get("assigned_machines", [])]
        if machine_id.strip().upper() not in assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Worker '{current_user.get('full_name', current_user.get('id'))}' is not assigned to machine '{machine_id}'."
            )

# ----------------- Request / Response Models -----------------

class WorkerLoginRequest(BaseModel):
    employee_id: str
    password: str

class UserLoginRequest(BaseModel):
    username_or_email: str
    password: str

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class LegacyLoginRequest(BaseModel):
    role: Optional[str] = "user"
    email: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None

class CreateAccountRequest(BaseModel):
    username: str
    full_name: str
    password: str
    role: str # "worker", "user", "organiser", "admin"
    email: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = ""
    assigned_machines: Optional[List[str]] = []

class UpdateStatusRequest(BaseModel):
    status: str # "ACTIVE" or "SUSPENDED"

class AssignMachinesRequest(BaseModel):
    assigned_machines: List[str]

class RegisterMachineRequest(BaseModel):
    id: str
    name: str
    industry: str
    type: str
    location: str
    description: Optional[str] = ""
    sensor_definitions: Optional[list] = None
    readings: Optional[Dict[str, float]] = None

class UpdateSensorsConfigRequest(BaseModel):
    sensor_definitions: list

class ManualPredictRequest(BaseModel):
    machine_id: str
    readings: Dict[str, float]
    operator: Optional[str] = "Operator"
    role: Optional[str] = "worker"
    notes: Optional[str] = ""

class PredictionRequest(BaseModel):
    air_temperature_k: float
    process_temperature_k: float
    rotational_speed_rpm: float
    torque_nm: float
    tool_wear_min: float

class SendAlertRequest(BaseModel):
    machine_id: str
    severity: str # "WARNING" or "CRITICAL"
    message: str
    sender: Optional[str] = "Company Organiser"
    recipient_email: Optional[str] = None

class TelemetryUpdateRequest(BaseModel):
    machine_id: str
    readings: Dict[str, float]
    source: Optional[str] = "MANUAL" # "MANUAL" or "HARDWARE"

# ----------------- Public Status & Model Endpoints -----------------

@app.get("/api/status")
def get_system_status():
    return {
        "status": "ONLINE",
        "service": "Machine Health Monitoring & Predictive Maintenance",
        "default_alert_email": DEFAULT_ALERT_EMAIL,
        "models_loaded": {
            "random_forest": ml_engine.rf_model is not None,
            "xgboost": ml_engine.xgb_model is not None,
            "shap_explainer": ml_engine.xgb_explainer is not None
        },
        "dataset_rows": len(ml_engine.df) if ml_engine.df is not None else 0,
        "total_monitored_machines": len(data_manager.get_all_machines()),
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

@app.get("/api/models/comparison")
def get_models_comparison(current_user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "models": ml_engine.metrics,
        "dataset_info": {
            "name": "AI4I 2020 Predictive Maintenance Dataset",
            "features_used": ml_engine.X_train.columns.tolist() if ml_engine.X_train is not None else [],
            "target": "Machine failure (Binary: 0=Normal, 1=Failure)",
            "test_split": "20% Stratified"
        }
    }

# ----------------- Authentication Endpoints -----------------

@app.post("/api/auth/worker-login")
def worker_login(req: WorkerLoginRequest):
    """
    Dedicated Worker Login: Authenticates by Employee ID and Password.
    Upgrades legacy SHA-256 hashes to PBKDF2 (600,000 iterations) automatically.
    """
    try:
        res = auth_service.authenticate_worker(req.employee_id, req.password)
        return {
            "success": True,
            "message": "Worker authenticated successfully",
            "token": res["token"],
            "user": res["user"]
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Worker authentication failed.")

@app.post("/api/auth/user-login")
def user_login(req: UserLoginRequest):
    """
    Dedicated User / Organiser Login: Authenticates by Username/Email and Password.
    """
    try:
        res = auth_service.authenticate_user(req.username_or_email, req.password)
        return {
            "success": True,
            "message": "User authenticated successfully",
            "token": res["token"],
            "user": res["user"]
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="User authentication failed.")

@app.post("/api/auth/admin-login")
def admin_login(req: AdminLoginRequest):
    """
    Dedicated Administrator Login: Authenticates administrator by Username and Password.
    """
    try:
        res = auth_service.authenticate_admin(req.username, req.password)
        return {
            "success": True,
            "message": "Administrator authenticated successfully",
            "token": res["token"],
            "user": res["user"]
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Administrator authentication failed.")

@app.post("/api/auth/logout")
def logout(
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token")
):
    token = None
    if auth_header and auth_header.credentials:
        token = auth_header.credentials.strip()
    elif x_session_token:
        token = x_session_token.strip()

    if token:
        auth_service.destroy_session(token)
    return {"success": True, "message": "Successfully logged out."}

@app.get("/api/auth/me")
def get_current_user_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    return {"success": True, "user": current_user}

@app.post("/api/auth/login")
def legacy_login(req: LegacyLoginRequest):
    """
    Strict legacy compatibility endpoint:
    Role-only bypass is strictly removed. If valid credentials are provided,
    authenticates and issues a session token. Otherwise rejects with 401.
    """
    cred = req.email or req.username
    if cred and req.password:
        role = (req.role or "").lower()
        if role == "worker":
            try:
                res = auth_service.authenticate_worker(cred, req.password)
                return {"success": True, "token": res["token"], "user": res["user"]}
            except ValueError as e:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
        else:
            try:
                res = auth_service.authenticate_user(cred, req.password)
                return {"success": True, "token": res["token"], "user": res["user"]}
            except ValueError:
                try:
                    res = auth_service.authenticate_admin(cred, req.password)
                    return {"success": True, "token": res["token"], "user": res["user"]}
                except ValueError as e:
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Role-based bypass without valid credentials has been removed. Please log in via Worker, User, or Admin login."
    )

# ----------------- Administrator Account Management Endpoints -----------------

@app.get("/api/admin/accounts")
def list_accounts(current_user: Dict[str, Any] = Depends(require_roles(["admin"]))):
    """
    Admin-only: Retrieve all system accounts with assignment and status details.
    Password hashes, salts, and tokens are never exposed.
    """
    return auth_service.list_all_accounts()

@app.post("/api/admin/accounts")
def create_account(
    req: CreateAccountRequest,
    current_user: Dict[str, Any] = Depends(require_roles(["admin"]))
):
    """
    Admin-only: Provision a new worker, user, organiser, or admin account.
    """
    try:
        user = auth_service.create_account(
            username=req.username,
            full_name=req.full_name,
            email=req.email,
            employee_id=req.employee_id,
            password=req.password,
            role=req.role,
            department=req.department or "",
            assigned_machines=req.assigned_machines or []
        )
        return {"success": True, "message": f"Account '{user['username']}' provisioned successfully.", "user": user}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create account: {str(e)}")

@app.put("/api/admin/accounts/{target_user_id}/status")
def update_account_status(
    target_user_id: str,
    req: UpdateStatusRequest,
    current_user: Dict[str, Any] = Depends(require_roles(["admin"]))
):
    """
    Admin-only: Suspend or activate an account.
    Suspending an account immediately terminates and revokes all active sessions.
    """
    try:
        user = auth_service.set_account_status(target_user_id, req.status, current_user["id"])
        return {"success": True, "message": f"Account status updated to {req.status}", "user": user}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@app.put("/api/admin/accounts/{target_user_id}/assign")
def assign_worker_machines(
    target_user_id: str,
    req: AssignMachinesRequest,
    current_user: Dict[str, Any] = Depends(require_roles(["admin"]))
):
    """
    Admin-only: Assign or reassign machines to a worker account.
    """
    try:
        user = auth_service.assign_worker_machines(target_user_id, req.assigned_machines)
        return {"success": True, "message": "Machine assignments updated successfully", "user": user}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@app.delete("/api/admin/accounts/{target_user_id}")
def delete_account(
    target_user_id: str,
    current_user: Dict[str, Any] = Depends(require_roles(["admin"]))
):
    """
    Admin-only: Delete an account and invalidate all associated sessions.
    """
    try:
        deleted = auth_service.delete_account(target_user_id, current_user["id"])
        if not deleted:
            raise HTTPException(status_code=404, detail="Account not found.")
        return {"success": True, "message": f"Account '{target_user_id}' deleted successfully."}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# ----------------- Machine Management & Telemetry Endpoints -----------------

@app.get("/api/machines")
def get_all_machines(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns machines monitored by the system.
    Workers are strictly restricted to their assigned machines.
    Organisers, users, and admins can view all machines.
    """
    all_machines = data_manager.get_all_machines()
    user_role = (current_user.get("role") or "").lower()

    if user_role == "worker":
        assigned = set(m.strip().upper() for m in current_user.get("assigned_machines", []))
        visible_machines = [m for m in all_machines if m["id"].strip().upper() in assigned]
    else:
        visible_machines = all_machines

    results = []
    for m in visible_machines:
        preds = ml_engine.predict_both(m["readings"])
        rul = ml_engine.estimate_rul(m["readings"])
        compat = preds.get("feature_compatibility") or ml_engine.check_feature_compatibility(m["readings"])
        results.append({
            "id": m["id"],
            "name": m["name"],
            "industry": m["industry"],
            "type": m["type"],
            "location": m.get("location", "Plant Operations Floor"),
            "description": m.get("description", ""),
            "registered_at": m.get("registered_at", None),
            "connection_status": m.get("connection_status", "SIMULATED"),
            "telemetry_source": m.get("telemetry_source", "SIMULATED"),
            "is_simulated": m.get("telemetry_source", "SIMULATED") == "SIMULATED",
            "last_hardware_ping": m.get("last_hardware_ping", None),
            "feature_compatibility": compat,
            "sensor_definitions": m["sensor_definitions"],
            "readings": m["readings"],
            "prediction_rf": preds["random_forest"],
            "prediction_xgb": preds["xgboost"],
            "consensus": preds["consensus"],
            "rul": {
                "hours": rul["estimated_rul_hours"],
                "cycles": rul["estimated_rul_cycles"],
                "recommendation": rul["recommendation"]
            },
            "last_updated": datetime.now().strftime("%H:%M:%S")
        })
    return results

@app.get("/api/machines/{machine_id}")
def get_machine_detail(machine_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns comprehensive diagnostic status for a specific machine.
    Enforces worker machine boundary access control.
    """
    check_machine_access(machine_id, current_user)

    m = data_manager.get_machine(machine_id)
    if not m:
        raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found.")

    preds = ml_engine.predict_both(m["readings"])
    shap_info = ml_engine.explain_shap(m["readings"], "xgboost")
    rul = ml_engine.estimate_rul(m["readings"])
    compat = preds.get("feature_compatibility") or ml_engine.check_feature_compatibility(m["readings"])

    return {
        "machine": {
            **m,
            "connection_status": m.get("connection_status", "SIMULATED"),
            "telemetry_source": m.get("telemetry_source", "SIMULATED"),
            "is_simulated": m.get("telemetry_source", "SIMULATED") == "SIMULATED",
            "last_hardware_ping": m.get("last_hardware_ping", None),
            "feature_compatibility": compat
        },
        "prediction_rf": preds["random_forest"],
        "prediction_xgb": preds["xgboost"],
        "consensus": preds["consensus"],
        "shap": shap_info,
        "rul": rul,
        "feature_compatibility": compat,
        "history": m.get("history", [])
    }

@app.post("/api/machines/register")
def register_machine(
    req: RegisterMachineRequest,
    current_user: Dict[str, Any] = Depends(require_roles(["organiser", "user", "admin"]))
):
    """
    Registers a new industrial machine persistently into the fleet dashboard.
    Restricted to Organisers, Users, and Administrators.
    """
    default_sensors = [
        {"key": "air_temperature_k", "label": "Air Temperature", "unit": "K", "min": 295.0, "max": 305.0, "nominal": 298.5},
        {"key": "process_temperature_k", "label": "Process Temperature", "unit": "K", "min": 305.0, "max": 315.0, "nominal": 308.6},
        {"key": "rotational_speed_rpm", "label": "Spindle / Rotor Speed", "unit": "RPM", "min": 1100.0, "max": 2800.0, "nominal": 1500.0},
        {"key": "torque_nm", "label": "Operating Torque", "unit": "Nm", "min": 10.0, "max": 75.0, "nominal": 40.0},
        {"key": "tool_wear_min", "label": "Tool Wear Accumulated", "unit": "min", "min": 0.0, "max": 250.0, "nominal": 60.0}
    ]
    sensor_defs = req.sensor_definitions if req.sensor_definitions and len(req.sensor_definitions) > 0 else default_sensors

    machine_payload = {
        "id": req.id.strip().upper(),
        "name": req.name.strip(),
        "industry": req.industry.strip(),
        "type": req.type.strip(),
        "location": req.location.strip(),
        "description": req.description.strip() or f"{req.type} operational asset stationed at {req.location}",
        "sensor_definitions": sensor_defs,
        "readings": req.readings or {s["key"]: float(s.get("nominal", 0.0)) for s in sensor_defs}
    }

    try:
        new_machine = data_manager.add_machine(machine_payload)
        preds = ml_engine.predict_both(new_machine["readings"])
        rul = ml_engine.estimate_rul(new_machine["readings"])
        return {
            "success": True,
            "message": f"Machine '{new_machine['name']}' ({new_machine['id']}) successfully registered.",
            "machine": {
                **new_machine,
                "prediction_rf": preds["random_forest"],
                "prediction_xgb": preds["xgboost"],
                "consensus": preds["consensus"],
                "rul": {
                    "hours": rul["estimated_rul_hours"],
                    "cycles": rul["estimated_rul_cycles"],
                    "recommendation": rul["recommendation"]
                }
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Machine registration failed: {str(e)}")

@app.put("/api/machines/{machine_id}/sensors")
def update_machine_sensor_parameters(
    machine_id: str,
    req: UpdateSensorsConfigRequest,
    current_user: Dict[str, Any] = Depends(require_roles(["organiser", "user", "admin"]))
):
    """
    Allows adding, editing, or removing sensor parameters for any machine.
    Restricted to Organisers, Users, and Admins.
    """
    if not req.sensor_definitions or len(req.sensor_definitions) == 0:
        raise HTTPException(status_code=400, detail="Sensor definitions list cannot be empty.")

    success = data_manager.update_machine_sensor_definitions(machine_id, req.sensor_definitions)
    if not success:
        raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found")

    updated = data_manager.get_machine(machine_id)
    return {
        "success": True,
        "message": f"Sensor parameters updated successfully for machine {machine_id}",
        "sensor_definitions": updated["sensor_definitions"]
    }

@app.post("/api/machines/{machine_id}/update-sensors")
def update_sensors(
    machine_id: str,
    req: TelemetryUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Updates operational sensor readings.
    Workers are restricted to updating readings for their assigned machines only.
    Workers cannot alter sensor configuration definitions or metadata.
    """
    check_machine_access(machine_id, current_user)

    m = data_manager.get_machine(machine_id)
    if not m:
        raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found")

    # Validate that only known sensor keys are present in readings
    allowed_keys = {s["key"] for s in m.get("sensor_definitions", [])}
    for k in req.readings.keys():
        if k not in allowed_keys:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown sensor parameter '{k}'. Workers can only update configured sensor readings."
            )

    updated = data_manager.update_machine_readings(machine_id, req.readings, source=req.source or "MANUAL")
    return {"success": True, "machine": updated}

# ----------------- Hardware IoT Telemetry Ingestion -----------------

@app.post("/api/machines/{machine_id}/telemetry/hardware")
def ingest_hardware_telemetry(
    machine_id: str,
    readings: Dict[str, float],
    x_device_key: Optional[str] = Header(None, alias="X-Device-Key")
):
    """
    Direct isolated ingestion endpoint for physical IoT sensors / hardware gateways.
    Requires device-specific hardware API key (X-Device-Key).
    Never accepts or uses user session tokens.
    Marks machine telemetry as HARDWARE_CONNECTED and locks out synthetic simulation overwrite.
    """
    if not x_device_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Hardware device authentication required. Provide 'X-Device-Key' header."
        )

    if not auth_service.verify_device_credential(machine_id, x_device_key.strip()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or revoked hardware device key for machine '{machine_id}'."
        )

    m = data_manager.get_machine(machine_id)
    if not m:
        raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found")

    # Validate sensor names against machine's configured definitions
    allowed_keys = {s["key"] for s in m.get("sensor_definitions", [])}
    for k in readings.keys():
        if k not in allowed_keys:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sensor parameter '{k}' is not defined for machine '{machine_id}'."
            )

    updated = data_manager.update_machine_readings(machine_id, readings, source="HARDWARE")
    return {
        "success": True,
        "message": f"Hardware telemetry locked for machine {machine_id}",
        "connection_status": "HARDWARE_CONNECTED",
        "telemetry_source": "HARDWARE",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "machine": updated
    }

# ----------------- Predictions, SHAP, RUL & History -----------------

@app.post("/api/predictions/manual")
def manual_prediction(
    req: ManualPredictRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Performs manual sensor input and prediction:
    - Enforces worker machine boundary access control
    - Validates values against machine's configured sensor definitions
    - Evaluates using existing Random Forest and XGBoost models
    - Computes SHAP game-theoretic explainability
    - Computes Remaining Useful Life (RUL) trajectory
    - Saves prediction history persistently
    """
    check_machine_access(req.machine_id, current_user)

    m = data_manager.get_machine(req.machine_id)
    if not m:
        raise HTTPException(status_code=404, detail=f"Machine '{req.machine_id}' not found.")

    readings = dict(req.readings)
    validation_warnings = []

    for s in m.get("sensor_definitions", []):
        key = s["key"]
        val = readings.get(key)
        if val is None:
            readings[key] = float(s.get("nominal", 0.0))
        else:
            try:
                num_val = float(val)
                readings[key] = num_val
                min_val = float(s.get("min", 0.0))
                max_val = float(s.get("max", 99999.0))
                if num_val < min_val or num_val > max_val:
                    validation_warnings.append(
                        f"Sensor '{s.get('label', key)}' value {num_val} {s.get('unit', '')} is outside typical envelope [{min_val}, {max_val}]."
                    )
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail=f"Invalid numeric input for sensor '{s.get('label', key)}': {val}")

    preds = ml_engine.predict_both(readings)
    shap_info = ml_engine.explain_shap(readings, "xgboost")
    rul = ml_engine.estimate_rul(readings)

    history_record = {
        "machine_id": m["id"],
        "machine_name": m["name"],
        "industry": m.get("industry", ""),
        "type": m.get("type", ""),
        "location": m.get("location", "Plant Operations Floor"),
        "operator": current_user.get("full_name") or req.operator or "Operator",
        "role": current_user.get("role") or req.role or "worker",
        "notes": req.notes or "",
        "readings": readings,
        "predictions": preds,
        "top_shap_driver": shap_info.get("top_risk_driver", "N/A"),
        "shap_features": shap_info.get("features", []),
        "rul_hours": rul.get("estimated_rul_hours", 0.0),
        "rul_cycles": rul.get("estimated_rul_cycles", 0),
        "recommendation": rul.get("recommendation", ""),
        "validation_warnings": validation_warnings
    }
    saved_record = prediction_history_store.add_record(history_record)

    return {
        "success": True,
        "record_id": saved_record.get("id"),
        "timestamp": saved_record.get("timestamp"),
        "machine_id": m["id"],
        "machine_name": m["name"],
        "readings": readings,
        "predictions": preds,
        "shap_explanation": shap_info,
        "rul_estimation": rul,
        "validation_warnings": validation_warnings
    }

@app.get("/api/predictions/history")
def get_prediction_history(
    machine_id: Optional[str] = None,
    limit: int = 50,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_role = (current_user.get("role") or "").lower()
    if user_role == "worker":
        assigned = set(m.strip().upper() for m in current_user.get("assigned_machines", []))
        if machine_id and machine_id.strip().upper() not in assigned:
            raise HTTPException(status_code=403, detail="Access denied: Machine not assigned to worker.")
        history = prediction_history_store.get_history(machine_id=machine_id, limit=limit)
        return [h for h in history if h.get("machine_id", "").strip().upper() in assigned]

    return prediction_history_store.get_history(machine_id=machine_id, limit=limit)

@app.post("/api/predict")
def predict_custom(req: PredictionRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    data_dict = req.dict()
    preds = ml_engine.predict_both(data_dict)
    shap_info = ml_engine.explain_shap(data_dict, "xgboost")
    rul = ml_engine.estimate_rul(data_dict)

    return {
        "input_features": data_dict,
        "predictions": preds,
        "shap_explanation": shap_info,
        "rul_estimation": rul
    }

@app.get("/api/shap/{machine_id}")
def get_machine_shap(machine_id: str, model: str = "xgboost", current_user: Dict[str, Any] = Depends(get_current_user)):
    check_machine_access(machine_id, current_user)
    m = data_manager.get_machine(machine_id)
    if not m:
        raise HTTPException(status_code=404, detail="Machine not found")

    shap_info = ml_engine.explain_shap(m["readings"], model)
    return shap_info

@app.get("/api/rul/{machine_id}")
def get_machine_rul(machine_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    check_machine_access(machine_id, current_user)
    m = data_manager.get_machine(machine_id)
    if not m:
        raise HTTPException(status_code=404, detail="Machine not found")

    rul_info = ml_engine.estimate_rul(m["readings"])
    return rul_info

# ----------------- Alerts & Notifications Endpoints -----------------

@app.get("/api/alerts")
def get_alerts(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_role = (current_user.get("role") or "").lower()
    if user_role == "worker":
        assigned = set(m.strip().upper() for m in current_user.get("assigned_machines", []))
        return [a for a in alerts_db if a.get("machine_id", "").strip().upper() in assigned]
    return alerts_db

@app.post("/api/alerts/send")
def send_alert_to_worker(
    req: SendAlertRequest,
    current_user: Dict[str, Any] = Depends(require_roles(["organiser", "user", "admin"]))
):
    """
    Company Organiser dispatches an alert to the assigned worker for the machine.
    Dynamically resolves worker's email from auth.db or configurable fallback.
    """
    m = data_manager.get_machine(req.machine_id)
    if not m:
        raise HTTPException(status_code=404, detail="Machine not found")

    preds = ml_engine.predict_both(m["readings"])
    shap_info = ml_engine.explain_shap(m["readings"], "xgboost")
    rul = ml_engine.estimate_rul(m["readings"])

    # Dynamically resolve recipient email via auth_service
    resolved_email = req.recipient_email or auth_service.get_assigned_worker_email(m["id"]) or DEFAULT_ALERT_EMAIL

    alert_id = f"ALT-{1000 + len(alerts_db) + 1}"
    alert_record = {
        "id": alert_id,
        "machine_id": m["id"],
        "machine_name": m["name"],
        "severity": req.severity.upper(),
        "sender": current_user.get("full_name") or req.sender or "Company Organiser",
        "recipient": resolved_email,
        "message": req.message,
        "rf_probability": preds["random_forest"]["failure_probability"],
        "xgb_probability": preds["xgboost"]["failure_probability"],
        "rul_hours": rul["estimated_rul_hours"],
        "top_shap_driver": shap_info["top_risk_driver"],
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "status": "SENT",
        "email_dispatched": True,
        "worker_acknowledged": False
    }

    email_log = email_service.send_worker_alert_email(alert_record)
    alert_record["email_log_id"] = email_log["id"]
    alert_record["delivery_status"] = email_log["status"]

    alerts_db.insert(0, alert_record)

    return {
        "success": True,
        "message": f"Alert successfully dispatched to {resolved_email}",
        "alert": alert_record,
        "email_log": email_log
    }

@app.post("/api/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    target_alert = None
    for a in alerts_db:
        if a["id"] == alert_id:
            target_alert = a
            break

    if not target_alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    user_role = (current_user.get("role") or "").lower()
    if user_role == "worker":
        check_machine_access(target_alert["machine_id"], current_user)

    target_alert["worker_acknowledged"] = True
    target_alert["status"] = "ACKNOWLEDGED_BY_WORKER"
    target_alert["acknowledged_by"] = current_user.get("full_name", current_user.get("id"))
    target_alert["acknowledged_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    return {"success": True, "alert": target_alert}

@app.get("/api/email-logs")
def get_email_logs(current_user: Dict[str, Any] = Depends(require_roles(["organiser", "user", "admin"]))):
    """
    Restricted email audit logs. Workers are not permitted to view audit logs.
    """
    return {
        "total_dispatched": len(email_service.get_logs()),
        "logs": email_service.get_logs()
    }

@app.post("/api/simulation/tick")
def simulation_tick(current_user: Dict[str, Any] = Depends(require_roles(["organiser", "user", "admin"]))):
    """
    Advances machine simulation for testing. Restricted to Organisers, Users, and Admins.
    """
    updated = data_manager.tick_simulation()
    return {"success": True, "count": len(updated)}

# ----------------- Secure In-Band WebSocket Telemetry -----------------

@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    """
    WebSocket endpoint for live telemetry streaming.
    Zero tokens in URL query params or log entries.
    Handshake requires an in-band authentication frame within 5 seconds:
    { "action": "AUTHENTICATE", "token": "<session_token>" }
    Enforces machine scoping for workers so workers only receive telemetry
    for machines assigned to them.
    """
    await websocket.accept()
    user = None

    try:
        # Wait up to 5 seconds for in-band auth frame
        auth_msg = await asyncio.wait_for(websocket.receive_json(), timeout=5.0)
        if not isinstance(auth_msg, dict) or auth_msg.get("action") != "AUTHENTICATE":
            await websocket.send_json({
                "type": "AUTH_ERROR",
                "message": "Protocol error: First frame must be an AUTHENTICATE action."
            })
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        token = (auth_msg.get("token") or "").strip()
        user = auth_service.validate_session(token)
        if not user:
            await websocket.send_json({
                "type": "AUTH_ERROR",
                "message": "Authentication failed: Invalid, expired, or revoked session token."
            })
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        await websocket.send_json({
            "type": "AUTH_OK",
            "message": f"Authenticated as {user['full_name']} ({user['role']})",
            "user_id": user["id"],
            "role": user["role"],
            "assigned_machines": user.get("assigned_machines", [])
        })

    except asyncio.TimeoutError:
        try:
            await websocket.send_json({
                "type": "AUTH_ERROR",
                "message": "Authentication timeout: Handshake frame not received within 5 seconds."
            })
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        except Exception:
            pass
        return
    except Exception:
        try:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        except Exception:
            pass
        return

    # Authenticated streaming loop
    try:
        while True:
            # Advance simulation slightly and push latest machine data
            data_manager.tick_simulation()
            all_machines = data_manager.get_all_machines()

            if user["role"] == "worker":
                assigned_set = set(m.strip().upper() for m in user.get("assigned_machines", []))
                scoped_machines = [m for m in all_machines if m["id"].strip().upper() in assigned_set]
            else:
                scoped_machines = all_machines

            machines_payload = []
            for m in scoped_machines:
                preds = ml_engine.predict_both(m["readings"])
                machines_payload.append({
                    "id": m["id"],
                    "readings": m["readings"],
                    "consensus": preds["consensus"],
                    "rf_prob": preds["random_forest"]["failure_probability"],
                    "xgb_prob": preds["xgboost"]["failure_probability"]
                })

            await websocket.send_json({
                "type": "TELEMETRY_UPDATE",
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "machines": machines_payload
            })
            await asyncio.sleep(3.0)

    except WebSocketDisconnect:
        pass
    except Exception:
        pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
