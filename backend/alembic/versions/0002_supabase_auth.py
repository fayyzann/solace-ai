"""Add supabase_id to users, make hashed_password nullable

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-02
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("supabase_id", sa.String(255), nullable=True))
    op.create_unique_constraint("uq_users_supabase_id", "users", ["supabase_id"])
    op.alter_column("users", "hashed_password", nullable=True)


def downgrade() -> None:
    op.alter_column("users", "hashed_password", nullable=False)
    op.drop_constraint("uq_users_supabase_id", "users", type_="unique")
    op.drop_column("users", "supabase_id")
