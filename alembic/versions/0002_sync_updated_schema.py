"""sync models with existing db (idempotent)

Revision ID: 0002_sync_updated_schema
Revises: 0001_initial_schema
Create Date: 2026-04-01
"""

from alembic import op


revision = "0002_sync_updated_schema"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users: add new columns if missing
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'user_type_id'
            ) THEN
                ALTER TABLE users ADD COLUMN user_type_id INTEGER;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'referral_code'
            ) THEN
                ALTER TABLE users ADD COLUMN referral_code VARCHAR(20);
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'referred_by'
            ) THEN
                ALTER TABLE users ADD COLUMN referred_by BIGINT;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'is_verified'
            ) THEN
                ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'is_active'
            ) THEN
                ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
            END IF;
        END$$;
        """
    )

    # career_alignment_scores: reshape columns
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'career_alignment_scores' AND column_name = 'category_id'
            ) THEN
                ALTER TABLE career_alignment_scores ADD COLUMN category_id DOUBLE PRECISION;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'career_alignment_scores' AND column_name = 'score'
            ) THEN
                ALTER TABLE career_alignment_scores ADD COLUMN score INTEGER;
            END IF;

            -- drop legacy score columns if they still exist
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'career_alignment_scores' AND column_name = 'awareness_score'
            ) THEN
                ALTER TABLE career_alignment_scores DROP COLUMN awareness_score;
            END IF;

            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'career_alignment_scores' AND column_name = 'time_alignment_score'
            ) THEN
                ALTER TABLE career_alignment_scores DROP COLUMN time_alignment_score;
            END IF;

            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'career_alignment_scores' AND column_name = 'action_integrity_score'
            ) THEN
                ALTER TABLE career_alignment_scores DROP COLUMN action_integrity_score;
            END IF;

            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'career_alignment_scores' AND column_name = 'overall_score'
            ) THEN
                ALTER TABLE career_alignment_scores DROP COLUMN overall_score;
            END IF;
        END$$;
        """
    )

    # idempotent creates for new master/question tables
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS question_user_type_map (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            question_id INTEGER NOT NULL,
            user_type_id INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS master_sections (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL,
            display_order INTEGER,
            is_active BOOLEAN,
            created_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS master_questions (
            question_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            question_text TEXT NOT NULL,
            answer_type VARCHAR NOT NULL,
            score SMALLINT,
            is_required BOOLEAN DEFAULT TRUE,
            display_order INTEGER DEFAULT 1,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            created_by BIGINT,
            updated_at TIMESTAMP,
            updated_by BIGINT,
            set_id INTEGER,
            energy_id INTEGER,
            weight NUMERIC(5,2) DEFAULT 1.0,
            section_id INTEGER,
            element_id INTEGER,
            category_id INTEGER
        );

        CREATE TABLE IF NOT EXISTS master_energy (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL,
            display_order INTEGER,
            is_active BOOLEAN,
            created_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS master_element (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL
        );

        CREATE TABLE IF NOT EXISTS master_category (
            id SERIAL PRIMARY KEY,
            category_name VARCHAR(255) NOT NULL
        );
        """
    )


def downgrade() -> None:
    # No destructive downgrade to keep in sync with already-updated DB.
    pass
