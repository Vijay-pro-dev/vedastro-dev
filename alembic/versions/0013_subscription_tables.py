"""Create subscription_plans and user_subscriptions tables

Revision ID: 0013_subscription_tables
Revises: 0012_report_payments_plan_and_expiry
Create Date: 2026-04-18
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op  # pyright: ignore[reportAttributeAccessIssue]
from sqlalchemy.dialects import postgresql
from sqlalchemy.types import JSON


revision = "0013_subscription_tables"
down_revision = "0012_report_payments_plan_and_expiry"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())

    if not inspector.has_table("subscription_plans"):
        op.create_table(
            "subscription_plans",
            sa.Column("plan_id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("plan_name", sa.String(length=100), nullable=False),
            sa.Column("duration_days", sa.Integer(), nullable=False),
            sa.Column("price", sa.Numeric(10, 2), nullable=False),
            sa.Column("features", JSON().with_variant(postgresql.JSONB(), "postgresql"), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("created_at", sa.DateTime(), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        op.create_index("ix_subscription_plans_plan_id", "subscription_plans", ["plan_id"])

    if not inspector.has_table("user_subscriptions"):
        op.create_table(
            "user_subscriptions",
            sa.Column("subscription_id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("plan_id", sa.Integer(), sa.ForeignKey("subscription_plans.plan_id"), nullable=False),
            sa.Column("start_date", sa.DateTime(), nullable=False),
            sa.Column("end_date", sa.DateTime(), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=True),
            sa.Column("payment_id", sa.String(length=100), nullable=True),
            sa.Column("payment_status", sa.String(length=32), nullable=True),
            sa.Column("auto_renew", sa.Boolean(), nullable=False, server_default=sa.text("0")),
            sa.Column("created_at", sa.DateTime(), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        op.create_index("ix_user_subscriptions_subscription_id", "user_subscriptions", ["subscription_id"])
        op.create_index("ix_user_subscriptions_user_id", "user_subscriptions", ["user_id"])
        op.create_index("ix_user_subscriptions_plan_id", "user_subscriptions", ["plan_id"])
        op.create_index("ix_user_subscriptions_payment_id", "user_subscriptions", ["payment_id"])
        op.create_index("ix_user_subscriptions_status", "user_subscriptions", ["status"])


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())

    if inspector.has_table("user_subscriptions"):
        op.drop_index("ix_user_subscriptions_status", table_name="user_subscriptions")
        op.drop_index("ix_user_subscriptions_payment_id", table_name="user_subscriptions")
        op.drop_index("ix_user_subscriptions_plan_id", table_name="user_subscriptions")
        op.drop_index("ix_user_subscriptions_user_id", table_name="user_subscriptions")
        op.drop_index("ix_user_subscriptions_subscription_id", table_name="user_subscriptions")
        op.drop_table("user_subscriptions")

    if inspector.has_table("subscription_plans"):
        op.drop_index("ix_subscription_plans_plan_id", table_name="subscription_plans")
        op.drop_table("subscription_plans")

