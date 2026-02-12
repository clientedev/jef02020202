from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from backend.database import SessionLocal, Base, engine
from backend.models import Usuario, Empresa, Prospeccao, Agendamento, AtribuicaoEmpresa, Notificacao, Mensagem
from backend.routers import auth, empresas, prospeccoes, agendamentos, admin, atribuicoes, consultores, dashboard, cnpj, notificacoes, mensagens, cronograma, pipeline, programs, contatos
from backend.routers.formularios import router as formularios_router, router_public as formularios_public_router
from backend.utils.seed import criar_usuario_admin_padrao, criar_empresas_padrao, criar_consultores_padrao, criar_stages_padrao, popular_pipeline, criar_prospeccoes_padrao
from backend.utils.seed_cronograma import seed_cronograma
from backend.models.prospeccoes import gerar_codigo_prospeccao

app = FastAPI(title="Núcleo 1.03", version="1.0.0")

def get_existing_columns(conn, table_name):
    """Retorna um conjunto com os nomes das colunas existentes na tabela"""
    from sqlalchemy import text
    if engine.dialect.name == 'sqlite':
        result = conn.execute(text(f"PRAGMA table_info('{table_name}')"))
        return {row[1] for row in result.fetchall()}
    else:
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = :table
        """), {"table": table_name})
        return {row[0] for row in result.fetchall()}

def get_existing_tables(conn):
    """Retorna um conjunto com os nomes das tabelas existentes"""
    from sqlalchemy import text
    if engine.dialect.name == 'sqlite':
        result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
        return {row[0] for row in result.fetchall()}
    else:
        result = conn.execute(text("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public'
        """))
        return {row[0] for row in result.fetchall()}

def adicionar_colunas_faltantes_empresas():
    """Adiciona colunas faltantes à tabela empresas se não existirem"""
    from sqlalchemy import text
    
    if engine is None:
        return
    
    colunas_necessarias = {
        'nome_contato': 'VARCHAR(200)',
        'cargo_contato': 'VARCHAR(200)',
        'telefone_contato': 'VARCHAR(50)',
        'email_contato': 'VARCHAR(200)',
        'cep': 'VARCHAR(20)',
        'proxima_etapa': 'VARCHAR(500)',
        'data_proxima_etapa': 'DATE',
    }
    
    with engine.connect() as conn:
        colunas_existentes = get_existing_columns(conn, 'empresas')
        
        for coluna, tipo in colunas_necessarias.items():
            if coluna not in colunas_existentes:
                print(f"Adicionando coluna '{coluna}' à tabela empresas...")
                try:
                    conn.execute(text(f"ALTER TABLE empresas ADD COLUMN {coluna} {tipo}"))
                    conn.commit()
                    print(f"Coluna '{coluna}' adicionada com sucesso à empresas")
                except Exception as e:
                    print(f"⚠️ Erro ao adicionar coluna '{coluna}' à empresas: {e}")

def adicionar_colunas_faltantes_contatos():
    """Adiciona colunas faltantes à tabela contatos se não existirem"""
    from sqlalchemy import text
    
    if engine is None:
        return
    
    colunas_necessarias = {
        'ponto_focal': 'BOOLEAN DEFAULT FALSE',
        'proprietario_socio': 'BOOLEAN DEFAULT FALSE',
        'telefone_fixo': 'VARCHAR(50)',
        'celular2': 'VARCHAR(50)',
        'emails_voltaram': 'BOOLEAN DEFAULT FALSE',
        'observacoes': 'TEXT',
    }
    
    with engine.connect() as conn:
        colunas_existentes = get_existing_columns(conn, 'contatos')
        
        for coluna, tipo in colunas_necessarias.items():
            if coluna not in colunas_existentes:
                print(f"Adicionando coluna '{coluna}' à tabela contatos...")
                try:
                    conn.execute(text(f"ALTER TABLE contatos ADD COLUMN {coluna} {tipo}"))
                    conn.commit()
                    print(f"Coluna '{coluna}' adicionada com sucesso à contatos")
                except Exception as e:
                    print(f"⚠️ Erro ao adicionar coluna '{coluna}' à contatos: {e}")

def criar_tabela_prospeccoes_historico():
    """Cria a tabela prospeccoes_historico se não existir"""
    from sqlalchemy import text
    
    if engine is None:
        return
    
    with engine.connect() as conn:
        tabelas_existentes = get_existing_tables(conn)
        if 'prospeccoes_historico' not in tabelas_existentes:
            print("Criando tabela prospeccoes_historico...")
            try:
                # Usando sintaxe compatível com SQLite e Postgres
                id_type = "SERIAL" if engine.dialect.name != 'sqlite' else "INTEGER PRIMARY KEY AUTOINCREMENT"
                timestamp_type = "TIMESTAMP" if engine.dialect.name != 'sqlite' else "DATETIME"
                now_func = "CURRENT_TIMESTAMP"
                
                query = f"""
                    CREATE TABLE prospeccoes_historico (
                        id {id_type},
                        prospeccao_id INTEGER NOT NULL REFERENCES prospeccoes(id),
                        usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
                        data_alteracao {timestamp_type} NOT NULL DEFAULT {now_func},
                        tipo_alteracao VARCHAR(50) NOT NULL,
                        campo_alterado VARCHAR(100),
                        valor_anterior TEXT,
                        valor_novo TEXT,
                        descricao TEXT
                    )
                """
                conn.execute(text(query))
                conn.commit()
                print("Tabela prospeccoes_historico criada com sucesso")
            except Exception as e:
                print(f"Erro ao criar tabela prospeccoes_historico: {e}")

