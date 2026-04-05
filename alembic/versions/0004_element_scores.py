"""Add element_score aggregation table and extend sync_alignment

Revision ID: 0004_element_scores
Revises: 0003_alignment_views
Create Date: 2026-04-04
"""

from alembic import op


revision = "0004_element_scores"
down_revision = "0003_alignment_views"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Table to store per-user aggregated element scores
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS element_score (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            element_id INTEGER NOT NULL REFERENCES master_element(id) ON DELETE CASCADE,
            score INTEGER NULL,
            avg_score INTEGER NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS ix_element_score_user_id ON element_score (user_id);
        CREATE INDEX IF NOT EXISTS ix_element_score_element_id ON element_score (element_id);
        """
    )

    # Extend sync_alignment to also populate element_score
    op.execute(
        """
        CREATE OR REPLACE FUNCTION sync_alignment(uid int)
        RETURNS void AS $$
        BEGIN
          -- category-level alignment
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

          -- element-level aggregation
          DELETE FROM element_score WHERE user_id = uid;
          INSERT INTO element_score (user_id, element_id, score, avg_score, created_at, updated_at)
          SELECT
            user_id,
            element_id,
            SUM(score_obtained)::int AS score,
            ROUND(AVG(score_obtained))::int AS avg_score,
            NOW(),
            NOW()
          FROM (
            SELECT ur.user_id, q.element_id, ur.score_obtained
            FROM user_responses ur
            JOIN master_questions q ON q.question_id = ur.question_id
            WHERE q.element_id IS NOT NULL
          ) AS t
          WHERE user_id = uid
          GROUP BY user_id, element_id;
        END;
        $$ LANGUAGE plpgsql;
        """
    )


def downgrade() -> None:
    # revert sync_alignment to previous behavior (category + overall only)
    op.execute(
        """
        CREATE OR REPLACE FUNCTION sync_alignment(uid int)
        RETURNS void AS $$
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
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    op.execute(
        """
        DROP INDEX IF EXISTS ix_element_score_user_id;
        DROP INDEX IF EXISTS ix_element_score_element_id;
        DROP TABLE IF EXISTS element_score;
        """
    )
