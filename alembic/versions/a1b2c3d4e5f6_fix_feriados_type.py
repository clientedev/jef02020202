"""Fix feriados type conflict

Revision ID: a1b2c3d4e5f6
Revises: e1a2b3c4d5e6
Create Date: 2026-02-13 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'e1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQL to drop the conflicting type 'feriados'
    # This type likely exists without the table, preventing table creation
    op.execute("DROP TYPE IF EXISTS feriados CASCADE")


def downgrade() -> None:
    pass
