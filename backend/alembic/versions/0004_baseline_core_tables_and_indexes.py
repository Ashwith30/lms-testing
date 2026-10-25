"""Baseline core tables, foreign key constraints, and 26 relational indexes

Revision ID: 0004_baseline_core_tables_and_indexes
Revises: 0003_add_rate_limit_events
Create Date: 2026-10-23 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sys
import os

# Ensure backend root is available for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# revision identifiers, used by Alembic.
revision: str = '0004_baseline_core_tables_and_indexes'
down_revision: Union[str, None] = '0003_add_rate_limit_events'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = set(inspector.get_table_names())

    def get_indices(tbl_name: str) -> set:
        if tbl_name in tables:
            return {idx['name'] for idx in inspector.get_indexes(tbl_name) if idx.get('name')}
        return set()

    def get_columns(tbl_name: str) -> set:
        if tbl_name in tables:
            return {col['name'] for col in inspector.get_columns(tbl_name)}
        return set()

    # 1. institution_profiles
    if 'institution_profiles' not in tables:
        op.create_table(
            'institution_profiles',
            sa.Column('userId', sa.String(length=64), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
            sa.Column('institutionName', sa.String(length=255), nullable=False),
            sa.Column('contactPersonName', sa.String(length=255), nullable=True),
            sa.Column('supportEmail', sa.String(length=255), nullable=True),
            sa.Column('website', sa.String(length=255), nullable=True),
            sa.Column('address', sa.Text(), nullable=True),
        )
        tables.add('institution_profiles')

    # 2. departments
    if 'departments' not in tables:
        op.create_table(
            'departments',
            sa.Column('id', sa.String(length=64), primary_key=True),
            sa.Column('institutionId', sa.String(length=64), sa.ForeignKey('institution_profiles.userId', ondelete='CASCADE'), nullable=True),
            sa.Column('name', sa.String(length=255), nullable=False),
            sa.Column('code', sa.String(length=64), nullable=True),
            sa.UniqueConstraint('institutionId', 'name', name='uq_department_institution_name')
        )
        op.create_index('ix_departments_id', 'departments', ['id'], unique=False)
        op.create_index('ix_departments_institutionId', 'departments', ['institutionId'], unique=False)
        tables.add('departments')
    else:
        dept_idx = get_indices('departments')
        if 'ix_departments_institutionId' not in dept_idx:
            op.create_index('ix_departments_institutionId', 'departments', ['institutionId'], unique=False)

    # 3. batches
    if 'batches' not in tables:
        op.create_table(
            'batches',
            sa.Column('id', sa.String(length=64), primary_key=True),
            sa.Column('departmentId', sa.String(length=64), sa.ForeignKey('departments.id', ondelete='CASCADE'), nullable=False),
            sa.Column('name', sa.String(length=255), nullable=False),
            sa.Column('startDate', sa.String(length=64), nullable=True),
            sa.Column('endDate', sa.String(length=64), nullable=True),
            sa.UniqueConstraint('departmentId', 'name', name='uq_batch_department_name')
        )
        op.create_index('ix_batches_id', 'batches', ['id'], unique=False)
        op.create_index('ix_batches_departmentId', 'batches', ['departmentId'], unique=False)
        tables.add('batches')
    else:
        b_idx = get_indices('batches')
        if 'ix_batches_departmentId' not in b_idx:
            op.create_index('ix_batches_departmentId', 'batches', ['departmentId'], unique=False)

    # 4. student_profiles
    if 'student_profiles' not in tables:
        op.create_table(
            'student_profiles',
            sa.Column('userId', sa.String(length=64), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
            sa.Column('firstName', sa.String(length=100), nullable=False),
            sa.Column('lastName', sa.String(length=100), nullable=False),
            sa.Column('studentNumber', sa.String(length=100), unique=True, nullable=True),
            sa.Column('phoneNumber', sa.String(length=50), nullable=True),
            sa.Column('dateOfBirth', sa.String(length=64), nullable=True),
            sa.Column('institutionId', sa.String(length=64), sa.ForeignKey('institution_profiles.userId'), nullable=True),
            sa.Column('departmentId', sa.String(length=64), sa.ForeignKey('departments.id'), nullable=True),
            sa.Column('primaryBatchId', sa.String(length=64), sa.ForeignKey('batches.id'), nullable=True),
            sa.Column('enrollmentDate', sa.String(length=64), nullable=True),
        )
        op.create_index('ix_student_profiles_studentNumber', 'student_profiles', ['studentNumber'], unique=True)
        op.create_index('ix_student_profiles_departmentId', 'student_profiles', ['departmentId'], unique=False)
        op.create_index('ix_student_profiles_primaryBatchId', 'student_profiles', ['primaryBatchId'], unique=False)
        op.create_index('ix_student_profiles_institutionId', 'student_profiles', ['institutionId'], unique=False)
        tables.add('student_profiles')
    else:
        sp_cols = get_columns('student_profiles')
        if 'institutionId' not in sp_cols:
            op.add_column('student_profiles', sa.Column('institutionId', sa.String(length=64), nullable=True))
        sp_idx = get_indices('student_profiles')
        if 'ix_student_profiles_departmentId' not in sp_idx:
            op.create_index('ix_student_profiles_departmentId', 'student_profiles', ['departmentId'], unique=False)
        if 'ix_student_profiles_primaryBatchId' not in sp_idx:
            op.create_index('ix_student_profiles_primaryBatchId', 'student_profiles', ['primaryBatchId'], unique=False)
        if 'ix_student_profiles_institutionId' not in sp_idx:
            op.create_index('ix_student_profiles_institutionId', 'student_profiles', ['institutionId'], unique=False)

    # 5. trainer_profiles
    if 'trainer_profiles' not in tables:
        op.create_table(
            'trainer_profiles',
            sa.Column('userId', sa.String(length=64), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
            sa.Column('firstName', sa.String(length=100), nullable=False),
            sa.Column('lastName', sa.String(length=100), nullable=False),
            sa.Column('employeeId', sa.String(length=100), unique=True, nullable=True),
            sa.Column('specialization', sa.String(length=255), nullable=True),
            sa.Column('phoneNumber', sa.String(length=50), nullable=True),
            sa.Column('hireDate', sa.String(length=64), nullable=True),
            sa.Column('institutionId', sa.String(length=64), sa.ForeignKey('institution_profiles.userId'), nullable=True),
            sa.Column('departmentId', sa.String(length=64), sa.ForeignKey('departments.id'), nullable=True),
        )
        op.create_index('ix_trainer_profiles_employeeId', 'trainer_profiles', ['employeeId'], unique=True)
        op.create_index('ix_trainer_profiles_institutionId', 'trainer_profiles', ['institutionId'], unique=False)
        op.create_index('ix_trainer_profiles_departmentId', 'trainer_profiles', ['departmentId'], unique=False)
        tables.add('trainer_profiles')
    else:
        tp_cols = get_columns('trainer_profiles')
        if 'institutionId' not in tp_cols:
            op.add_column('trainer_profiles', sa.Column('institutionId', sa.String(length=64), nullable=True))
        if 'departmentId' not in tp_cols:
            op.add_column('trainer_profiles', sa.Column('departmentId', sa.String(length=64), nullable=True))
        tp_idx = get_indices('trainer_profiles')
        if 'ix_trainer_profiles_institutionId' not in tp_idx:
            op.create_index('ix_trainer_profiles_institutionId', 'trainer_profiles', ['institutionId'], unique=False)
        if 'ix_trainer_profiles_departmentId' not in tp_idx:
            op.create_index('ix_trainer_profiles_departmentId', 'trainer_profiles', ['departmentId'], unique=False)

    # 6. courses
    if 'courses' not in tables:
        op.create_table(
            'courses',
            sa.Column('id', sa.String(length=64), primary_key=True),
            sa.Column('name', sa.String(length=255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('durationWeeks', sa.Integer(), nullable=True),
        )
        op.create_index('ix_courses_id', 'courses', ['id'], unique=False)
        tables.add('courses')

    # 7. topics
    if 'topics' not in tables:
        op.create_table(
            'topics',
            sa.Column('id', sa.String(length=64), primary_key=True),
            sa.Column('courseId', sa.String(length=64), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
            sa.Column('name', sa.String(length=255), nullable=False),
            sa.Column('orderIndex', sa.Integer(), default=0),
        )
        op.create_index('ix_topics_id', 'topics', ['id'], unique=False)
        op.create_index('ix_topics_courseId', 'topics', ['courseId'], unique=False)
        tables.add('topics')
    else:
        top_idx = get_indices('topics')
        if 'ix_topics_courseId' not in top_idx:
            op.create_index('ix_topics_courseId', 'topics', ['courseId'], unique=False)

    # 8. trainer_assignments
    if 'trainer_assignments' not in tables:
        op.create_table(
            'trainer_assignments',
            sa.Column('id', sa.String(length=64), primary_key=True),
            sa.Column('trainerId', sa.String(length=64), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('batchId', sa.String(length=64), sa.ForeignKey('batches.id', ondelete='SET NULL'), nullable=True),
            sa.Column('institutionId', sa.String(length=64), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('topicId', sa.String(length=64), sa.ForeignKey('topics.id', ondelete='SET NULL'), nullable=True),
            sa.Column('courseId', sa.String(length=64), sa.ForeignKey('courses.id', ondelete='SET NULL'), nullable=True),
            sa.Column('startDate', sa.String(length=64), nullable=True),
            sa.Column('endDate', sa.String(length=64), nullable=True),
        )
        op.create_index('ix_trainer_assignments_id', 'trainer_assignments', ['id'], unique=False)
        op.create_index('ix_trainer_assignments_trainerId', 'trainer_assignments', ['trainerId'], unique=False)
        op.create_index('ix_trainer_assignments_batchId', 'trainer_assignments', ['batchId'], unique=False)
        op.create_index('ix_trainer_assignments_courseId', 'trainer_assignments', ['courseId'], unique=False)
        op.create_index('ix_trainer_assignments_topicId', 'trainer_assignments', ['topicId'], unique=False)
        tables.add('trainer_assignments')
    else:
        ta_idx = get_indices('trainer_assignments')
        if 'ix_trainer_assignments_trainerId' not in ta_idx:
            op.create_index('ix_trainer_assignments_trainerId', 'trainer_assignments', ['trainerId'], unique=False)
        if 'ix_trainer_assignments_batchId' not in ta_idx:
            op.create_index('ix_trainer_assignments_batchId', 'trainer_assignments', ['batchId'], unique=False)
        if 'ix_trainer_assignments_courseId' not in ta_idx:
            op.create_index('ix_trainer_assignments_courseId', 'trainer_assignments', ['courseId'], unique=False)
        if 'ix_trainer_assignments_topicId' not in ta_idx:
            op.create_index('ix_trainer_assignments_topicId', 'trainer_assignments', ['topicId'], unique=False)

    # 9. student_enrollments
    if 'student_enrollments' not in tables:
        op.create_table(
            'student_enrollments',
            sa.Column('id', sa.String(length=64), primary_key=True),
            sa.Column('studentId', sa.String(length=64), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('courseId', sa.String(length=64), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
            sa.Column('status', sa.String(length=50), default='Enrolled'),
            sa.Column('enrollmentDate', sa.String(length=64), nullable=True),
            sa.Column('completionDate', sa.String(length=64), nullable=True),
            sa.UniqueConstraint('studentId', 'courseId', name='uq_enrollment_student_course')
        )
        op.create_index('ix_student_enrollments_id', 'student_enrollments', ['id'], unique=False)
        op.create_index('ix_student_enrollments_studentId', 'student_enrollments', ['studentId'], unique=False)
        op.create_index('ix_student_enrollments_courseId', 'student_enrollments', ['courseId'], unique=False)
        tables.add('student_enrollments')
    else:
        se_idx = get_indices('student_enrollments')
        if 'ix_student_enrollments_studentId' not in se_idx:
            op.create_index('ix_student_enrollments_studentId', 'student_enrollments', ['studentId'], unique=False)
        if 'ix_student_enrollments_courseId' not in se_idx:
            op.create_index('ix_student_enrollments_courseId', 'student_enrollments', ['courseId'], unique=False)

    # 10. question_banks
    if 'question_banks' not in tables:
        op.create_table(
            'question_banks',
            sa.Column('id', sa.String(length=64), primary_key=True),
            sa.Column('name', sa.String(length=255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('courseId', sa.String(length=64), sa.ForeignKey('courses.id', ondelete='SET NULL'), nullable=True),
            sa.Column('topicId', sa.String(length=64), sa.ForeignKey('topics.id', ondelete='SET NULL'), nullable=True),
            sa.Column('ownerId', sa.String(length=64), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('isPublic', sa.Boolean(), default=False),
            sa.Column('createdAt', sa.String(length=64), nullable=True),
            sa.Column('updatedAt', sa.String(length=64), nullable=True),
        )
        op.create_index('ix_question_banks_id', 'question_banks', ['id'], unique=False)
        op.create_index('ix_question_banks_ownerId', 'question_banks', ['ownerId'], unique=False)
        op.create_index('ix_question_banks_courseId', 'question_banks', ['courseId'], unique=False)
        op.create_index('ix_question_banks_topicId', 'question_banks', ['topicId'], unique=False)
        tables.add('question_banks')
    else:
        qb_idx = get_indices('question_banks')
        if 'ix_question_banks_ownerId' not in qb_idx:
            op.create_index('ix_question_banks_ownerId', 'question_banks', ['ownerId'], unique=False)
        if 'ix_question_banks_courseId' not in qb_idx:
            op.create_index('ix_question_banks_courseId', 'question_banks', ['courseId'], unique=False)
        if 'ix_question_banks_topicId' not in qb_idx:
            op.create_index('ix_question_banks_topicId', 'question_banks', ['topicId'], unique=False)

    # 11. questions
    if 'questions' not in tables:
        op.create_table(
            'questions',
            sa.Column('id', sa.String(length=64), primary_key=True),
            sa.Column('questionBankId', sa.String(length=64), sa.ForeignKey('question_banks.id', ondelete='CASCADE'), nullable=True),
            sa.Column('type', sa.String(length=50), default='MCQ'),
            sa.Column('text', sa.Text(), nullable=False),
            sa.Column('mediaUrl', sa.Text(), nullable=True),
            sa.Column('difficulty', sa.String(length=50), nullable=False),
            sa.Column('marks', sa.Float(), default=1.0),
            sa.Column('explanation', sa.Text(), nullable=True),
            sa.Column('tags', sa.Text(), nullable=True),
        )
        op.create_index('ix_questions_id', 'questions', ['id'], unique=False)
        op.create_index('ix_questions_questionBankId', 'questions', ['questionBankId'], unique=False)
        op.create_index('ix_questions_difficulty', 'questions', ['difficulty'], unique=False)
        tables.add('questions')
    else:
        q_idx = get_indices('questions')
        if 'ix_questions_questionBankId' not in q_idx:
            op.create_index('ix_questions_questionBankId', 'questions', ['questionBankId'], unique=False)
        if 'ix_questions_difficulty' not in q_idx:
            op.create_index('ix_questions_difficulty', 'questions', ['difficulty'], unique=False)

    # 12. question_options
    if 'question_options' not in tables:
        op.create_table(
            'question_options',
            sa.Column('id', sa.String(length=64), primary_key=True),
            sa.Column('questionId', sa.String(length=64), sa.ForeignKey('questions.id', ondelete='CASCADE'), nullable=False),
            sa.Column('optionText', sa.Text(), nullable=False),
            sa.Column('isCorrect', sa.Boolean(), default=False),
            sa.Column('orderIndex', sa.Integer(), default=0),
        )
        op.create_index('ix_question_options_id', 'question_options', ['id'], unique=False)
        op.create_index('ix_question_options_questionId', 'question_options', ['questionId'], unique=False)
        tables.add('question_options')
    else:
        qo_idx = get_indices('question_options')
        if 'ix_question_options_questionId' not in qo_idx:
            op.create_index('ix_question_options_questionId', 'question_options', ['questionId'], unique=False)

    # 13. proctoring_profiles
    if 'proctoring_profiles' not in tables:
        op.create_table(
            'proctoring_profiles',
            sa.Column('id', sa.String(length=64), primary_key=True),
            sa.Column('name', sa.String(length=255), nullable=False),
            sa.Column('fullscreenRequired', sa.Boolean(), default=True),
            sa.Column('cameraRequired', sa.Boolean(), default=False),
            sa.Column('microphoneRequired', sa.Boolean(), default=False),
            sa.Column('tabSwitchLimit', sa.Integer(), default=3),
            sa.Column('requireIDVerification', sa.Boolean(), default=False),
        )
        op.create_index('ix_proctoring_profiles_id', 'proctoring_profiles', ['id'], unique=False)
        tables.add('proctoring_profiles')

    # 14. tests
    if 'tests' not in tables:
        op.create_table(
            'tests',
            sa.Column('id', sa.String(length=64), primary_key=True),
            sa.Column('title', sa.String(length=255), nullable=False),
            sa.Column('courseId', sa.String(length=64), sa.ForeignKey('courses.id', ondelete='SET NULL'), nullable=True),
            sa.Column('topicId', sa.String(length=64), sa.ForeignKey('topics.id', ondelete='SET NULL'), nullable=True),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('passingPercentage', sa.Float(), nullable=True),
            sa.Column('totalMarks', sa.Float(), default=0.0),
            sa.Column('authorId', sa.String(length=64), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('status', sa.String(length=50), nullable=False, default='Draft'),
            sa.Column('proctoringProfileId', sa.String(length=64), sa.ForeignKey('proctoring_profiles.id', ondelete='SET NULL'), nullable=True),
            sa.Column('settings_json', sa.Text(), nullable=True),
            sa.Column('createdAt', sa.String(length=64), nullable=True),
        )
        op.create_index('ix_tests_id', 'tests', ['id'], unique=False)
        op.create_index('ix_tests_authorId', 'tests', ['authorId'], unique=False)
        op.create_index('ix_tests_courseId', 'tests', ['courseId'], unique=False)
        op.create_index('ix_tests_topicId', 'tests', ['topicId'], unique=False)
        op.create_index('ix_tests_status', 'tests', ['status'], unique=False)
        tables.add('tests')
    else:
        t_idx = get_indices('tests')
        if 'ix_tests_authorId' not in t_idx:
            op.create_index('ix_tests_authorId', 'tests', ['authorId'], unique=False)
        if 'ix_tests_courseId' not in t_idx:
            op.create_index('ix_tests_courseId', 'tests', ['courseId'], unique=False)
        if 'ix_tests_topicId' not in t_idx:
            op.create_index('ix_tests_topicId', 'tests', ['topicId'], unique=False)
        if 'ix_tests_status' not in t_idx:
            op.create_index('ix_tests_status', 'tests', ['status'], unique=False)

    # 15. test_questions
    if 'test_questions' not in tables:
        op.create_table(
            'test_questions',
            sa.Column('testId', sa.String(length=64), sa.ForeignKey('tests.id', ondelete='CASCADE'), primary_key=True),
            sa.Column('questionId', sa.String(length=64), sa.ForeignKey('questions.id', ondelete='CASCADE'), primary_key=True),
            sa.Column('orderIndex', sa.Integer(), default=0),
            sa.Column('marks', sa.Float(), nullable=True),
        )
        op.create_index('ix_test_questions_questionId', 'test_questions', ['questionId'], unique=False)
        tables.add('test_questions')
    else:
        tq_cols = get_columns('test_questions')
        if 'marks' not in tq_cols:
            op.add_column('test_questions', sa.Column('marks', sa.Float(), nullable=True))
        tq_idx = get_indices('test_questions')
        if 'ix_test_questions_questionId' not in tq_idx:
            op.create_index('ix_test_questions_questionId', 'test_questions', ['questionId'], unique=False)

    # 16. schedules
    if 'schedules' not in tables:
        op.create_table(
            'schedules',
            sa.Column('id', sa.String(length=64), primary_key=True),
            sa.Column('testId', sa.String(length=64), sa.ForeignKey('tests.id', ondelete='CASCADE'), nullable=False),
            sa.Column('startTime', sa.String(length=64), nullable=False),
            sa.Column('endTime', sa.String(length=64), nullable=False),
            sa.Column('durationMinutes', sa.Integer(), nullable=True),
            sa.Column('attemptsAllowed', sa.Integer(), default=1),
        )
        op.create_index('ix_schedules_id', 'schedules', ['id'], unique=False)
        op.create_index('ix_schedules_testId', 'schedules', ['testId'], unique=False)
        tables.add('schedules')
    else:
        s_idx = get_indices('schedules')
        if 'ix_schedules_testId' not in s_idx:
            op.create_index('ix_schedules_testId', 'schedules', ['testId'], unique=False)

    # 17. schedule_assignments
    if 'schedule_assignments' not in tables:
        op.create_table(
            'schedule_assignments',
            sa.Column('id', sa.String(length=64), primary_key=True),
            sa.Column('scheduleId', sa.String(length=64), sa.ForeignKey('schedules.id', ondelete='CASCADE'), nullable=False),
            sa.Column('assigneeType', sa.String(length=50), nullable=False),
            sa.Column('assigneeId', sa.String(length=64), nullable=False),
        )
        op.create_index('ix_schedule_assignments_id', 'schedule_assignments', ['id'], unique=False)
        op.create_index('ix_schedule_assignments_scheduleId', 'schedule_assignments', ['scheduleId'], unique=False)
        tables.add('schedule_assignments')
    else:
        sa_idx = get_indices('schedule_assignments')
        if 'ix_schedule_assignments_scheduleId' not in sa_idx:
            op.create_index('ix_schedule_assignments_scheduleId', 'schedule_assignments', ['scheduleId'], unique=False)

    # 18. schedule_batch_targets & schedule_student_targets
    if 'schedule_batch_targets' not in tables:
        op.create_table(
            'schedule_batch_targets',
            sa.Column('scheduleId', sa.String(length=64), sa.ForeignKey('schedules.id', ondelete='CASCADE'), primary_key=True),
            sa.Column('batchId', sa.String(length=64), sa.ForeignKey('batches.id', ondelete='CASCADE'), primary_key=True),
        )
        tables.add('schedule_batch_targets')

    if 'schedule_student_targets' not in tables:
        op.create_table(
            'schedule_student_targets',
            sa.Column('scheduleId', sa.String(length=64), sa.ForeignKey('schedules.id', ondelete='CASCADE'), primary_key=True),
            sa.Column('studentId', sa.String(length=64), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        )
        tables.add('schedule_student_targets')

    # 19. attempts
    if 'attempts' not in tables:
        op.create_table(
            'attempts',
            sa.Column('id', sa.String(length=64), primary_key=True),
            sa.Column('studentId', sa.String(length=64), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('scheduleId', sa.String(length=64), sa.ForeignKey('schedules.id', ondelete='SET NULL'), nullable=True),
            sa.Column('testId', sa.String(length=64), sa.ForeignKey('tests.id', ondelete='CASCADE'), nullable=True),
            sa.Column('status', sa.String(length=50), nullable=False, default='in_progress'),
            sa.Column('startedAt', sa.String(length=64), nullable=False),
            sa.Column('submittedAt', sa.String(length=64), nullable=True),
            sa.Column('score', sa.Float(), nullable=True),
            sa.Column('percentage', sa.Float(), nullable=True),
            sa.Column('violations', sa.Integer(), default=0),
            sa.Column('violationLogs_json', sa.Text(), nullable=True),
            sa.Column('proctoringSummary_json', sa.Text(), nullable=True),
            sa.Column('ipAddress', sa.String(length=100), nullable=True),
            sa.Column('deviceInfo', sa.Text(), nullable=True),
        )
        op.create_index('ix_attempts_id', 'attempts', ['id'], unique=False)
        op.create_index('ix_attempts_studentId', 'attempts', ['studentId'], unique=False)
        op.create_index('ix_attempts_scheduleId', 'attempts', ['scheduleId'], unique=False)
        op.create_index('ix_attempts_testId', 'attempts', ['testId'], unique=False)
        op.create_index('ix_attempts_status', 'attempts', ['status'], unique=False)
        tables.add('attempts')
    else:
        att_cols = get_columns('attempts')
        if 'testId' not in att_cols:
            op.add_column('attempts', sa.Column('testId', sa.String(length=64), nullable=True))
            # Backfill existing attempts from schedule testId
            op.execute("""
                UPDATE attempts
                SET testId = (SELECT testId FROM schedules WHERE schedules.id = attempts.scheduleId)
                WHERE attempts.testId IS NULL AND attempts.scheduleId IS NOT NULL
            """)
        att_idx = get_indices('attempts')
        if 'ix_attempts_studentId' not in att_idx:
            op.create_index('ix_attempts_studentId', 'attempts', ['studentId'], unique=False)
        if 'ix_attempts_scheduleId' not in att_idx:
            op.create_index('ix_attempts_scheduleId', 'attempts', ['scheduleId'], unique=False)
        if 'ix_attempts_testId' not in att_idx:
            op.create_index('ix_attempts_testId', 'attempts', ['testId'], unique=False)
        if 'ix_attempts_status' not in att_idx:
            op.create_index('ix_attempts_status', 'attempts', ['status'], unique=False)

    # 20. proctoring_logs
    if 'proctoring_logs' not in tables:
        op.create_table(
            'proctoring_logs',
            sa.Column('id', sa.String(length=64), primary_key=True),
            sa.Column('attemptId', sa.String(length=64), sa.ForeignKey('attempts.id', ondelete='CASCADE'), nullable=False),
            sa.Column('timestamp', sa.String(length=64), nullable=False),
            sa.Column('violationType', sa.String(length=100), nullable=False),
            sa.Column('screenshotUrl', sa.Text(), nullable=True),
            sa.Column('severity', sa.String(length=50), nullable=True),
        )
        op.create_index('ix_proctoring_logs_id', 'proctoring_logs', ['id'], unique=False)
        op.create_index('ix_proctoring_logs_attemptId', 'proctoring_logs', ['attemptId'], unique=False)
        op.create_index('ix_proctoring_logs_attempt_type_ts', 'proctoring_logs', ['attemptId', 'violationType', 'timestamp'], unique=False)
        tables.add('proctoring_logs')
    else:
        pl_idx = get_indices('proctoring_logs')
        if 'ix_proctoring_logs_attemptId' not in pl_idx:
            op.create_index('ix_proctoring_logs_attemptId', 'proctoring_logs', ['attemptId'], unique=False)
        if 'ix_proctoring_logs_attempt_type_ts' not in pl_idx:
            op.create_index('ix_proctoring_logs_attempt_type_ts', 'proctoring_logs', ['attemptId', 'violationType', 'timestamp'], unique=False)

    # 21. answers
    if 'answers' not in tables:
        op.create_table(
            'answers',
            sa.Column('id', sa.String(length=64), primary_key=True),
            sa.Column('attemptId', sa.String(length=64), sa.ForeignKey('attempts.id', ondelete='CASCADE'), nullable=False),
            sa.Column('questionId', sa.String(length=64), sa.ForeignKey('questions.id'), nullable=False),
            sa.Column('selectedOptionId', sa.String(length=64), sa.ForeignKey('question_options.id', ondelete='SET NULL'), nullable=True),
            sa.Column('selectedOptionIds', sa.Text(), nullable=True),
            sa.Column('subjectiveText', sa.Text(), nullable=True),
            sa.Column('timeTakenSeconds', sa.Integer(), nullable=True),
            sa.Column('isCorrect', sa.Boolean(), nullable=True),
            sa.UniqueConstraint('attemptId', 'questionId', name='uq_answer_attempt_question')
        )
        op.create_index('ix_answers_id', 'answers', ['id'], unique=False)
        op.create_index('ix_answers_attemptId', 'answers', ['attemptId'], unique=False)
        op.create_index('ix_answers_questionId', 'answers', ['questionId'], unique=False)
        op.create_index('ix_answers_selectedOptionId', 'answers', ['selectedOptionId'], unique=False)
        tables.add('answers')
    else:
        ans_cols = get_columns('answers')
        if 'selectedOptionId' not in ans_cols:
            op.add_column('answers', sa.Column('selectedOptionId', sa.String(length=64), nullable=True))
        ans_idx = get_indices('answers')
        if 'ix_answers_attemptId' not in ans_idx:
            op.create_index('ix_answers_attemptId', 'answers', ['attemptId'], unique=False)
        if 'ix_answers_questionId' not in ans_idx:
            op.create_index('ix_answers_questionId', 'answers', ['questionId'], unique=False)
        if 'ix_answers_selectedOptionId' not in ans_idx:
            op.create_index('ix_answers_selectedOptionId', 'answers', ['selectedOptionId'], unique=False)

    # 22. materials
    if 'materials' not in tables:
        op.create_table(
            'materials',
            sa.Column('id', sa.String(length=64), primary_key=True),
            sa.Column('title', sa.String(length=255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('type', sa.String(length=50), nullable=False),
            sa.Column('courseId', sa.String(length=64), sa.ForeignKey('courses.id', ondelete='SET NULL'), nullable=True),
            sa.Column('topicId', sa.String(length=64), sa.ForeignKey('topics.id', ondelete='SET NULL'), nullable=True),
            sa.Column('contentUrl', sa.Text(), nullable=True),
            sa.Column('authorId', sa.String(length=64), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('isReleased', sa.Boolean(), default=True),
            sa.Column('releasedAt', sa.String(length=64), nullable=True),
            sa.Column('createdAt', sa.String(length=64), nullable=True),
            sa.Column('updatedAt', sa.String(length=64), nullable=True),
        )
        op.create_index('ix_materials_id', 'materials', ['id'], unique=False)
        op.create_index('ix_materials_authorId', 'materials', ['authorId'], unique=False)
        op.create_index('ix_materials_courseId', 'materials', ['courseId'], unique=False)
        op.create_index('ix_materials_topicId', 'materials', ['topicId'], unique=False)
        op.create_index('ix_materials_isReleased', 'materials', ['isReleased'], unique=False)
        tables.add('materials')
    else:
        mat_idx = get_indices('materials')
        if 'ix_materials_authorId' not in mat_idx:
            op.create_index('ix_materials_authorId', 'materials', ['authorId'], unique=False)
        if 'ix_materials_courseId' not in mat_idx:
            op.create_index('ix_materials_courseId', 'materials', ['courseId'], unique=False)
        if 'ix_materials_topicId' not in mat_idx:
            op.create_index('ix_materials_topicId', 'materials', ['topicId'], unique=False)
        if 'ix_materials_isReleased' not in mat_idx:
            op.create_index('ix_materials_isReleased', 'materials', ['isReleased'], unique=False)

    # 23. material_assignments & material_batch_targets
    if 'material_assignments' not in tables:
        op.create_table(
            'material_assignments',
            sa.Column('id', sa.String(length=64), primary_key=True),
            sa.Column('materialId', sa.String(length=64), sa.ForeignKey('materials.id', ondelete='CASCADE'), nullable=False),
            sa.Column('assigneeType', sa.String(length=50), nullable=False),
            sa.Column('assigneeId', sa.String(length=64), nullable=False),
            sa.Column('releaseDate', sa.String(length=64), nullable=True),
        )
        op.create_index('ix_material_assignments_id', 'material_assignments', ['id'], unique=False)
        op.create_index('ix_material_assignments_materialId', 'material_assignments', ['materialId'], unique=False)
        tables.add('material_assignments')
    else:
        ma_idx = get_indices('material_assignments')
        if 'ix_material_assignments_materialId' not in ma_idx:
            op.create_index('ix_material_assignments_materialId', 'material_assignments', ['materialId'], unique=False)

    if 'material_batch_targets' not in tables:
        op.create_table(
            'material_batch_targets',
            sa.Column('materialId', sa.String(length=64), sa.ForeignKey('materials.id', ondelete='CASCADE'), primary_key=True),
            sa.Column('batchId', sa.String(length=64), sa.ForeignKey('batches.id', ondelete='CASCADE'), primary_key=True),
        )
        tables.add('material_batch_targets')

    # 24. notifications & notification_batch_targets
    if 'notifications' not in tables:
        op.create_table(
            'notifications',
            sa.Column('id', sa.String(length=64), primary_key=True),
            sa.Column('title', sa.String(length=255), nullable=False),
            sa.Column('message', sa.Text(), nullable=False),
            sa.Column('type', sa.String(length=50), default='info'),
            sa.Column('targetBatch', sa.String(length=100), default='all'),
            sa.Column('targetRole', sa.String(length=50), default='student'),
            sa.Column('link', sa.String(length=255), nullable=True),
            sa.Column('priority', sa.String(length=20), default='normal'),
            sa.Column('sendEmail', sa.Boolean(), default=False),
            sa.Column('senderId', sa.String(length=64), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('senderName', sa.String(length=255), nullable=True),
            sa.Column('createdAt', sa.String(length=64), nullable=True),
        )
        op.create_index('ix_notifications_id', 'notifications', ['id'], unique=False)
        op.create_index('ix_notifications_targetRole', 'notifications', ['targetRole'], unique=False)
        op.create_index('ix_notifications_senderId', 'notifications', ['senderId'], unique=False)
        op.create_index('ix_notifications_createdAt', 'notifications', ['createdAt'], unique=False)
        tables.add('notifications')
    else:
        notif_idx = get_indices('notifications')
        if 'ix_notifications_targetRole' not in notif_idx:
            op.create_index('ix_notifications_targetRole', 'notifications', ['targetRole'], unique=False)
        if 'ix_notifications_senderId' not in notif_idx:
            op.create_index('ix_notifications_senderId', 'notifications', ['senderId'], unique=False)
        if 'ix_notifications_createdAt' not in notif_idx:
            op.create_index('ix_notifications_createdAt', 'notifications', ['createdAt'], unique=False)

    if 'notification_batch_targets' not in tables:
        op.create_table(
            'notification_batch_targets',
            sa.Column('notificationId', sa.String(length=64), sa.ForeignKey('notifications.id', ondelete='CASCADE'), primary_key=True),
            sa.Column('batchId', sa.String(length=64), sa.ForeignKey('batches.id', ondelete='CASCADE'), primary_key=True),
        )
        tables.add('notification_batch_targets')

    # 25. notification_reads
    if 'notification_reads' not in tables:
        op.create_table(
            'notification_reads',
            sa.Column('id', sa.String(length=64), primary_key=True),
            sa.Column('notificationId', sa.String(length=64), sa.ForeignKey('notifications.id', ondelete='CASCADE'), nullable=False),
            sa.Column('userId', sa.String(length=64), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('readAt', sa.String(length=64), nullable=True),
            sa.UniqueConstraint('notificationId', 'userId', name='uq_notification_read_user')
        )
        op.create_index('ix_notification_reads_id', 'notification_reads', ['id'], unique=False)
        op.create_index('ix_notification_reads_notificationId', 'notification_reads', ['notificationId'], unique=False)
        op.create_index('ix_notification_reads_userId', 'notification_reads', ['userId'], unique=False)
        tables.add('notification_reads')
    else:
        nr_idx = get_indices('notification_reads')
        if 'ix_notification_reads_notificationId' not in nr_idx:
            op.create_index('ix_notification_reads_notificationId', 'notification_reads', ['notificationId'], unique=False)
        if 'ix_notification_reads_userId' not in nr_idx:
            op.create_index('ix_notification_reads_userId', 'notification_reads', ['userId'], unique=False)

    # Indexes on users table (role, status)
    if 'users' in tables:
        u_idx = get_indices('users')
        if 'ix_users_role' not in u_idx:
            op.create_index('ix_users_role', 'users', ['role'], unique=False)
        if 'ix_users_status' not in u_idx:
            op.create_index('ix_users_status', 'users', ['status'], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = set(inspector.get_table_names())

    # Drop in reverse foreign key order
    drop_order = [
        'notification_reads',
        'notification_batch_targets',
        'notifications',
        'material_batch_targets',
        'material_assignments',
        'materials',
        'answers',
        'proctoring_logs',
        'attempts',
        'schedule_student_targets',
        'schedule_batch_targets',
        'schedule_assignments',
        'schedules',
        'test_questions',
        'tests',
        'proctoring_profiles',
        'question_options',
        'questions',
        'question_banks',
        'student_enrollments',
        'trainer_assignments',
        'topics',
        'courses',
        'trainer_profiles',
        'student_profiles',
        'batches',
        'departments',
        'institution_profiles',
    ]

    for tbl in drop_order:
        if tbl in tables:
            op.drop_table(tbl)
