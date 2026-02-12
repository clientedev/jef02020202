from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, HTMLResponse
import os
import threading
import time

# --- 1. HYPERSONIC BOOT (Online in Milliseconds) ---
app = FastAPI(title="Núcleo 1.03", version="1.0.0")

# Global containers for lazy loading
templates = None
is_fully_loaded = False
loading_error = None

@app.get("/health")
async def health_check():
    """Definitive health check - NO dependencies. Always 200 OK for Railway."""
    return JSONResponse(
        content={
            "status": "online", 
            "is_fully_loaded": is_fully_loaded,
            "error": loading_error
        }, 
        status_code=200
    )

# --- 2. ASYNC BACKGROUND LOADING ---
def deferred_startup(app_instance):
    global templates, is_fully_loaded, loading_error
    print("🚀 [HYPERSONIC] Iniciando carga de módulos em background...")
    try:
        from fastapi.staticfiles import StaticFiles
        from fastapi.templating import Jinja2Templates
        from fastapi.middleware.cors import CORSMiddleware
        
        # 2a. Middleware
        app_instance.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        # 2b. Static & Templates
        if os.path.exists("static"):
            app_instance.mount("/static", StaticFiles(directory="static"), name="static")
        if os.path.exists("templates"):
            templates = Jinja2Templates(directory="templates")

        # 2c. Routers (THE HEAVY PART)
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

        # 2d. Auto-init DB in background (if not already done by prestart)
        from pre_start import init_db
        init_db()

        is_fully_loaded = True
        print("✅ [HYPERSONIC] Sistema pronto para uso!")
        
    except Exception as e:
        loading_error = str(e)
        print(f"❌ [HYPERSONIC] Falha crítica na carga: {e}")

# Inicia a carga imediatamente em uma THREAD separada
# Isso garante que o uvicorn consiga iniciar o server e responder /health 
# enquanto o resto do app ainda está "acordando".
threading.Thread(target=deferred_startup, args=(app,), daemon=True).start()

# --- 3. PAGE HANDLERS ---
@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    if not is_fully_loaded:
        return HTMLResponse("<h1>Página Inicial</h1><p>O sistema está carregando os módulos internos. Por favor, <b>atualize a página em 10 segundos</b>.</p>")
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/setup-db")
async def setup_db_endpoint():
    """Manual trigger for remote DB initialization"""
    from backend.database import get_engine, Base, SessionLocal
    from backend.utils.seed import (criar_usuario_admin_padrao, criar_consultores_padrao, criar_stages_padrao)
    
    def run_init():
        try:
            eng = get_engine()
            Base.metadata.create_all(bind=eng)
            db = SessionLocal()
            try:
                criar_usuario_admin_padrao(db)
                criar_consultores_padrao(db)
                criar_stages_padrao(db)
            finally: db.close()
            print("✅ [SETUP] Banco remoto inicializado com sucesso!")
        except Exception as e: print(f"❌ [SETUP] Erro: {e}")

    threading.Thread(target=run_init, daemon=True).start()
    return {"status": "started", "message": "Inicialização do banco em background."}

# Rotas de fallback para evitar 404 durante o carregamento
@app.get("/dashboard", response_class=HTMLResponse)
@app.get("/empresas", response_class=HTMLResponse)
@app.get("/contatos", response_class=HTMLResponse)
@app.get("/prospeccao", response_class=HTMLResponse)
async def loading_fallback(request: Request):
    if not is_fully_loaded:
        return HTMLResponse("<h1>Carregando...</h1><p>Módulos em inicialização. Aguarde 10 segundos.</p>")
    path = request.url.path.strip("/")
    return templates.TemplateResponse(f"{path if path else 'dashboard'}.html", {"request": request})

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
