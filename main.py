from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, HTMLResponse
import os
import asyncio

# --- 1. MINIMAL APP (Milisecond Startup) ---
app = FastAPI(title="Núcleo 1.03", version="1.0.0")

# Global containers for lazy loading
templates = None
is_ready = False

@app.get("/health")
async def health_check():
    """Hyper-fast health check. No dependencies, no logic."""
    return JSONResponse(content={"status": "online", "ready": is_ready}, status_code=200)

# --- 2. ASYNC INITIALIZATION ---
# This runs after the server is technically 'alive'
@app.on_event("startup")
async def startup_event():
    global templates, is_ready
    print("🚀 [STARTUP] Iniciando carregamento de módulos pesados...")
    
    try:
        from fastapi.staticfiles import StaticFiles
        from fastapi.templating import Jinja2Templates
        from fastapi.middleware.cors import CORSMiddleware
        
        # Middleware
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        # Static & Templates
        if os.path.exists("static"):
            app.mount("/static", StaticFiles(directory="static"), name="static")
        if os.path.exists("templates"):
            templates = Jinja2Templates(directory="templates")

        # Routers (Heavy imports)
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
            app.include_router(r)

        is_ready = True
        print("✅ [STARTUP] Sistema totalmente carregado e pronto!")
        
    except Exception as e:
        print(f"❌ [STARTUP] Falha crítica na carga: {e}")

# --- 3. BASIC PAGE HANDLERS (Waiting for templates) ---
@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    if not templates: return HTMLResponse("Carregando sistema... Por favor, aguarde 30 segundos e atualize.")
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/setup-db")
async def setup_db_endpoint():
    """Endpoint manual para o banco remoto"""
    import threading
    from backend.database import get_engine, Base, SessionLocal
    from backend.utils.seed import (criar_usuario_admin_padrao, criar_consultores_padrao, 
                                   criar_stages_padrao)
    
    def run_init():
        try:
            # Força a criação do engine usando o DATABASE_URL do ambiente
            eng = get_engine()
            Base.metadata.create_all(bind=eng)
            db = SessionLocal()
            try:
                criar_usuario_admin_padrao(db)
                criar_consultores_padrao(db)
                criar_stages_padrao(db)
            finally: db.close()
            print("✅ [SETUP] Banco remoto inicializado!")
        except Exception as e: print(f"❌ [SETUP] Erro: {e}")

    threading.Thread(target=run_init, daemon=True).start()
    return {"status": "started", "message": "Inicialização do banco em background."}

# Essencial: Repetir rotas principais para não dar 404 durante a carga
@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard_page(request: Request):
    if not templates: return HTMLResponse("Carregando...")
    return templates.TemplateResponse("dashboard.html", {"request": request})

@app.get("/empresas", response_class=HTMLResponse)
async def empresas_page(request: Request):
    if not templates: return HTMLResponse("Carregando...")
    return templates.TemplateResponse("empresas.html", {"request": request})

@app.get("/contatos", response_class=HTMLResponse)
async def contatos_page(request: Request):
    if not templates: return HTMLResponse("Carregando...")
    return templates.TemplateResponse("contatos.html", {"request": request})

@app.get("/prospeccao", response_class=HTMLResponse)
async def prospeccao_page(request: Request):
    if not templates: return HTMLResponse("Carregando...")
    return templates.TemplateResponse("prospeccao_nova.html", {"request": request})

if __name__ == "__main__":
    import uvicorn
    # Em produção o uvicorn é chamado via o script de entrada
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
