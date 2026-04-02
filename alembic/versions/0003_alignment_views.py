"""DB-side career score aggregation (views + function)

Revision ID: 0003_alignment_views
Revises: 0002_sync_updated_schema
Create Date: 2026-04-01
"""

from alembic import op


revision = "0003_alignment_views"
down_revision = "0002_sync_updated_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE OR REPLACE VIEW v_career_alignment AS
        SELECT
          ur.user_id,
          q.category_id,
          ROUND(AVG(ur.score_obtained))::int AS score
        FROM user_responses ur
        JOIN master_questions q ON q.question_id = ur.question_id
        WHERE q.category_id IS NOT NULL
        GROUP BY ur.user_id, q.category_id;

        CREATE OR REPLACE VIEW v_career_overall AS
        SELECT
          user_id,
          ROUND(AVG(score))::int AS overall_score
        FROM v_career_alignment
        GROUP BY user_id;

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


def downgrade() -> None:
    op.execute(
        """
        DROP FUNCTION IF EXISTS sync_alignment(uid int);
        DROP VIEW IF EXISTS v_career_overall;
        DROP VIEW IF EXISTS v_career_alignment;
        """
    )
