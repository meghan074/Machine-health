import os
import json
import hashlib
from datetime import datetime
from email_service import WORKER_EMAIL

USERS_FILE = os.path.join(os.path.dirname(__file__), "users_store.json")

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

WORKER_PERMISSIONS = [
    "view_assigned_machines",
    "manual_prediction",
    "view_shap",
    "view_rul",
    "receive_alerts",
    "acknowledge_alerts",
    "log_maintenance"
]

USER_PERMISSIONS = [
    "view_fleet_dashboard",
    "register_machines",
    "configure_sensors",
    "dispatch_alerts",
    "manual_prediction",
    "view_model_benchmarks",
    "view_audit_logs"
]

DEFAULT_USERS = [
    {
        "id": "USR-1001",
        "name": "Company Organiser (Ops Lead)",
        "email": "organiser@company.com",
        "password_hash": hash_password("organiser123"),
        "role": "organiser",
        "department": "Fleet Operations",
        "assigned_machines": [],
        "permissions": USER_PERMISSIONS,
        "created_at": "2024-01-01 00:00:00"
    },
    {
        "id": "WRK-2001",
        "name": "Industrial Maintenance Worker",
        "email": WORKER_EMAIL,
        "password_hash": hash_password("worker123"),
        "role": "worker",
        "department": "Machinery Maintenance",
        "assigned_machines": ["CNC-M14860", "CNC-L47181", "MOT-IND-01", "BRG-AUTO-03", "PUMP-HP-02", "COMP-GAS-05"],
        "permissions": WORKER_PERMISSIONS,
        "created_at": "2024-01-01 00:00:00"
    }
]

class AuthStore:
    def __init__(self, file_path=USERS_FILE):
        self.file_path = file_path
        self._ensure_storage()

    def _ensure_storage(self):
        if not os.path.exists(self.file_path):
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump(DEFAULT_USERS, f, indent=2)

    def _load_users(self):
        try:
            if os.path.exists(self.file_path):
                with open(self.file_path, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            print(f"[AuthStore] Error loading users: {e}")
        return DEFAULT_USERS

    def _save_users(self, users):
        try:
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump(users, f, indent=2)
            return True
        except Exception as e:
            print(f"[AuthStore] Error saving users: {e}")
            return False

    def register(self, name: str, email: str, password: str, role: str, department: str = "", assigned_machines: list = None):
        users = self._load_users()
        email_clean = email.strip().lower()
        role_clean = role.strip().lower()

        # Check existing email
        for u in users:
            if u["email"].lower() == email_clean:
                raise ValueError(f"An account with email '{email_clean}' is already registered.")

        if role_clean in ["worker", "technician"]:
            norm_role = "worker"
            perms = WORKER_PERMISSIONS
            user_id = f"WRK-{2000 + len(users) + 1}"
        else:
            norm_role = "user"
            perms = USER_PERMISSIONS
            user_id = f"USR-{1000 + len(users) + 1}"

        new_user = {
            "id": user_id,
            "name": name.strip(),
            "email": email_clean,
            "password_hash": hash_password(password),
            "role": norm_role,
            "department": department.strip() or ("Maintenance Operations" if norm_role == "worker" else "Engineering & Operations"),
            "assigned_machines": assigned_machines or (["CNC-M14860", "CNC-L47181", "MOT-IND-01", "BRG-AUTO-03", "PUMP-HP-02", "COMP-GAS-05"] if norm_role == "worker" else []),
            "permissions": perms,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        users.append(new_user)
        self._save_users(users)
        
        # Return public profile without password hash
        return self._sanitize_user(new_user)

    def authenticate(self, email: str, password: str = None, requested_role: str = None):
        users = self._load_users()
        email_clean = email.strip().lower() if email else ""
        
        # Look for user by email
        matched_user = None
        for u in users:
            if u["email"].lower() == email_clean:
                matched_user = u
                break

        if matched_user:
            # If password provided, verify hash
            if password:
                if matched_user["password_hash"] != hash_password(password):
                    raise ValueError("Invalid password.")
            return self._sanitize_user(matched_user)

        # Fallback by role if no email provided or legacy call
        if requested_role:
            r = requested_role.lower()
            if r in ["worker", "technician"]:
                target_roles = ["worker"]
            else:
                target_roles = ["organiser", "user", "admin"]
            for u in users:
                if u.get("role") in target_roles:
                    return self._sanitize_user(u)

        raise ValueError("User not found.")

    def get_user_by_email(self, email: str):
        users = self._load_users()
        for u in users:
            if u["email"].lower() == email.strip().lower():
                return self._sanitize_user(u)
        return None

    def get_all_users(self):
        users = self._load_users()
        return [self._sanitize_user(u) for u in users]

    def _sanitize_user(self, user):
        u_copy = dict(user)
        u_copy.pop("password_hash", None)
        return u_copy

auth_store = AuthStore()
