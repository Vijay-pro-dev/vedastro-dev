"""Add plan_key and expires_at to report_payments

Revision ID: 0012_report_payments_plan_and_expiry
Revises: 0011_report_payments_table
Create Date: 2026-04-17
"""

from alembic import op
import sqlalchemy as sa


revision = "0012_report_payments_plan_and_expiry"
down_revision = "0011_report_payments_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("report_payments") as batch:
        batch.add_column(sa.Column("plan_key", sa.String(length=16), nullable=False, server_default="one_time"))
        batch.add_column(sa.Column("expires_at", sa.DateTime, nullable=True))
    op.create_index("ix_report_payments_plan_key", "report_payments", ["plan_key"])


def downgrade() -> None:
    op.drop_index("ix_report_payments_plan_key", table_name="report_payments")
    with op.batch_alter_table("report_payments") as batch:
        batch.drop_column("expires_at")
        batch.drop_column("plan_key")

