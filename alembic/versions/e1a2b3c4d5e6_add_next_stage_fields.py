"""Add next stage fields to empresas

Revision ID: e1a2b3c4d5e6
Revises: c9a12b34d567
Create Date: 2026-02-12 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1a2b3c4d5e6'
down_revision: Union[str, None] = 'c9a12b34d567'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add columns to empresas table if they don't exist
    connection = op.get_bind()
    
    # Check if we are in PostgreSQL or SQLite
    is_postgres = connection.engine.dialect.name == 'postgresql'
    
    if is_postgres:
        # PostgreSQL specific: ADD COLUMN IF NOT EXISTS is 9.6+
        op.execute("ALTER TABLE empresas ADD COLUMN IF NOT EXISTS proxima_etapa VARCHAR(500)")
        op.execute("ALTER TABLE empresas ADD COLUMN IF NOT EXISTS data_proxima_etapa DATE")
    else:
        # SQLite doesn't support IF NOT EXISTS in ALTER TABLE directly via SQL
        # Using Alembic's batch_alter_table or simple add_column with try-except
        try:
            op.add_column('empresas', sa.Column('proxima_etapa', sa.String(length=500), nullable=True))
        except Exception:
            pass
        
        try:
            op.add_column('empresas', sa.Column('data_proxima_etapa', sa.Date(), nullable=True))
        except Exception:
            pass


def downgrade() -> None:
    # Remove columns from empresas table
    with op.batch_alter_table('empresas') as batch_op:
        batch_op.drop_column('data_proxima_etapa')
        batch_op.drop_column('proxima_etapa')