def adicionar_colunas_faltantes_prospeccoes():
    """Adiciona colunas faltantes à tabela prospeccoes se não existirem"""
    from sqlalchemy import text
    
    if engine is None:
        return
    
    colunas_necessarias = {
        'codigo': 'VARCHAR(50)',
        'data_atualizacao': 'TIMESTAMP',
        'porte': 'VARCHAR(50)',
        'lr': 'VARCHAR(50)',
        'id_externo': 'VARCHAR(100)',
        'cfr': 'VARCHAR(50)',
        'tipo_producao': 'VARCHAR(200)',
        'data_prospeccao': 'DATE',
        'follow_up': 'DATE',
        'nome_contato': 'VARCHAR(200)',
        'cargo': 'VARCHAR(200)',
        'celular': 'VARCHAR(50)',
        'telefone': 'VARCHAR(50)',
        'telefone_contato': 'VARCHAR(50)',
        'email_contato': 'VARCHAR(200)',
        'cargo_contato': 'VARCHAR(200)',
        'cnpj': 'VARCHAR(50)',
        'status_prospeccao': 'VARCHAR(100)',
        'responsavel': 'VARCHAR(200)',
        'opcoes': 'TEXT',
        'retorno': 'TEXT',
        'observacoes_prospeccao': 'TEXT',
        'interesse_treinamento': 'BOOLEAN DEFAULT FALSE',
        'interesse_consultoria': 'BOOLEAN DEFAULT FALSE',
        'interesse_certificacao': 'BOOLEAN DEFAULT FALSE',
        'interesse_eventos': 'BOOLEAN DEFAULT FALSE',
        'interesse_produtos': 'BOOLEAN DEFAULT FALSE',
        'interesse_seguranca': 'BOOLEAN DEFAULT FALSE',
        'interesse_meio_ambiente': 'BOOLEAN DEFAULT FALSE',
        'outros_interesses': 'TEXT',
        'potencial_negocio': 'VARCHAR(50)',
        'status_follow_up': 'VARCHAR(100)',
        'proxima_prospeccao_data': 'DATE',
    }
    
    with engine.connect() as conn:
        colunas_existentes = get_existing_columns(conn, 'prospeccoes')
        
        for coluna, tipo in colunas_necessarias.items():
            if coluna not in colunas_existentes:
                print(f"Adicionando coluna '{coluna}' à tabela prospeccoes...")
                try:
                    conn.execute(text(f"ALTER TABLE prospeccoes ADD COLUMN {coluna} {tipo}"))
                    conn.commit()
                    print(f"Coluna '{coluna}' adicionada com sucesso")
                except Exception as e:
                    print(f"Erro ao adicionar coluna '{coluna}': {e}")
        
        if 'codigo' not in colunas_existentes:
            print("🔄 Criando índice único para coluna 'codigo'...")
            try:
                conn.execute(text("""
                    CREATE UNIQUE INDEX IF NOT EXISTS ix_prospeccoes_codigo 
                    ON prospeccoes (codigo) WHERE codigo IS NOT NULL
                """))
                conn.commit()
                print("✅ Índice criado com sucesso")
            except Exception as e:
                print(f"⚠️ Erro ao criar índice: {e}")

def atualizar_prospeccoes_sem_codigo(db):
    """Atualiza prospecções que não possuem código único"""
    from sqlalchemy import text
    
    result = db.execute(text("""
        SELECT id FROM prospeccoes WHERE codigo IS NULL OR codigo = ''
    """))
    ids_sem_codigo = [row[0] for row in result.fetchall()]
    
    if ids_sem_codigo:
        print(f"🔄 Atualizando {len(ids_sem_codigo)} prospecções sem código...")
        for pid in ids_sem_codigo:
            novo_codigo = gerar_codigo_prospeccao()
            db.execute(text("""
                UPDATE prospeccoes SET codigo = :codigo WHERE id = :id
            """), {"codigo": novo_codigo, "id": pid})
        db.commit()
        print(f"Prospeccoes atualizadas com codigo unico")

@app.get("/health")
async def health_check():
    """Health check endpoint - must respond quickly and independently of database state"""
    return JSONResponse(
        content={
            "status": "healthy", 
            "app": "Nucleo 1.03",
            "version": "1.0.0"
        }, 
        status_code=200,
        headers={"Cache-Control": "no-cache"}
    )

