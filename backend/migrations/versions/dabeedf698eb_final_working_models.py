"""Final working models
Revision ID: dabeedf698eb
Revises:
Create Date: 2025-06-24 12:01:47.327301
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
revision = 'dabeedf698eb'
down_revision = None
branch_labels = None
depends_on = None
def upgrade():
    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('username', sa.String(length=80), nullable=False),
    sa.Column('email', sa.String(length=120), nullable=False),
    sa.Column('password_hash', sa.String(length=128), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email')
    )
    op.create_table('rooms',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=50), nullable=False),
    sa.Column('room_type', sa.String(length=50), nullable=True),
    sa.Column('capacity', sa.Integer(), nullable=True),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('subjects',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('code', sa.String(length=20), nullable=False),
    sa.Column('requires_lab', sa.Boolean(), nullable=True),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('teachers',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('subject_taught', sa.String(length=255), nullable=True),
    sa.Column('classes_taught', sa.String(length=255), nullable=True),
    sa.Column('max_lectures_per_day', sa.Integer(), nullable=True),
    sa.Column('lecture_type', sa.String(length=50), nullable=True),
    sa.Column('theory_hours_per_week', sa.Integer(), nullable=True),
    sa.Column('lab_hours_per_week', sa.Integer(), nullable=True),
    sa.Column('is_visiting', sa.Boolean(), nullable=True),
    sa.Column('availability', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
def downgrade():
    op.drop_table('teachers')
    op.drop_table('subjects')
    op.drop_table('rooms')
    op.drop_table('users')
