"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-03-22
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("address", sa.String(), nullable=True),
        sa.Column("nationality", sa.String(), nullable=True, server_default="global"),
        sa.Column("language", sa.String(), nullable=True, server_default="english"),
        sa.Column("role", sa.String(), nullable=True, server_default="user"),
        sa.Column("suspended", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("profile_pic", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "userinfo",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("dob", sa.String(), nullable=True),
        sa.Column("birth_time", sa.String(), nullable=True),
        sa.Column("contact", sa.String(), nullable=True),
    )

    op.create_table(
        "birth_data",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("dob", sa.String(), nullable=True),
        sa.Column("birth_time", sa.String(), nullable=True),
        sa.Column("birth_place", sa.String(), nullable=True),
        sa.Column("birth_time_accuracy", sa.String(), nullable=True, server_default="unknown"),
        sa.Column("address", sa.String(), nullable=True),
        sa.Column("profile_pic", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_birth_data_id", "birth_data", ["id"])
    op.create_index("ix_birth_data_user_id", "birth_data", ["user_id"])

    op.create_table(
        "birth_time_estimates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("questionnaire_responses", sa.Text(), nullable=True),
        sa.Column("estimated_time", sa.String(), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_birth_time_estimates_id", "birth_time_estimates", ["id"])

    op.create_table(
        "career_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("education", sa.String(), nullable=True),
        sa.Column("interests", sa.String(), nullable=True),
        sa.Column("goals", sa.String(), nullable=True),
        sa.Column("current_role", sa.String(), nullable=True),
        sa.Column("years_experience", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("goal_clarity", sa.String(), nullable=True, server_default="medium"),
        sa.Column("role_match", sa.String(), nullable=True, server_default="medium"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_career_profiles_id", "career_profiles", ["id"])
    op.create_index("ix_career_profiles_user_id", "career_profiles", ["user_id"])

    op.create_table(
        "career_alignment_scores",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("awareness_score", sa.Float(), nullable=True),
        sa.Column("time_alignment_score", sa.Float(), nullable=True),
        sa.Column("action_integrity_score", sa.Float(), nullable=True),
        sa.Column("overall_score", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_career_alignment_scores_id", "career_alignment_scores", ["id"])

    op.create_table(
        "career_phases",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("phase_name", sa.String(), nullable=True),
        sa.Column("phase_start_date", sa.String(), nullable=True),
        sa.Column("phase_end_date", sa.String(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_career_phases_id", "career_phases", ["id"])

    op.create_table(
        "opportunity_windows",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("window_start_date", sa.String(), nullable=True),
        sa.Column("window_end_date", sa.String(), nullable=True),
        sa.Column("opportunity_type", sa.String(), nullable=True),
        sa.Column("confidence_level", sa.Float(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_opportunity_windows_id", "opportunity_windows", ["id"])

    op.create_table(
        "decision_guidance",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("guidance_id", sa.String(), nullable=True),
        sa.Column("focus", sa.Text(), nullable=True),
        sa.Column("avoid", sa.Text(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("recommendations", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_decision_guidance_id", "decision_guidance", ["id"])

    op.create_table(
        "activity_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("activity_type", sa.String(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("data", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_activity_logs_id", "activity_logs", ["id"])

    op.create_table(
        "career_scores",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("date", sa.String(), nullable=True),
    )

    op.create_table(
        "feedback_decisions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("decision", sa.String(), nullable=True),
        sa.Column("notes", sa.String(), nullable=True),
    )

    op.create_table(
        "feedback_outcomes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("result", sa.String(), nullable=True),
        sa.Column("comments", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("feedback_outcomes")
    op.drop_table("feedback_decisions")
    op.drop_table("career_scores")
    op.drop_index("ix_activity_logs_id", table_name="activity_logs")
    op.drop_table("activity_logs")
    op.drop_index("ix_decision_guidance_id", table_name="decision_guidance")
    op.drop_table("decision_guidance")
    op.drop_index("ix_opportunity_windows_id", table_name="opportunity_windows")
    op.drop_table("opportunity_windows")
    op.drop_index("ix_career_phases_id", table_name="career_phases")
    op.drop_table("career_phases")
    op.drop_index("ix_career_alignment_scores_id", table_name="career_alignment_scores")
    op.drop_table("career_alignment_scores")
    op.drop_index("ix_career_profiles_user_id", table_name="career_profiles")
    op.drop_index("ix_career_profiles_id", table_name="career_profiles")
    op.drop_table("career_profiles")
    op.drop_index("ix_birth_time_estimates_id", table_name="birth_time_estimates")
    op.drop_table("birth_time_estimates")
    op.drop_index("ix_birth_data_user_id", table_name="birth_data")
    op.drop_index("ix_birth_data_id", table_name="birth_data")
    op.drop_table("birth_data")
    op.drop_table("userinfo")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")
