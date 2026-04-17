"""Create suggestions table

Revision ID: 0008_suggestions_table
Revises: 0007_master_rule_table
Create Date: 2026-04-10
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0008_suggestions_table"
down_revision = "0007_master_rule_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if inspector.has_table("suggestions"):
        return

    op.create_table(
        "suggestions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("admin_response", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=True),
        sa.Column("updated_at", sa.DateTime, nullable=True),
        sa.Column("resolved_at", sa.DateTime, nullable=True),
    )
    op.create_index("ix_suggestions_user_id", "suggestions", ["user_id"])
    op.create_index("ix_suggestions_status", "suggestions", ["status"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("suggestions"):
        return
    op.drop_index("ix_suggestions_status", table_name="suggestions")
    op.drop_index("ix_suggestions_user_id", table_name="suggestions")
    op.drop_table("suggestions")
