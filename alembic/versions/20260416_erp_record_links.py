"""Add ERP linked record columns

Revision ID: 20260416_erp_record_links
Revises: 20260416_erp_records
Create Date: 2026-04-16
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "20260416_erp_record_links"
down_revision = "20260416_erp_records"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE erp_records ADD COLUMN IF NOT EXISTS linked_record_id VARCHAR")
    op.execute("ALTER TABLE erp_records ADD COLUMN IF NOT EXISTS linked_record_title VARCHAR")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'erp_records_linked_record_id_fkey'
            ) THEN
                ALTER TABLE erp_records
                ADD CONSTRAINT erp_records_linked_record_id_fkey
                FOREIGN KEY (linked_record_id) REFERENCES erp_records (id);
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE erp_records DROP CONSTRAINT IF EXISTS erp_records_linked_record_id_fkey")
    op.execute("ALTER TABLE erp_records DROP COLUMN IF EXISTS linked_record_title")
    op.execute("ALTER TABLE erp_records DROP COLUMN IF EXISTS linked_record_id")
