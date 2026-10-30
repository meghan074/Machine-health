from __future__ import annotations
import sqlite3
import os
import json
import secrets
import hashlib
from datetime import datetime
from typing import Tuple

DB_PATH = os.path.join(os.path.dirname(__file__), "auth.db")
USERS_JSON_PATH = os.path.join(os.path.dirname(__file__), "users_store.json")

DEFAULT_PBKDF2_ITERATIONS = 600000

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def hash_pbkdf2(password: str, iterations: int = DEFAULT_PBKDF2_ITERATIONS) -> Tuple[str, str]:
    salt_bytes = os.urandom(16)
    hash_bytes = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_bytes, iterations)
    return hash_bytes.hex(), salt_bytes.hex()

def hash_device_key(key: str) -> Tuple[str, str]:
    salt_bytes = os.urandom(16)
    hash_bytes = hashlib.pbkdf2_hmac("sha256", key.encode("utf-8"), salt_bytes, 100000)
    return hash_bytes.hex(), salt_bytes.hex()

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        employee_id TEXT UNIQUE,
        full_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        iterations INTEGER NOT NULL DEFAULT 600000,
        hash_algo TEXT NOT NULL DEFAULT 'pbkdf2_sha256',
        role TEXT NOT NULL CHECK(role IN ('worker', 'user', 'organiser', 'admin')),
        department TEXT,
        assigned_machines TEXT DEFAULT '[]',
        status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'SUSPENDED')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
    );
    """)

    # 2. Sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # 3. Device credentials table for isolated IoT hardware telemetry
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS device_credentials (
        device_id TEXT PRIMARY KEY,
        machine_id TEXT UNIQUE NOT NULL,
        api_key_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        device_name TEXT NOT NULL,
        status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'REVOKED')),
        last_ping DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Create indices
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);")

    conn.commit()

    # Migrate initial accounts if users table is empty
    cursor.execute("SELECT COUNT(*) FROM users;")
    user_count = cursor.fetchone()[0]

    if user_count == 0:
        print("[Database] Initializing auth.db with secure accounts...")
        _migrate_initial_accounts(cursor)
        conn.commit()

    # Check for optional environment variable admin bootstrap (idempotent, never resets existing)
    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'admin';")
    admin_count = cursor.fetchone()[0]
    if admin_count == 0:
        env_admin_user = os.environ.get("ADMIN_INITIAL_USERNAME")
        env_admin_pass = os.environ.get("ADMIN_INITIAL_PASSWORD")
        if env_admin_user and env_admin_pass:
            pw_hash, salt = hash_pbkdf2(env_admin_pass, DEFAULT_PBKDF2_ITERATIONS)
            admin_id = f"ADM-{secrets.randbelow(9000) + 1000}"
            cursor.execute("""
            INSERT INTO users (id, username, email, full_name, password_hash, salt, iterations, hash_algo, role, department, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pbkdf2_sha256', 'admin', 'System Administration', 'ACTIVE')
            """, (admin_id, env_admin_user.strip(), f"{env_admin_user.strip()}@system.local", "System Administrator", pw_hash, salt, DEFAULT_PBKDF2_ITERATIONS))
            conn.commit()
            print(f"[Database] Initial administrator provisioned from environment (username: {env_admin_user}).")

    # Seed default hardware device credentials if empty
    cursor.execute("SELECT COUNT(*) FROM device_credentials;")
    dev_count = cursor.fetchone()[0]
    if dev_count == 0:
        demo_machines = ["CNC-M14860", "CNC-L47181", "MOT-IND-01", "BRG-AUTO-03", "PUMP-HP-02", "COMP-GAS-05"]
        for m_id in demo_machines:
            # Deterministic demo device key for automated hardware testing: "devkey_" + machine_id.lower()
            demo_key = f"iot_hw_{m_id.lower().replace('-', '_')}"
            h_key, s_key = hash_device_key(demo_key)
            cursor.execute("""
            INSERT OR IGNORE INTO device_credentials (device_id, machine_id, api_key_hash, salt, device_name, status)
            VALUES (?, ?, ?, ?, ?, 'ACTIVE')
            """, (f"DEV-{m_id}", m_id, h_key, s_key, f"Edge IoT Gateway for {m_id}"))
        conn.commit()

    conn.close()

def _migrate_initial_accounts(cursor):
    """
    Safely seeds accounts with PBKDF2 600,000 iterations and imports users from users_store.json.
    """
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Seed Organiser / User with 600,000 iterations PBKDF2
    org_hash, org_salt = hash_pbkdf2("organiser123", DEFAULT_PBKDF2_ITERATIONS)
    cursor.execute("""
    INSERT INTO users (id, username, email, employee_id, full_name, password_hash, salt, iterations, hash_algo, role, department, assigned_machines, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pbkdf2_sha256', 'organiser', 'Fleet Operations', '[]', 'ACTIVE', ?)
    """, ("USR-1001", "organiser", "organiser@company.com", "EMP-ORG-01", "Company Organiser (Ops Lead)", org_hash, org_salt, DEFAULT_PBKDF2_ITERATIONS, now_str))

    # Seed Worker with 600,000 iterations PBKDF2
    wrk_assigned = json.dumps(["CNC-M14860", "CNC-L47181", "MOT-IND-01", "BRG-AUTO-03", "PUMP-HP-02", "COMP-GAS-05"])
    wrk_hash, wrk_salt = hash_pbkdf2("worker123", DEFAULT_PBKDF2_ITERATIONS)
    cursor.execute("""
    INSERT INTO users (id, username, email, employee_id, full_name, password_hash, salt, iterations, hash_algo, role, department, assigned_machines, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pbkdf2_sha256', 'worker', 'Machinery Maintenance', ?, 'ACTIVE', ?)
    """, ("WRK-2001", "worker_meghan", "nukameghan@gmail.com", "WRK-2001", "Industrial Maintenance Worker", wrk_hash, wrk_salt, DEFAULT_PBKDF2_ITERATIONS, wrk_assigned, now_str))

    # Import other records from users_store.json if present
    if os.path.exists(USERS_JSON_PATH):
        try:
            with open(USERS_JSON_PATH, "r", encoding="utf-8") as f:
                existing_users = json.load(f)
            for u in existing_users:
                email = u.get("email", "").strip().lower()
                if email in ["organiser@company.com", "nukameghan@gmail.com"]:
                    continue # already securely seeded with PBKDF2

                user_id = u.get("id") or f"USR-{secrets.randbelow(9000)+1000}"
                username = email.split("@")[0] if "@" in email else user_id.lower()
                emp_id = user_id if u.get("role") == "worker" else f"EMP-{user_id}"
                full_name = u.get("name") or "Operational Staff"
                role = "worker" if u.get("role") == "worker" else "user"
                dept = u.get("department", "Plant Operations")
                assigned = json.dumps(u.get("assigned_machines", []))
                stored_hash = u.get("password_hash", "")

                cursor.execute("""
                INSERT OR IGNORE INTO users (id, username, email, employee_id, full_name, password_hash, salt, iterations, hash_algo, role, department, assigned_machines, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, '', 1, 'legacy_sha256', ?, ?, ?, 'ACTIVE', ?)
                """, (user_id, username, email, emp_id, full_name, stored_hash, role, dept, assigned, now_str))
        except Exception as e:
            print(f"[Database] Warning importing users_store.json: {e}")

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at", DB_PATH)
