import sys
import os
import argparse
import getpass
import secrets
from database import get_db_connection, init_db, hash_pbkdf2, DEFAULT_PBKDF2_ITERATIONS

def create_admin(username, full_name, email, password):
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    username_clean = username.strip().lower()
    email_clean = (email.strip().lower()) if email else f"{username_clean}@system.local"

    cursor.execute("SELECT id FROM users WHERE username = ? OR email = ?;", (username_clean, email_clean))
    existing = cursor.fetchone()
    if existing:
        conn.close()
        print(f"[Error] An account with username '{username_clean}' or email '{email_clean}' already exists.")
        sys.exit(1)

    if len(password) < 8:
        conn.close()
        print("[Error] Password must be at least 8 characters long.")
        sys.exit(1)

    admin_id = f"ADM-{secrets.randbelow(9000) + 1000}"
    pw_hash, salt = hash_pbkdf2(password, DEFAULT_PBKDF2_ITERATIONS)

    cursor.execute("""
    INSERT INTO users (id, username, email, employee_id, full_name, password_hash, salt, iterations, hash_algo, role, department, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pbkdf2_sha256', 'admin', 'System Administration', 'ACTIVE');
    """, (admin_id, username_clean, email_clean, f"EMP-{admin_id}", full_name.strip(), pw_hash, salt, DEFAULT_PBKDF2_ITERATIONS))

    conn.commit()
    conn.close()

    print(f"\n[Success] Administrator account created successfully:")
    print(f"  Admin ID : {admin_id}")
    print(f"  Username : {username_clean}")
    print(f"  Name     : {full_name}")
    print(f"  Email    : {email_clean}")
    print(f"  Role     : admin")
    print(f"  Security : PBKDF2-HMAC-SHA256 (600,000 iterations with unique salt)")
    print("  Password is securely hashed. Never share credentials.\n")

def main():
    parser = argparse.ArgumentParser(description="Secure Administrator Account Provisioning Tool")
    parser.add_argument("--username", help="Admin username (e.g. admin_lead)")
    parser.add_argument("--name", help="Admin full name (e.g. 'Chief Reliability Officer')")
    parser.add_argument("--email", help="Admin email (optional)")
    parser.add_argument("--password", help="Admin password (if omitted, will be prompted securely)")

    args = parser.parse_args()

    username = args.username
    if not username:
        username = input("Enter Admin Username: ").strip()

    name = args.name
    if not name:
        name = input("Enter Admin Full Name: ").strip() or "Administrator"

    email = args.email

    password = args.password
    if not password:
        password = getpass.getpass("Enter Admin Password (min 8 chars): ")
        password_confirm = getpass.getpass("Confirm Admin Password: ")
        if password != password_confirm:
            print("[Error] Passwords do not match.")
            sys.exit(1)

    create_admin(username=username, full_name=name, email=email, password=password)

if __name__ == "__main__":
    main()
