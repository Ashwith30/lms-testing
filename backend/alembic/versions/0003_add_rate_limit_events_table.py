"""add rate_limit_events table for persistent multi-worker rate limiting

Revision ID: 0003_add_rate_limit_events
Revises: 0002_hash_legacy_plaintext_passwords
Create Date: 2026-10-16 22:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sys
import os

# Ensure backend root is available for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# revision identifiers, used by Alembic.
revision: str = '0003_add_rate_limit_events'
down_revision: Union[str, None] = '0002_hash_legacy_plaintext_passwords'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    
    if 'rate_limit_events' not in tables:
        op.create_table(
            'rate_limit_events',
            sa.Column('id', sa.String(length=64), primary_key=True),
            sa.Column('key', sa.String(length=255), nullable=False),
            sa.Column('scope', sa.String(length=50), nullable=False),
            sa.Column('timestamp', sa.Float(), nullable=False),
            sa.Column('createdAt', sa.String(length=64), nullable=True),
        )
        op.create_index('ix_rate_limit_events_id', 'rate_limit_events', ['id'], unique=False)
        op.create_index('ix_rate_limit_events_key', 'rate_limit_events', ['key'], unique=False)
        op.create_index('ix_rate_limit_events_scope', 'rate_limit_events', ['scope'], unique=False)
        op.create_index('ix_rate_limit_events_timestamp', 'rate_limit_events', ['timestamp'], unique=False)
        op.create_index('ix_rate_limit_events_scope_key_ts', 'rate_limit_events', ['scope', 'key', 'timestamp'], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    
    if 'rate_limit_events' in tables:
        op.drop_table('rate_limit_events')