def adicionar_colunas_faltantes_eventos():
    """Adiciona colunas faltantes à tabela cronograma_eventos se não existirem"""
    from sqlalchemy import text
    
    if engine is None:
        return
    
    colunas_necessarias = {
        'program_id': 'INTEGER REFERENCES programs(id)',
        'carga_horaria': 'FLOAT DEFAULT 0',
    }
    
    with engine.connect() as conn:
        colunas_existentes = get_existing_columns(conn, 'cronograma_eventos')
        
        for coluna, tipo in colunas_necessarias.items():
            if coluna not in colunas_existentes:
                print(f"🔄 Adicionando coluna '{coluna}' à tabela cronograma_eventos...")
                try:
                    conn.execute(text(f"ALTER TABLE cronograma_eventos ADD COLUMN {coluna} {tipo}"))
                    conn.commit()
                    print(f"✅ Coluna '{coluna}' adicionada com sucesso à cronograma_eventos")
                except Exception as e:
                    print(f"⚠️ Erro ao adicionar coluna '{coluna}' à cronograma_eventos: {e}")

@app.on_event("startup")
async def startup_event():
    """Startup event - DB initialization disabled to ensure fast boot on Railway"""
    print("🚀 Aplicação iniciada (Inicialização de banco via startup desativada)")
    # Para criar as tabelas remotamente, use os scripts de seed separadamente

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from starlette.middleware.base import BaseHTTPMiddleware

class NoCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        if request.url.path.startswith('/static/js/'):
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
        return response

app.add_middleware(NoCacheMiddleware)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(empresas.router)
app.include_router(prospeccoes.router)
app.include_router(agendamentos.router)
app.include_router(atribuicoes.router)
app.include_router(consultores.router)
app.include_router(dashboard.router)
app.include_router(cnpj.router)
app.include_router(notificacoes.router)
app.include_router(mensagens.router)
app.include_router(cronograma.router)
app.include_router(pipeline.router)
app.include_router(programs.router)
app.include_router(contatos.router)
app.include_router(formularios_router)
app.include_router(formularios_public_router)

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard_page(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})

@app.get("/empresas", response_class=HTMLResponse)
async def empresas_page(request: Request):
    return templates.TemplateResponse("empresas.html", {"request": request})

@app.get("/contatos", response_class=HTMLResponse)
async def contatos_page(request: Request):
    return templates.TemplateResponse("contatos.html", {"request": request})

@app.get("/empresa/{empresa_id}", response_class=HTMLResponse)
async def empresa_perfil(request: Request, empresa_id: int):
    return templates.TemplateResponse("empresa_perfil.html", {"request": request, "empresa_id": empresa_id})

@app.get("/prospeccao", response_class=HTMLResponse)
async def prospeccao_page(request: Request):
    return templates.TemplateResponse("prospeccao_nova.html", {"request": request})

@app.get("/alertas", response_class=HTMLResponse)
async def alertas_page(request: Request):
    return templates.TemplateResponse("alertas.html", {"request": request})

@app.get("/admin/usuarios", response_class=HTMLResponse)
async def admin_usuarios_page(request: Request):
    return templates.TemplateResponse("admin_usuarios.html", {"request": request})

@app.get("/admin/atribuicoes", response_class=HTMLResponse)
async def admin_atribuicoes_page(request: Request):
    return templates.TemplateResponse("admin_atribuicoes.html", {"request": request})

@app.get("/consultores", response_class=HTMLResponse)
async def consultores_page(request: Request):
    return templates.TemplateResponse("consultores.html", {"request": request})

@app.get("/consultor/{consultor_id}", response_class=HTMLResponse)
async def consultor_perfil_page(request: Request, consultor_id: int):
    return templates.TemplateResponse("consultor_perfil.html", {"request": request, "consultor_id": consultor_id})

@app.get("/buscar-empresa", response_class=HTMLResponse)
async def buscar_empresa_page(request: Request):
    return templates.TemplateResponse("buscar_empresa.html", {"request": request})

@app.get("/chat", response_class=HTMLResponse)
async def chat_page(request: Request):
    return templates.TemplateResponse("chat.html", {"request": request})

@app.get("/cronograma", response_class=HTMLResponse)
async def cronograma_page(request: Request):
    return templates.TemplateResponse("cronograma.html", {"request": request})

@app.get("/agenda-operacional", response_class=HTMLResponse)
async def agenda_operacional_page(request: Request):
    return templates.TemplateResponse("agenda_operacional.html", {"request": request})

@app.get("/pipeline", response_class=HTMLResponse)
async def pipeline_page(request: Request):
    return templates.TemplateResponse("pipeline.html", {"request": request})

@app.get("/formularios", response_class=HTMLResponse)
async def formularios_page(request: Request):
    return templates.TemplateResponse("formularios.html", {"request": request})

@app.get("/formularios/novo", response_class=HTMLResponse)
async def novo_formulario_page(request: Request):
    return templates.TemplateResponse("novo_formulario.html", {"request": request})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5001, reload=True)
