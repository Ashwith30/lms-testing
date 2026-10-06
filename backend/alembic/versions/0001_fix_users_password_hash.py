"""fix users password_hash and user attributes

Revision ID: 0001_fix_users_password_hash
Revises: 
Create Date: 2026-10-06 20:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0001_fix_users_password_hash'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    
    if 'users' in tables:
        columns = [col['name'] for col in inspector.get_columns('users')]
        is_sqlite = conn.dialect.name == "sqlite"
        
        if is_sqlite:
            with op.batch_alter_table('users') as batch_op:
                if 'password_hash' not in columns:
                    batch_op.add_column(sa.Column('password_hash', sa.String(length=255), nullable=True))
                if 'status' not in columns:
                    batch_op.add_column(sa.Column('status', sa.String(length=50), server_default='active', nullable=True))
                if 'lastLoginAt' not in columns:
                    batch_op.add_column(sa.Column('lastLoginAt', sa.String(length=64), nullable=True))
                if 'updatedAt' not in columns:
                    batch_op.add_column(sa.Column('updatedAt', sa.String(length=64), nullable=True))
                if 'name' in columns:
                    batch_op.alter_column('name', existing_type=sa.String(), nullable=True)
        else:
            if 'password_hash' not in columns:
                op.add_column('users', sa.Column('password_hash', sa.String(length=255), nullable=True))
            if 'status' not in columns:
                op.add_column('users', sa.Column('status', sa.String(length=50), server_default='active', nullable=True))
            if 'lastLoginAt' not in columns:
                op.add_column('users', sa.Column('lastLoginAt', sa.String(length=64), nullable=True))
            if 'updatedAt' not in columns:
                op.add_column('users', sa.Column('updatedAt', sa.String(length=64), nullable=True))
            if 'name' in columns:
                op.alter_column('users', 'name', existing_type=sa.String(), nullable=True)
            
        # Data backfill: If legacy password column exists, copy to password_hash
        if 'password' in columns:
            op.execute(
                "UPDATE users SET password_hash = password "
                "WHERE (password_hash IS NULL OR password_hash = '') AND password IS NOT NULL"
            )


def downgrade() -> None:
    # Intentionally non-destructive: do not drop columns to prevent data loss of user passwords and login state.
    pass
