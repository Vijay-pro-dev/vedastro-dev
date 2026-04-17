"""Create contact_messages table

Revision ID: 0010_contact_messages_table
Revises: 0009_suggestions_add_image_url
Create Date: 2026-04-16
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0010_contact_messages_table"
down_revision = "0009_suggestions_add_image_url"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if inspector.has_table("contact_messages"):
        return

    op.create_table(
        "contact_messages",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, nullable=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("subject", sa.String(length=160), nullable=True),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=True),
    )
    op.create_index("ix_contact_messages_user_id", "contact_messages", ["user_id"])
    op.create_index("ix_contact_messages_email", "contact_messages", ["email"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("contact_messages"):
        return
    op.drop_index("ix_contact_messages_email", table_name="contact_messages")
    op.drop_index("ix_contact_messages_user_id", table_name="contact_messages")
    op.drop_table("contact_messages")

