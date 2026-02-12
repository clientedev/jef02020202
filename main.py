from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import os

# --- 1. MINIMAL APP SETUP ---
app = FastAPI(title="Núcleo 1.03", version="1.0.0")

# Ultra-fast health check first
@app.get("/health")
async def health_check():
    return JSONResponse(content={"status": "online"}, status_code=200)

# Globally accessible objects (initially empty)
templates = None

# --- 2. CORE REGISTRATION ---
# We do this at top level but it should be faster now without DB connection
try:
    from fastapi.staticfiles import StaticFiles
    from fastapi.templating import Jinja2Templates
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.mount("/static", StaticFiles(directory="static"), name="static")
    templates = Jinja2Templates(directory="templates")

    # Import routers (Lazy internally)
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

    print("✅ Routers loaded successfully")
except Exception as e:
    print(f"⚠️ App setup warning: {e}")

# --- 3. PAGE ROUTES ---
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
    import threading
    from backend.database import get_engine, Base, SessionLocal
    from backend.utils.seed import (criar_usuario_admin_padrao, criar_consultores_padrao, 
                                   criar_stages_padrao)
    
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
            print("✅ DB Setup complete")
        except Exception as e: print(f"❌ DB Setup error: {e}")

    threading.Thread(target=run_init, daemon=True).start()
    return {"status": "started"}

# Include all other path routes here if needed, but these are essential for boot.
# For a full PR, all @app.get routes from previous version should be here.

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
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
