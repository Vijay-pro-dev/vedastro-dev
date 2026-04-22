"""Add DB-side rule matching functions.

Revision ID: 0014_match_rules_function
Revises: 0013_subscription_tables
Create Date: 2026-04-22
"""

from alembic import op


revision = "0014_match_rules_function"
down_revision = "0013_subscription_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        # SQLite/local dev does not support stored functions the same way.
        return

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
        WITH element_raw AS (
          SELECT
            q.element_id,
            CAST(ROUND(AVG(ur.score_obtained)) AS INTEGER) AS avg_score
          FROM user_responses ur
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
    if bind.dialect.name != "postgresql":
        return

    op.execute("DROP FUNCTION IF EXISTS public.match_rules(uid integer);")
    op.execute("DROP FUNCTION IF EXISTS public.rule_match_scores(uid integer);")

