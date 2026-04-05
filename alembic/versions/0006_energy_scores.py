"""Add energy_score aggregation and update sync_alignment

Revision ID: 0006_energy_scores
Revises: 0005_element_avg_div_total_elements
Create Date: 2026-04-04
"""

from alembic import op


revision = "0006_energy_scores"
down_revision = "0005_element_avg_div_total_elements"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS energy_score (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            energy_id INTEGER NOT NULL REFERENCES master_energy(id) ON DELETE CASCADE,
            score INTEGER NULL,
            avg_score INTEGER NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_energy_score_user_id ON energy_score (user_id);
        CREATE INDEX IF NOT EXISTS ix_energy_score_energy_id ON energy_score (energy_id);
        """
    )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.sync_alignment(uid integer)
        RETURNS void LANGUAGE plpgsql AS $$
        BEGIN
          -- category scores
          DELETE FROM career_alignment_scores WHERE user_id = uid;
          INSERT INTO career_alignment_scores (user_id, category_id, score, created_at, updated_at)
          SELECT user_id, category_id, score, NOW(), NOW()
          FROM v_career_alignment
          WHERE user_id = uid;

          -- overall score
          DELETE FROM career_scores WHERE user_id = uid;
          INSERT INTO career_scores (user_id, score, date)
          SELECT user_id, overall_score, TO_CHAR(NOW(), 'YYYY-MM-DD')
          FROM v_career_overall
          WHERE user_id = uid;

          -- element scores (avg = total / 5)
          DELETE FROM element_score WHERE user_id = uid;
          INSERT INTO element_score (user_id, element_id, score, avg_score, created_at, updated_at)
          SELECT
            ur.user_id,
            q.element_id,
            SUM(ur.score_obtained)::int AS score,
            ROUND(SUM(ur.score_obtained) / 5.0)::int AS avg_score,
            NOW(),
            NOW()
          FROM user_responses ur
          JOIN master_questions q ON q.question_id = ur.question_id
          WHERE q.element_id IS NOT NULL
            AND ur.user_id = uid
          GROUP BY ur.user_id, q.element_id;

          -- energy scores (avg = total / 5)
          DELETE FROM energy_score WHERE user_id = uid;
          INSERT INTO energy_score (user_id, energy_id, score, avg_score, created_at, updated_at)
          SELECT
            ur.user_id,
            q.energy_id,
            SUM(ur.score_obtained)::int AS score,
            ROUND(SUM(ur.score_obtained) / 5.0)::int AS avg_score,
            NOW(),
            NOW()
          FROM user_responses ur
          JOIN master_questions q ON q.question_id = ur.question_id
          WHERE q.energy_id IS NOT NULL
            AND ur.user_id = uid
          GROUP BY ur.user_id, q.energy_id;
        END;
        $$;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.sync_alignment(uid integer)
        RETURNS void LANGUAGE plpgsql AS $$
        BEGIN
          DELETE FROM career_alignment_scores WHERE user_id = uid;
          INSERT INTO career_alignment_scores (user_id, category_id, score, created_at, updated_at)
          SELECT user_id, category_id, score, NOW(), NOW()
          FROM v_career_alignment
          WHERE user_id = uid;

          DELETE FROM career_scores WHERE user_id = uid;
          INSERT INTO career_scores (user_id, score, date)
          SELECT user_id, overall_score, TO_CHAR(NOW(), 'YYYY-MM-DD')
          FROM v_career_overall
          WHERE user_id = uid;

          DELETE FROM element_score WHERE user_id = uid;
          INSERT INTO element_score (user_id, element_id, score, avg_score, created_at, updated_at)
          SELECT
            ur.user_id,
            q.element_id,
            SUM(ur.score_obtained)::int AS score,
            ROUND(SUM(ur.score_obtained) / 5.0)::int AS avg_score,
            NOW(),
            NOW()
          FROM user_responses ur
          JOIN master_questions q ON q.question_id = ur.question_id
          WHERE q.element_id IS NOT NULL
            AND ur.user_id = uid
          GROUP BY ur.user_id, q.element_id;
        END;
        $$;
        """
    )

    op.execute(
        """
        DROP INDEX IF EXISTS ix_energy_score_user_id;
        DROP INDEX IF EXISTS ix_energy_score_energy_id;
        DROP TABLE IF EXISTS energy_score;
        """
    )
