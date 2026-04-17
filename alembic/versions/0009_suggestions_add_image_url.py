"""Add image_url to suggestions

Revision ID: 0009_suggestions_add_image_url
Revises: 0008_suggestions_table
Create Date: 2026-04-16
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0009_suggestions_add_image_url"
down_revision = "0008_suggestions_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("suggestions"):
        return
    columns = {col["name"] for col in inspector.get_columns("suggestions")}
    if "image_url" in columns:
        return
    op.add_column("suggestions", sa.Column("image_url", sa.Text, nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("suggestions"):
        return
    columns = {col["name"] for col in inspector.get_columns("suggestions")}
    if "image_url" not in columns:
        return
    op.drop_column("suggestions", "image_url")
