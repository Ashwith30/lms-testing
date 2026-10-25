"""Enforce multi-tenancy and institution scoping across core entities

Revision ID: 0005_enforce_multi_tenancy_and_scoping
Revises: 0004_baseline_core_tables_and_indexes
Create Date: 2026-10-24 20:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sys
import os

# Ensure backend root is available for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# revision identifiers, used by Alembic.
revision: str = '0005_enforce_multi_tenancy_and_scoping'
down_revision: Union[str, None] = '0004_baseline_core_tables_and_indexes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = set(inspector.get_table_names())

    def get_columns(tbl_name: str) -> set:
        if tbl_name in tables:
            return {col['name'] for col in inspector.get_columns(tbl_name)}
        return set()

    def get_indices(tbl_name: str) -> set:
        if tbl_name in tables:
            return {idx['name'] for idx in inspector.get_indexes(tbl_name) if idx.get('name')}
        return set()

    # 1. batches: add institutionId
    if 'batches' in tables:
        cols = get_columns('batches')
        if 'institutionId' not in cols:
            op.add_column(
                'batches',
                sa.Column('institutionId', sa.String(length=64), nullable=True)
            )
        indices = get_indices('batches')
        if 'ix_batches_institutionId' not in indices:
            op.create_index('ix_batches_institutionId', 'batches', ['institutionId'], unique=False)

        # Backfill batches.institutionId from departments
        try:
            conn.execute(sa.text("""
                UPDATE batches
                SET institutionId = (
                    SELECT institutionId FROM departments WHERE departments.id = batches.departmentId
                )
                WHERE institutionId IS NULL AND departmentId IS NOT NULL;
            """))
        except Exception:
            pass

    # 2. tests: add institutionId
    if 'tests' in tables:
        cols = get_columns('tests')
        if 'institutionId' not in cols:
            op.add_column(
                'tests',
                sa.Column('institutionId', sa.String(length=64), nullable=True)
            )
        indices = get_indices('tests')
        if 'ix_tests_institutionId' not in indices:
            op.create_index('ix_tests_institutionId', 'tests', ['institutionId'], unique=False)

        # Backfill tests.institutionId from authorId
        try:
            conn.execute(sa.text("""
                UPDATE tests
                SET institutionId = authorId
                WHERE institutionId IS NULL
                  AND authorId IN (SELECT userId FROM institution_profiles);
            """))
            conn.execute(sa.text("""
                UPDATE tests
                SET institutionId = (
                    SELECT institutionId FROM trainer_profiles WHERE trainer_profiles.userId = tests.authorId
                )
                WHERE institutionId IS NULL
                  AND authorId IN (SELECT userId FROM trainer_profiles);
            """))
        except Exception:
            pass

    # 3. schedules: add institutionId
    if 'schedules' in tables:
        cols = get_columns('schedules')
        if 'institutionId' not in cols:
            op.add_column(
                'schedules',
                sa.Column('institutionId', sa.String(length=64), nullable=True)
            )
        indices = get_indices('schedules')
        if 'ix_schedules_institutionId' not in indices:
            op.create_index('ix_schedules_institutionId', 'schedules', ['institutionId'], unique=False)

        # Backfill schedules.institutionId from tests
        try:
            conn.execute(sa.text("""
                UPDATE schedules
                SET institutionId = (
                    SELECT institutionId FROM tests WHERE tests.id = schedules.testId
                )
                WHERE institutionId IS NULL AND testId IS NOT NULL;
            """))
        except Exception:
            pass

    # 4. question_banks: add institutionId
    if 'question_banks' in tables:
        cols = get_columns('question_banks')
        if 'institutionId' not in cols:
            op.add_column(
                'question_banks',
                sa.Column('institutionId', sa.String(length=64), nullable=True)
            )
        indices = get_indices('question_banks')
        if 'ix_question_banks_institutionId' not in indices:
            op.create_index('ix_question_banks_institutionId', 'question_banks', ['institutionId'], unique=False)

        # Backfill question_banks.institutionId from ownerId
        try:
            conn.execute(sa.text("""
                UPDATE question_banks
                SET institutionId = ownerId
                WHERE institutionId IS NULL
                  AND ownerId IN (SELECT userId FROM institution_profiles);
            """))
            conn.execute(sa.text("""
                UPDATE question_banks
                SET institutionId = (
                    SELECT institutionId FROM trainer_profiles WHERE trainer_profiles.userId = question_banks.ownerId
                )
                WHERE institutionId IS NULL
                  AND ownerId IN (SELECT userId FROM trainer_profiles);
            """))
        except Exception:
            pass

    # 5. materials: add institutionId
    if 'materials' in tables:
        cols = get_columns('materials')
        if 'institutionId' not in cols:
            op.add_column(
                'materials',
                sa.Column('institutionId', sa.String(length=64), nullable=True)
            )
        indices = get_indices('materials')
        if 'ix_materials_institutionId' not in indices:
            op.create_index('ix_materials_institutionId', 'materials', ['institutionId'], unique=False)

        # Backfill materials.institutionId from authorId
        try:
            conn.execute(sa.text("""
                UPDATE materials
                SET institutionId = authorId
                WHERE institutionId IS NULL
                  AND authorId IN (SELECT userId FROM institution_profiles);
            """))
            conn.execute(sa.text("""
                UPDATE materials
                SET institutionId = (
                    SELECT institutionId FROM trainer_profiles WHERE trainer_profiles.userId = materials.authorId
                )
                WHERE institutionId IS NULL
                  AND authorId IN (SELECT userId FROM trainer_profiles);
            """))
        except Exception:
            pass

    # 6. notifications: add institutionId
    if 'notifications' in tables:
        cols = get_columns('notifications')
        if 'institutionId' not in cols:
            op.add_column(
                'notifications',
                sa.Column('institutionId', sa.String(length=64), nullable=True)
            )
        indices = get_indices('notifications')
        if 'ix_notifications_institutionId' not in indices:
            op.create_index('ix_notifications_institutionId', 'notifications', ['institutionId'], unique=False)

        # Backfill notifications.institutionId from senderId
        try:
            conn.execute(sa.text("""
                UPDATE notifications
                SET institutionId = senderId
                WHERE institutionId IS NULL
                  AND senderId IN (SELECT userId FROM institution_profiles);
            """))
        except Exception:
            pass

    # 7. student_profiles: composite uniqueness for (institutionId, studentNumber)
    if 'student_profiles' in tables:
        sp_indices = get_indices('student_profiles')
        # Drop legacy global unique index on studentNumber if it exists
        if 'ix_student_profiles_studentNumber' in sp_indices:
            try:
                op.drop_index('ix_student_profiles_studentNumber', table_name='student_profiles')
            except Exception:
                pass
        # Re-create as standard non-unique index for query lookups
        try:
            op.create_index(
                'ix_student_profiles_studentNumber',
                'student_profiles',
                ['studentNumber'],
                unique=False
            )
        except Exception:
            pass

        if 'uq_institution_student_number' not in sp_indices and 'ix_student_profiles_institution_student_number' not in sp_indices:
            try:
                op.create_index(
                    'ix_student_profiles_institution_student_number',
                    'student_profiles',
                    ['institutionId', 'studentNumber'],
                    unique=False
                )
            except Exception:
                pass


def downgrade() -> None:
    pass
