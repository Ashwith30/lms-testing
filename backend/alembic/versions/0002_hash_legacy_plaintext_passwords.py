"""hash legacy plaintext passwords to bcrypt

Revision ID: 0002_hash_legacy_plaintext_passwords
Revises: 0001_fix_users_password_hash
Create Date: 2026-10-10 21:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sys
import os

# Ensure backend root is available for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

try:
    from auth import hash_password
except ImportError:
    import bcrypt
    def hash_password(password: str) -> str:
        if not password:
            return ""
        pwd_bytes = password.encode("utf-8")[:72]
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


# revision identifiers, used by Alembic.
revision: str = '0002_hash_legacy_plaintext_passwords'
down_revision: Union[str, None] = '0001_fix_users_password_hash'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'users' in tables:
        columns = [col['name'] for col in inspector.get_columns('users')]

        # 1. Migrate legacy plaintext passwords in password_hash column
        if 'password_hash' in columns:
            rows = conn.execute(
                sa.text("SELECT id, password_hash FROM users WHERE password_hash IS NOT NULL AND password_hash != ''")
            ).fetchall()

            for row in rows:
                user_id, stored = row[0], row[1]
                # Check if already a valid bcrypt hash
                if isinstance(stored, str) and stored.startswith(("$2b$", "$2a$", "$2y$")) and len(stored) == 60:
                    continue  # Already valid bcrypt hash, never double-hash

                # Convert plaintext password to secure bcrypt hash
                new_hash = hash_password(str(stored))
                conn.execute(
                    sa.text("UPDATE users SET password_hash = :new_hash WHERE id = :user_id"),
                    {"new_hash": new_hash, "user_id": user_id}
                )

        # 2. Check if legacy 'password' column exists and populate any missing hashes
        if 'password' in columns:
            legacy_rows = conn.execute(
                sa.text(
                    "SELECT id, password FROM users "
                    "WHERE password IS NOT NULL AND password != '' "
                    "AND (password_hash IS NULL OR password_hash = '')"
                )
            ).fetchall()

            for row in legacy_rows:
                user_id, plain = row[0], row[1]
                new_hash = hash_password(str(plain))
                conn.execute(
                    sa.text("UPDATE users SET password_hash = :new_hash WHERE id = :user_id"),
                    {"new_hash": new_hash, "user_id": user_id}
                )

            # Purge plaintext passwords from legacy column so credentials are not retained in plaintext
            conn.execute(sa.text("UPDATE users SET password = NULL WHERE password IS NOT NULL"))


def downgrade() -> None:
    # Intentionally non-destructive: cannot downgrade one-way cryptographic bcrypt hashes back to plaintext.
    pass
