"""Add assessment tracking and persisted AI report history.

Revision ID: 0015_assessments_and_ai_reports
Revises: 0014_match_rules_function
Create Date: 2026-04-22
"""

from __future__ import annotations

from datetime import datetime, timezone

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect, text


revision = "0015_assessments_and_ai_reports"
down_revision = "0014_match_rules_function"
branch_labels = None
depends_on = None


def _utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    dialect = bind.dialect.name

    if not inspector.has_table("user_assessments"):
        op.create_table(
            "user_assessments",
            sa.Column("assessment_id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("is_latest", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_user_assessments_user_id", "user_assessments", ["user_id"])

        if dialect == "postgresql":
            op.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS ux_user_assessments_latest
                ON user_assessments (user_id)
                WHERE is_latest IS TRUE;
                """
            )

    if not inspector.has_table("user_ai_reports"):
        op.create_table(
            "user_ai_reports",
            sa.Column("report_id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("assessment_id", sa.Integer(), nullable=False),
            sa.Column("engine", sa.String(length=10), nullable=False),
            sa.Column("plan_key", sa.String(length=30), nullable=True),
            sa.Column("model", sa.String(length=80), nullable=True),
            sa.Column("report_text", sa.Text(), nullable=False),
            sa.Column("insight_text", sa.Text(), nullable=True),
            sa.Column("action_text", sa.Text(), nullable=True),
            sa.Column("why_text", sa.Text(), nullable=True),
            sa.Column("risk_text", sa.Text(), nullable=True),
            sa.Column("is_latest", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_user_ai_reports_user_id", "user_ai_reports", ["user_id"])
        op.create_index("ix_user_ai_reports_assessment_id", "user_ai_reports", ["assessment_id"])
        op.create_index("ix_user_ai_reports_engine", "user_ai_reports", ["engine"])

        if dialect == "postgresql":
            op.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS ux_user_ai_reports_latest
                ON user_ai_reports (user_id, engine)
                WHERE is_latest IS TRUE;
                """
            )

    # Add assessment_id to user_responses if the table exists.
    if inspector.has_table("user_responses"):
        columns = {col["name"] for col in inspector.get_columns("user_responses")}
        if "assessment_id" not in columns:
            op.add_column("user_responses", sa.Column("assessment_id", sa.Integer(), nullable=True))

        # Index may already exist on some databases; create it idempotently.
        if dialect == "postgresql":
            op.execute("CREATE INDEX IF NOT EXISTS ix_user_responses_assessment_id ON user_responses (assessment_id);")
        else:
            try:
                existing_indexes = {idx.get("name") for idx in inspector.get_indexes("user_responses")}
                if "ix_user_responses_assessment_id" not in existing_indexes:
                    op.create_index("ix_user_responses_assessment_id", "user_responses", ["assessment_id"])
            except Exception:
                # Best-effort for dialects/inspectors that don't support index introspection consistently.
                pass

        if dialect == "postgresql":
            # FK constraints are easiest to manage in Postgres; SQLite local dev can keep it soft.
            op.execute(
                """
                DO $$
                BEGIN
                  IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.table_constraints
                    WHERE constraint_name = 'fk_user_responses_assessment_id'
                  ) THEN
                    ALTER TABLE user_responses
                    ADD CONSTRAINT fk_user_responses_assessment_id
                    FOREIGN KEY (assessment_id)
                    REFERENCES user_assessments (assessment_id)
                    ON DELETE CASCADE;
                  END IF;
                END$$;
                """
            )

    # Backfill: ensure existing users with legacy responses get a default assessment + mapping.
    if inspector.has_table("user_responses"):
        # Create one assessment per user that has responses with NULL assessment_id and no assessments yet.
        # Then attach all legacy responses to that assessment.
        user_ids = [
            row[0]
            for row in bind.execute(
                text(
                    """
                    SELECT DISTINCT user_id
                    FROM user_responses
                    WHERE user_id IS NOT NULL
                      AND (assessment_id IS NULL)
                    """
                )
            ).fetchall()
        ]
        now = _utc_now()
        for user_id in user_ids:
            # Use latest existing assessment if present.
            existing = bind.execute(
                text(
                    """
                    SELECT assessment_id
                    FROM user_assessments
                    WHERE user_id = :uid
                    ORDER BY is_latest DESC, updated_at DESC NULLS LAST, created_at DESC NULLS LAST, assessment_id DESC
                    LIMIT 1
                    """
                ),
                {"uid": int(user_id)},
            ).fetchone()

            if existing and existing[0] is not None:
                assessment_id = int(existing[0])
            else:
                # Mark any stray latest flags off, then create a default assessment.
                bind.execute(
                    text("UPDATE user_assessments SET is_latest = FALSE, updated_at = :now WHERE user_id = :uid"),
                    {"uid": int(user_id), "now": now},
                )
                result = bind.execute(
                    text(
                        """
                        INSERT INTO user_assessments (user_id, is_latest, created_at, updated_at)
                        VALUES (:uid, TRUE, :now, :now)
                        """
                    ),
                    {"uid": int(user_id), "now": now},
                )
                if dialect == "postgresql":
                    assessment_id = int(
                        bind.execute(
                            text("SELECT assessment_id FROM user_assessments WHERE user_id = :uid AND is_latest IS TRUE ORDER BY assessment_id DESC LIMIT 1"),
                            {"uid": int(user_id)},
                        ).scalar_one()
                    )
                else:
                    assessment_id = int(bind.execute(text("SELECT last_insert_rowid()")).scalar_one())

            bind.execute(
                text(
                    """
                    UPDATE user_responses
                    SET assessment_id = :aid
                    WHERE user_id = :uid
                      AND assessment_id IS NULL
                    """
                ),
                {"aid": assessment_id, "uid": int(user_id)},
            )

    if dialect == "postgresql":
        # Make rule functions respect the latest assessment (if assessment_id exists).
        op.execute(
            """
            CREATE OR REPLACE FUNCTION public.rule_match_scores(uid integer)
            RETURNS TABLE (
              fire integer,
              earth integer,
              air integer,
              water integer,
              space integer,
              action integer,
              clarity integer,
              emotional integer,
              opportunity integer
            )
            LANGUAGE sql
            STABLE
            AS $$
            WITH latest AS (
              SELECT assessment_id
              FROM user_assessments
              WHERE user_id = uid AND is_latest IS TRUE
              ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, assessment_id DESC
              LIMIT 1
            ),
            element_raw AS (
              SELECT
                q.element_id,
                CAST(ROUND(AVG(ur.score_obtained)) AS INTEGER) AS avg_score
              FROM user_responses ur
              JOIN latest l ON ur.assessment_id = l.assessment_id
              JOIN master_questions q ON q.question_id = ur.question_id
              WHERE ur.user_id = uid AND q.element_id IS NOT NULL
              GROUP BY q.element_id
            ),
            element_scores AS (
              SELECT
                COALESCE(MAX(CASE WHEN lower(trim(me.name)) LIKE '%fire%'  THEN er.avg_score END), 0) AS fire,
                COALESCE(MAX(CASE WHEN lower(trim(me.name)) LIKE '%earth%' THEN er.avg_score END), 0) AS earth,
                COALESCE(MAX(CASE WHEN lower(trim(me.name)) LIKE '%air%'   THEN er.avg_score END), 0) AS air,
                COALESCE(MAX(CASE WHEN lower(trim(me.name)) LIKE '%water%' THEN er.avg_score END), 0) AS water,
                COALESCE(MAX(CASE WHEN lower(trim(me.name)) LIKE '%space%' THEN er.avg_score END), 0) AS space
              FROM element_raw er
              JOIN master_element me ON me.id = er.element_id
            ),
            energy_raw AS (
              SELECT
                q.energy_id,
                CAST(ROUND(AVG(ur.score_obtained)) AS INTEGER) AS avg_score
              FROM user_responses ur
              JOIN latest l ON ur.assessment_id = l.assessment_id
              JOIN master_questions q ON q.question_id = ur.question_id
              WHERE ur.user_id = uid AND q.energy_id IS NOT NULL
              GROUP BY q.energy_id
            ),
            energy_scores AS (
              SELECT
                COALESCE(MAX(CASE WHEN lower(trim(en.name)) LIKE '%action%' OR lower(trim(en.name)) LIKE '%execution%' THEN er.avg_score END), 0) AS action,
                COALESCE(MAX(CASE WHEN lower(trim(en.name)) LIKE '%clarity%' OR lower(trim(en.name)) LIKE '%focus%' THEN er.avg_score END), 0) AS clarity,
                COALESCE(MAX(CASE WHEN lower(trim(en.name)) LIKE '%emotional%' OR lower(trim(en.name)) LIKE '%stability%' THEN er.avg_score END), 0) AS emotional,
                COALESCE(MAX(CASE WHEN lower(trim(en.name)) LIKE '%opportunity%' OR lower(trim(en.name)) LIKE '%time%' THEN er.avg_score END), 0) AS opportunity
              FROM energy_raw er
              JOIN master_energy en ON en.id = er.energy_id
            )
            SELECT e.fire, e.earth, e.air, e.water, e.space,
                   n.action, n.clarity, n.emotional, n.opportunity
            FROM element_scores e
            CROSS JOIN energy_scores n;
            $$;
            """
        )
        op.execute(
            """
            CREATE OR REPLACE FUNCTION public.match_rules(uid integer)
            RETURNS SETOF master_rule
            LANGUAGE sql
            STABLE
            AS $$
            WITH scores AS (
              SELECT *
              FROM public.rule_match_scores(uid)
            )
            SELECT r.*
            FROM master_rule r
            CROSS JOIN scores s
            WHERE
              s.fire BETWEEN COALESCE(r.fire_element_low, 0) AND COALESCE(r.fire_element_high, 100)
              AND s.earth BETWEEN COALESCE(r.earth_element_low, 0) AND COALESCE(r.earth_element_high, 100)
              AND s.air BETWEEN COALESCE(r.air_element_low, 0) AND COALESCE(r.air_element_high, 100)
              AND s.water BETWEEN COALESCE(r.water_element_low, 0) AND COALESCE(r.water_element_high, 100)
              AND s.space BETWEEN COALESCE(r.space_element_low, 0) AND COALESCE(r.space_element_high, 100)
              AND s.action BETWEEN COALESCE(r.action_energy_low, 0) AND COALESCE(r.action_energy_high, 100)
              AND s.clarity BETWEEN COALESCE(r.clarity_energy_low, 0) AND COALESCE(r.clarity_energy_high, 100)
              AND s.emotional BETWEEN COALESCE(r.emotional_energy_low, 0) AND COALESCE(r.emotional_energy_high, 100)
              AND s.opportunity BETWEEN COALESCE(r.opportunity_energy_low, 0) AND COALESCE(r.opportunity_energy_high, 100)
            ORDER BY r.priority, r.id;
            $$;
            """
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    dialect = bind.dialect.name

    if dialect == "postgresql":
        # Reverting the rule functions to pre-assessment behavior is not necessary for local rollback.
        # Keep them as-is.
        pass

    if inspector.has_table("user_responses"):
        columns = {col["name"] for col in inspector.get_columns("user_responses")}
        if "assessment_id" in columns:
            try:
                op.drop_index("ix_user_responses_assessment_id", table_name="user_responses")
            except Exception:
                pass
            try:
                op.drop_constraint("fk_user_responses_assessment_id", "user_responses", type_="foreignkey")
            except Exception:
                pass
            op.drop_column("user_responses", "assessment_id")

    if inspector.has_table("user_ai_reports"):
        op.drop_table("user_ai_reports")
    if inspector.has_table("user_assessments"):
        op.drop_table("user_assessments")
