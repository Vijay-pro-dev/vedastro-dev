"""Create master_rule table

Revision ID: 0007_master_rule_table
Revises: 0006_energy_scores
Create Date: 2026-04-05
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0007_master_rule_table"
down_revision = "0006_energy_scores"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if inspector.has_table("master_rule"):
        return

    op.create_table(
        "master_rule",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("rule_name", sa.Text, nullable=True),
        sa.Column("rule_type", sa.Text, nullable=True),
        sa.Column("insight", sa.Text, nullable=True),
        sa.Column("why", sa.Text, nullable=True),
        sa.Column("action_energy_low", sa.Integer, nullable=True),
        sa.Column("action_energy_high", sa.Integer, nullable=True),
        sa.Column("clarity_energy_low", sa.Integer, nullable=True),
        sa.Column("clarity_energy_high", sa.Integer, nullable=True),
        sa.Column("emotional_energy_low", sa.Integer, nullable=True),
        sa.Column("emotional_energy_high", sa.Integer, nullable=True),
        sa.Column("opportunity_energy_low", sa.Integer, nullable=True),
        sa.Column("opportunity_energy_high", sa.Integer, nullable=True),
        sa.Column("fire_element_low", sa.Integer, nullable=True),
        sa.Column("fire_element_high", sa.Integer, nullable=True),
        sa.Column("earth_element_low", sa.Integer, nullable=True),
        sa.Column("earth_element_high", sa.Integer, nullable=True),
        sa.Column("air_element_low", sa.Integer, nullable=True),
        sa.Column("air_element_high", sa.Integer, nullable=True),
        sa.Column("water_element_low", sa.Integer, nullable=True),
        sa.Column("water_element_high", sa.Integer, nullable=True),
        sa.Column("space_element_low", sa.Integer, nullable=True),
        sa.Column("space_element_high", sa.Integer, nullable=True),
        sa.Column("section", sa.Integer, nullable=True),
        sa.Column("next_move", sa.Text, nullable=True),
        sa.Column("alternative", sa.Text, nullable=True),
        sa.Column("risk", sa.Text, nullable=True),
        sa.Column("mistake", sa.Text, nullable=True),
        sa.Column("priority", sa.Text, nullable=True),
        sa.Column("customer_message", sa.Text, nullable=True),
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if inspector.has_table("master_rule"):
        op.drop_table("master_rule")
