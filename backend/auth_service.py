import os
import json
import secrets
import hashlib
import hmac
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

from database import get_db_connection, init_db, hash_pbkdf2, DEFAULT_PBKDF2_ITERATIONS

SESSION_EXPIRY_HOURS = 12

class AuthService:
    def __init__(self):
        init_db()

    def _sanitize_user(self, row) -> Dict[str, Any]:
        """
        Guarantees that password hashes, salts, and secret metadata are NEVER returned in API responses.
        """
        if row is None:
            return None
        assigned = []
        if "assigned_machines" in row.keys() and row["assigned_machines"]:
            try:
                assigned = json.loads(row["assigned_machines"])
            except Exception:
                assigned = []

        return {
            "id": row["id"],
            "username": row["username"],
            "email": row["email"],
            "employee_id": row["employee_id"],
            "full_name": row["full_name"],
            "role": row["role"],
            "department": row["department"] or "",
            "assigned_machines": assigned,
            "status": row["status"],
            "created_at": row["created_at"],
            "last_login": row["last_login"]
        }

    def verify_password(self, password: str, stored_hash: str, salt_hex: str, iterations: int, hash_algo: str) -> bool:
        if not password or not stored_hash:
            return False
        if hash_algo == "pbkdf2_sha256":
            try:
                salt_bytes = bytes.fromhex(salt_hex)
                computed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_bytes, iterations)
                return hmac.compare_digest(computed.hex(), stored_hash)
            except Exception:
                return False
        elif hash_algo == "legacy_sha256":
            computed = hashlib.sha256(password.encode("utf-8")).hexdigest()
            return hmac.compare_digest(computed, stored_hash)
        return False

    def _upgrade_legacy_password(self, user_id: str, password: str):
        """
        Upgrades legacy SHA-256 password to PBKDF2 with 600,000 iterations and a unique salt.
        """
        try:
            pw_hash, salt = hash_pbkdf2(password, DEFAULT_PBKDF2_ITERATIONS)
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE users SET password_hash = ?, salt = ?, iterations = ?, hash_algo = 'pbkdf2_sha256'
            WHERE id = ?;
            """, (pw_hash, salt, DEFAULT_PBKDF2_ITERATIONS, user_id))
            conn.commit()
            conn.close()
            print(f"[AuthService] Account '{user_id}' upgraded to PBKDF2 (600,000 iterations).")
        except Exception as e:
            print(f"[AuthService] Error upgrading password hash for {user_id}: {e}")

    def create_session(self, user_id: str, role: str) -> str:
        token = secrets.token_urlsafe(32)
        expires_at = (datetime.now() + timedelta(hours=SESSION_EXPIRY_HOURS)).strftime("%Y-%m-%d %H:%M:%S")

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO sessions (token, user_id, role, created_at, expires_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?);
        """, (token, user_id, role, expires_at))
        conn.commit()
        conn.close()
        return token

    def validate_session(self, token: str) -> Optional[Dict[str, Any]]:
        if not token or not isinstance(token, str):
            return None

        conn = get_db_connection()
        cursor = conn.cursor()
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute("""
        SELECT u.*, s.token as session_token
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ? AND s.expires_at > ? AND u.status = 'ACTIVE';
        """, (token.strip(), now_str))

        row = cursor.fetchone()
        conn.close()

        if row:
            return self._sanitize_user(row)
        return None

    def destroy_session(self, token: str) -> bool:
        if not token:
            return False
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE token = ?;", (token.strip(),))
        conn.commit()
        conn.close()
        return True

    def revoke_all_user_sessions(self, user_id: str) -> int:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE user_id = ?;", (user_id,))
        count = cursor.rowcount
        conn.commit()
        conn.close()
        return count

    def authenticate_worker(self, employee_id: str, password: str) -> Dict[str, Any]:
        emp_clean = employee_id.strip()
        if not emp_clean or not password:
            raise ValueError("Employee ID and password are required.")

        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if user exists under any role
        cursor.execute("""
        SELECT * FROM users
        WHERE (LOWER(employee_id) = LOWER(?) OR LOWER(username) = LOWER(?) OR LOWER(id) = LOWER(?) OR LOWER(email) = LOWER(?));
        """, (emp_clean, emp_clean, emp_clean, emp_clean))
        user = cursor.fetchone()
        conn.close()

        if not user:
            raise ValueError("Invalid Employee ID or password.")

        if user["role"] != "worker":
            if user["role"] in ["user", "organiser"]:
                raise ValueError(f"Account '{user['username']}' is registered as a Company User. Please log in via the Company User Portal.")
            elif user["role"] == "admin":
                raise ValueError(f"Account '{user['username']}' is an Administrator. Please log in via the Admin Console.")

        if user["status"] == "SUSPENDED":
            raise ValueError("Your worker account has been suspended by an administrator. Please contact your operations supervisor.")

        if not self.verify_password(password, user["password_hash"], user["salt"], user["iterations"], user["hash_algo"]):
            raise ValueError("Invalid Employee ID or password.")

        if user["hash_algo"] == "legacy_sha256":
            self._upgrade_legacy_password(user["id"], password)

        # Update last login
        self._record_login(user["id"])

        token = self.create_session(user["id"], user["role"])
        return {
            "token": token,
            "user": self._sanitize_user(user)
        }

    def authenticate_user(self, username_or_email: str, password: str) -> Dict[str, Any]:
        cred_clean = username_or_email.strip().lower()
        if not cred_clean or not password:
            raise ValueError("Username/Email and password are required.")

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        SELECT * FROM users
        WHERE (LOWER(username) = ? OR LOWER(email) = ? OR LOWER(id) = ?);
        """, (cred_clean, cred_clean, cred_clean))
        user = cursor.fetchone()
        conn.close()

        if not user:
            raise ValueError("Invalid username/email or password.")

        if user["role"] == "worker":
            raise ValueError(f"Account '{user['username']}' ({user.get('email', '')}) is registered as a Worker. Please log in via the Worker Portal using Employee ID '{user['employee_id'] or user['id']}'.")

        if user["role"] == "admin":
            raise ValueError(f"Account '{user['username']}' is an Administrator. Please log in via the Admin Console.")

        if user["status"] == "SUSPENDED":
            raise ValueError("Your account has been suspended by an administrator.")

        if not self.verify_password(password, user["password_hash"], user["salt"], user["iterations"], user["hash_algo"]):
            raise ValueError("Invalid username/email or password.")

        if user["hash_algo"] == "legacy_sha256":
            self._upgrade_legacy_password(user["id"], password)

        self._record_login(user["id"])

        token = self.create_session(user["id"], user["role"])
        return {
            "token": token,
            "user": self._sanitize_user(user)
        }

    def authenticate_admin(self, username: str, password: str) -> Dict[str, Any]:
        u_clean = username.strip().lower()
        if not u_clean or not password:
            raise ValueError("Administrator username and password are required.")

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        SELECT * FROM users
        WHERE (LOWER(username) = ? OR LOWER(email) = ? OR LOWER(id) = ?);
        """, (u_clean, u_clean, u_clean))
        admin = cursor.fetchone()
        conn.close()

        if not admin:
            raise ValueError("Invalid administrator credentials.")

        if admin["role"] != "admin":
            raise ValueError(f"Account '{admin['username']}' does not have Administrator privileges. Please sign in via the Worker or User portal.")

        if admin["status"] == "SUSPENDED":
            raise ValueError("Administrator account is suspended.")

        if not self.verify_password(password, admin["password_hash"], admin["salt"], admin["iterations"], admin["hash_algo"]):
            raise ValueError("Invalid administrator credentials.")

        self._record_login(admin["id"])

        token = self.create_session(admin["id"], "admin")
        return {
            "token": token,
            "user": self._sanitize_user(admin)
        }

    def _record_login(self, user_id: str):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?;", (user_id,))
            conn.commit()
            conn.close()
        except Exception:
            pass

    # Hardware Device Verification
    def verify_device_credential(self, machine_id: str, device_key: str) -> bool:
        if not machine_id or not device_key:
            return False

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM device_credentials WHERE machine_id = ? AND status = 'ACTIVE';", (machine_id,))
        row = cursor.fetchone()

        if not row:
            conn.close()
            return False

        salt_bytes = bytes.fromhex(row["salt"])
        computed_hash = hashlib.pbkdf2_hmac("sha256", device_key.encode("utf-8"), salt_bytes, 100000).hex()
        is_valid = hmac.compare_digest(computed_hash, row["api_key_hash"])

        if is_valid:
            cursor.execute("UPDATE device_credentials SET last_ping = CURRENT_TIMESTAMP WHERE device_id = ?;", (row["device_id"],))
            conn.commit()

        conn.close()
        return is_valid

    # Dynamic Worker Alert Email Resolution
    def get_assigned_worker_email(self, machine_id: str) -> Optional[str]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        SELECT email, assigned_machines FROM users
        WHERE role = 'worker' AND status = 'ACTIVE' AND email IS NOT NULL AND email != '';
        """)
        rows = cursor.fetchall()
        conn.close()

        for r in rows:
            try:
                machines = json.loads(r["assigned_machines"])
                if any(m.strip().upper() == machine_id.strip().upper() for m in machines):
                    return r["email"]
            except Exception:
                continue
        return None

    # Admin Management
    def list_all_accounts(self) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users ORDER BY created_at DESC;")
        rows = cursor.fetchall()
        conn.close()
        return [self._sanitize_user(r) for r in rows]

    def create_account(self, username: str, full_name: str, password: str, role: str, email: Optional[str] = None, employee_id: Optional[str] = None, department: str = "", assigned_machines: List[str] = None) -> Dict[str, Any]:
        u_clean = username.strip().lower()
        e_clean = (email.strip().lower()) if email else None
        emp_clean = (employee_id.strip()) if employee_id else None

        if not u_clean or not password or not full_name:
            raise ValueError("Username, Full Name, and Password are required.")

        if role not in ["worker", "user", "organiser", "admin"]:
            raise ValueError(f"Invalid role: {role}")

        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters long.")

        conn = get_db_connection()
        cursor = conn.cursor()

        # Check uniqueness
        cursor.execute("SELECT id FROM users WHERE LOWER(username) = ?;", (u_clean,))
        if cursor.fetchone():
            conn.close()
            raise ValueError(f"Username '{u_clean}' is already taken.")

        if e_clean:
            cursor.execute("SELECT id FROM users WHERE LOWER(email) = ?;", (e_clean,))
            if cursor.fetchone():
                conn.close()
                raise ValueError(f"Email '{e_clean}' is already registered.")

        if emp_clean:
            cursor.execute("SELECT id FROM users WHERE LOWER(employee_id) = LOWER(?);", (emp_clean,))
            if cursor.fetchone():
                conn.close()
                raise ValueError(f"Employee ID '{emp_clean}' is already registered.")

        # ID generation
        prefix = "WRK" if role == "worker" else ("ADM" if role == "admin" else "USR")
        user_id = f"{prefix}-{secrets.randbelow(9000) + 1000}"
        if not emp_clean and role == "worker":
            emp_clean = user_id

        pw_hash, salt = hash_pbkdf2(password, DEFAULT_PBKDF2_ITERATIONS)
        assigned_json = json.dumps(assigned_machines or [])

        cursor.execute("""
        INSERT INTO users (id, username, email, employee_id, full_name, password_hash, salt, iterations, hash_algo, role, department, assigned_machines, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pbkdf2_sha256', ?, ?, ?, 'ACTIVE');
        """, (user_id, u_clean, e_clean, emp_clean, full_name.strip(), pw_hash, salt, DEFAULT_PBKDF2_ITERATIONS, role, department.strip(), assigned_json))

        conn.commit()
        cursor.execute("SELECT * FROM users WHERE id = ?;", (user_id,))
        created = cursor.fetchone()
        conn.close()

        return self._sanitize_user(created)

    def set_account_status(self, target_user_id: str, new_status: str, admin_user_id: str) -> Dict[str, Any]:
        if target_user_id == admin_user_id:
            raise ValueError("Administrators cannot suspend their own account.")

        if new_status not in ["ACTIVE", "SUSPENDED"]:
            raise ValueError("Status must be either 'ACTIVE' or 'SUSPENDED'.")

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?;", (target_user_id,))
        target = cursor.fetchone()

        if not target:
            conn.close()
            raise ValueError(f"Account '{target_user_id}' not found.")

        cursor.execute("UPDATE users SET status = ? WHERE id = ?;", (new_status, target_user_id))
        conn.commit()

        # If suspended: immediately revoke all active sessions!
        if new_status == "SUSPENDED":
            cursor.execute("DELETE FROM sessions WHERE user_id = ?;", (target_user_id,))
            conn.commit()
            print(f"[AuthService] Account '{target_user_id}' suspended. Active sessions revoked.")

        cursor.execute("SELECT * FROM users WHERE id = ?;", (target_user_id,))
        updated = cursor.fetchone()
        conn.close()

        return self._sanitize_user(updated)

    def assign_worker_machines(self, worker_user_id: str, machine_ids: List[str]) -> Dict[str, Any]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ? AND role = 'worker';", (worker_user_id,))
        worker = cursor.fetchone()

        if not worker:
            conn.close()
            raise ValueError(f"Worker account '{worker_user_id}' not found.")

        clean_ids = [m.strip().upper() for m in machine_ids if m.strip()]
        cursor.execute("UPDATE users SET assigned_machines = ? WHERE id = ?;", (json.dumps(clean_ids), worker_user_id))
        conn.commit()

        cursor.execute("SELECT * FROM users WHERE id = ?;", (worker_user_id,))
        updated = cursor.fetchone()
        conn.close()

        return self._sanitize_user(updated)

    def delete_account(self, target_user_id: str, admin_user_id: str) -> bool:
        if target_user_id == admin_user_id:
            raise ValueError("Administrators cannot delete their own account.")

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE user_id = ?;", (target_user_id,))
        cursor.execute("DELETE FROM users WHERE id = ?;", (target_user_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return deleted

auth_service = AuthService()
