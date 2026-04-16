"""Add ERP records table and finance industry value

Revision ID: 20260416_erp_records
Revises:
Create Date: 2026-04-16
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260416_erp_records"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE tenantindustry ADD VALUE IF NOT EXISTS 'finance'")

    op.create_table(
        "erp_records",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("tenant_id", sa.String(), nullable=False),
        sa.Column("module_name", sa.String(), nullable=False),
        sa.Column("entity_name", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("priority", sa.String(), nullable=False),
        sa.Column("assigned_to_user_id", sa.String(), nullable=True),
        sa.Column("amount_cents", sa.Integer(), nullable=True),
        sa.Column("owner_user_id", sa.String(), nullable=True),
        sa.Column("due_at", sa.DateTime(), nullable=True),
        sa.Column("blocked_at", sa.DateTime(), nullable=True),
        sa.Column("blocked_reason", sa.String(), nullable=True),
        sa.Column("linked_record_id", sa.String(), nullable=True),
        sa.Column("linked_record_title", sa.String(), nullable=True),
        sa.Column("payload_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["assigned_to_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["linked_record_id"], ["erp_records.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_erp_records_tenant_id"), "erp_records", ["tenant_id"], unique=False)
    op.create_index(op.f("ix_erp_records_module_name"), "erp_records", ["module_name"], unique=False)
    op.create_index(op.f("ix_erp_records_entity_name"), "erp_records", ["entity_name"], unique=False)
    op.create_index(op.f("ix_erp_records_linked_record_id"), "erp_records", ["linked_record_id"], unique=False)

    op.create_table(
        "erp_record_history",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("record_id", sa.String(), nullable=False),
        sa.Column("tenant_id", sa.String(), nullable=False),
        sa.Column("module_name", sa.String(), nullable=False),
        sa.Column("entity_name", sa.String(), nullable=False),
        sa.Column("from_status", sa.String(), nullable=True),
        sa.Column("to_status", sa.String(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("action_user_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["record_id"], ["erp_records.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["action_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_erp_record_history_record_id"), "erp_record_history", ["record_id"], unique=False)
    op.create_index(op.f("ix_erp_record_history_tenant_id"), "erp_record_history", ["tenant_id"], unique=False)
    op.create_index(op.f("ix_erp_record_history_module_name"), "erp_record_history", ["module_name"], unique=False)
    op.create_index(op.f("ix_erp_record_history_entity_name"), "erp_record_history", ["entity_name"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_erp_record_history_entity_name"), table_name="erp_record_history")
    op.drop_index(op.f("ix_erp_record_history_module_name"), table_name="erp_record_history")
    op.drop_index(op.f("ix_erp_record_history_tenant_id"), table_name="erp_record_history")
    op.drop_index(op.f("ix_erp_record_history_record_id"), table_name="erp_record_history")
    op.drop_table("erp_record_history")
    op.drop_index(op.f("ix_erp_records_entity_name"), table_name="erp_records")
    op.drop_index(op.f("ix_erp_records_module_name"), table_name="erp_records")
    op.drop_index(op.f("ix_erp_records_tenant_id"), table_name="erp_records")
    op.drop_index(op.f("ix_erp_records_linked_record_id"), table_name="erp_records")
    op.drop_table("erp_records")
