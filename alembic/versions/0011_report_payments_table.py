"""Create report_payments table

Revision ID: 0011_report_payments_table
Revises: 0010_contact_messages_table
Create Date: 2026-04-17
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0011_report_payments_table"
down_revision = "0010_contact_messages_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if inspector.has_table("report_payments"):
        return

    op.create_table(
        "report_payments",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, nullable=False),
        sa.Column("product_key", sa.String(length=64), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("amount_paise", sa.Integer, nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False),
        sa.Column("razorpay_order_id", sa.String(length=40), nullable=False),
        sa.Column("razorpay_payment_id", sa.String(length=40), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=True),
        sa.Column("updated_at", sa.DateTime, nullable=True),
        sa.UniqueConstraint("razorpay_order_id", name="uq_report_payments_order_id"),
        sa.UniqueConstraint("razorpay_payment_id", name="uq_report_payments_payment_id"),
    )
    op.create_index("ix_report_payments_user_id", "report_payments", ["user_id"])
    op.create_index("ix_report_payments_product_key", "report_payments", ["product_key"])
    op.create_index("ix_report_payments_status", "report_payments", ["status"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("report_payments"):
        return
    op.drop_index("ix_report_payments_status", table_name="report_payments")
    op.drop_index("ix_report_payments_product_key", table_name="report_payments")
    op.drop_index("ix_report_payments_user_id", table_name="report_payments")
    op.drop_table("report_payments")

