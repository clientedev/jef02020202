from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, HTMLResponse
import os
import threading

# --- 1. CORE APP & HEALTH CHECK (Instant Boot) ---
app = FastAPI(title="Núcleo 1.03", version="1.0.0")

@app.get("/health")
async def health_check():
    """Ultra-fast health check - MUST result in success instantly on Railway"""
    return JSONResponse(
        content={"status": "healthy", "version": "1.0.0"}, 
        status_code=200
    )

# Objects defined globally but initialized lazily
SessionLocal = None
Base = None
engine = None
templates = None

# --- 2. DEFERRED INITIALIZATION LOGIC ---
def initialize_app_logic(app_instance):
    """Heavy imports and route registration encapsulated here"""
    global SessionLocal, Base, engine, templates
    
    try:
        from fastapi.staticfiles import StaticFiles
        from fastapi.templating import Jinja2Templates
        from fastapi.middleware.cors import CORSMiddleware
        from starlette.middleware.base import BaseHTTPMiddleware
        
        # Database setup
        try:
            from backend.database import SessionLocal as db_session, Base as db_base, engine as db_engine
            SessionLocal, Base, engine = db_session, db_base, db_engine
        except Exception as e:
            print(f"⚠️ Warning: Database connection error during lazy load: {e}")

        # Middleware
        app_instance.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        class NoCacheMiddleware(BaseHTTPMiddleware):
            async def dispatch(self, request, call_next):
                response = await call_next(request)
                if request.url.path.startswith('/static/js/'):
                    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
                return response
        app_instance.add_middleware(NoCacheMiddleware)

        # Static & Templates
        app_instance.mount("/static", StaticFiles(directory="static"), name="static")
        templates = Jinja2Templates(directory="templates")

        # Routers
        from backend.routers import (auth, empresas, prospeccoes, agendamentos, admin, 
                                    atribuicoes, consultores, dashboard, cnpj, 
                                    notificacoes, mensagens, cronograma, pipeline, 
                                    programs, contatos)
        from backend.routers.formularios import router as forms_router, router_public as forms_pub_router
        
        routers = [
            auth.router, admin.router, empresas.router, prospeccoes.router, 
            agendamentos.router, atribuicoes.router, consultores.router, 
            dashboard.router, cnpj.router, notificacoes.router, mensagens.router, 
            cronograma.router, pipeline.router, programs.router, contatos.router, 
            forms_router, forms_pub_router
        ]
        for r in routers:
            app_instance.include_router(r)
            
        print("✅ App Logic Initialized Successfully")
    except Exception as e:
        print(f"❌ Error during initialization: {e}")

# Call initialization at module level but AFTER /health is defined
# This is still blocking, but structured cleanly. 
# For Railway, if initialization is too slow, we might need to move this to startup.
initialize_app_logic(app)

# --- 3. PAGE ROUTES (Templates) ---
@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard_page(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})

@app.get("/empresas", response_class=HTMLResponse)
async def empresas_page(request: Request):
    return templates.TemplateResponse("empresas.html", {"request": request})

@app.get("/setup-db")
async def setup_db_endpoint():
    """Manual DB initialization endpoint"""
    from backend.utils.seed import (criar_usuario_admin_padrao, criar_consultores_padrao, 
                                   criar_stages_padrao, popular_pipeline, criar_prospeccoes_padrao)
    
    def run_init():
        if engine is None: return
        try:
            print("🛠️ Setup iniciado...")
            Base.metadata.create_all(bind=engine)
            db = SessionLocal()
            try:
                criar_usuario_admin_padrao(db)
                criar_consultores_padrao(db)
                criar_stages_padrao(db)
                print("✅ Setup concluído!")
            finally: db.close()
        except Exception as e: print(f"❌ Erro setup: {e}")

    threading.Thread(target=run_init, daemon=True).start()
    return {"status": "started", "message": "Inicialização do banco em background."}

# [Other page routes omitted for brevity but they should be here if needed]
# Actually, I should include ALL routes to ensure the app is fully functional.

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
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 5001)), reload=True)
