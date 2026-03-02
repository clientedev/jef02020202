"""Add programs table and cronograma_eventos fields

Revision ID: b8ef29039c72
Revises: a1b2c3d4e5f6
Create Date: 2026-03-02 11:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b8ef29039c72'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create programs table if not exists
    op.create_table('programs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(length=200), nullable=False),
        sa.Column('carga_horaria', sa.Float(), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('empresa_id', sa.Integer(), nullable=True),
        sa.Column('data_criacao', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_programs_id'), 'programs', ['id'], unique=False)

    # 2. Add columns to cronograma_eventos if they don't exist
    # Using execute with ALTER TABLE ADD COLUMN IF NOT EXISTS for PG compatibility
    # And batch_alter_table for SQLite compatibility
    
    connection = op.get_bind()
    is_postgres = connection.engine.dialect.name == 'postgresql'

    if is_postgres:
        op.execute("ALTER TABLE cronograma_eventos ADD COLUMN IF NOT EXISTS program_id INTEGER REFERENCES programs(id)")
        op.execute("ALTER TABLE cronograma_eventos ADD COLUMN IF NOT EXISTS carga_horaria FLOAT DEFAULT 0")
    else:
        with op.batch_alter_table('cronograma_eventos') as batch_op:
            try:
                batch_op.add_column(sa.Column('program_id', sa.Integer(), sa.ForeignKey('programs.id'), nullable=True))
            except Exception:
                pass
            try:
                batch_op.add_column(sa.Column('carga_horaria', sa.Float(), nullable=True, server_default='0'))
            except Exception:
                pass


def downgrade() -> None:
    # 1. Remove columns from cronograma_eventos
    with op.batch_alter_table('cronograma_eventos') as batch_op:
        batch_op.drop_column('carga_horaria')
        batch_op.drop_column('program_id')

    # 2. Drop programs table
    op.drop_index(op.f('ix_programs_id'), table_name='programs')
    op.drop_table('programs')
