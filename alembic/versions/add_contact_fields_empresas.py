"""Add contact fields to empresas table

Revision ID: c9a12b34d567
Revises: f80b2b33a570
Create Date: 2025-12-01 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c9a12b34d567'
down_revision: Union[str, None] = 'f80b2b33a570'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    
    empresas_columns = [
        ('nome_contato', 'VARCHAR(200)'),
        ('cargo_contato', 'VARCHAR(200)'),
        ('telefone_contato', 'VARCHAR(50)'),
        ('email_contato', 'VARCHAR(200)'),
    ]
    
    for column_name, column_type in empresas_columns:
        try:
            connection.execute(sa.text(f"""
                ALTER TABLE empresas 
                ADD COLUMN IF NOT EXISTS {column_name} {column_type}
            """))
        except Exception as e:
            print(f"Column {column_name} may already exist or error: {e}")
    
    prospeccoes_columns = [
        ('codigo', 'VARCHAR(50)'),
        ('data_atualizacao', 'TIMESTAMP'),
    ]
    
    for column_name, column_type in prospeccoes_columns:
        try:
            connection.execute(sa.text(f"""
                ALTER TABLE prospeccoes 
                ADD COLUMN IF NOT EXISTS {column_name} {column_type}
            """))
        except Exception as e:
            print(f"Column {column_name} may already exist or error: {e}")
    
    try:
        connection.execute(sa.text("""
            CREATE UNIQUE INDEX IF NOT EXISTS ix_prospeccoes_codigo 
            ON prospeccoes (codigo) WHERE codigo IS NOT NULL
        """))
    except Exception as e:
        print(f"Index may already exist or error: {e}")
    
    try:
        connection.execute(sa.text("""
            CREATE TABLE IF NOT EXISTS prospeccoes_historico (
                id SERIAL PRIMARY KEY,
                prospeccao_id INTEGER NOT NULL REFERENCES prospeccoes(id),
                usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
                data_alteracao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                tipo_alteracao VARCHAR(50) NOT NULL,
                campo_alterado VARCHAR(100),
                valor_anterior TEXT,
                valor_novo TEXT,
                descricao TEXT
            )
        """))
    except Exception as e:
        print(f"Table prospeccoes_historico may already exist or error: {e}")
    
    try:
        connection.execute(sa.text("""
            CREATE INDEX IF NOT EXISTS ix_prospeccoes_historico_id 
            ON prospeccoes_historico (id)
        """))
    except Exception as e:
        print(f"Index may already exist or error: {e}")


def downgrade() -> None:
    connection = op.get_bind()
    
    try:
        connection.execute(sa.text("DROP TABLE IF EXISTS prospeccoes_historico CASCADE"))
    except Exception:
        pass
    
    try:
        connection.execute(sa.text("DROP INDEX IF EXISTS ix_prospeccoes_codigo"))
    except Exception:
        pass
    
    columns_to_drop = ['nome_contato', 'cargo_contato', 'telefone_contato', 'email_contato']
    for col in columns_to_drop:
        try:
            connection.execute(sa.text(f"ALTER TABLE empresas DROP COLUMN IF EXISTS {col}"))
        except Exception:
            pass
