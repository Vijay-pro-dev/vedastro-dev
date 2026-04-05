"""Adjust element_score avg to divide by total elements (5)

Revision ID: 0005_element_avg_div_total_elements
Revises: 0004_element_scores
Create Date: 2026-04-04
"""

from alembic import op


revision = "0005_element_avg_div_total_elements"
down_revision = "0004_element_scores"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Recreate sync_alignment to store avg_score as total_per_element / 5
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

          -- element scores: avg_score = total / 5 elements
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


def downgrade() -> None:
    # Revert to per-element average of its own responses
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
            ROUND(AVG(ur.score_obtained))::int AS avg_score,
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
