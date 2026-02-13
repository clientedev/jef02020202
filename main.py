from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, HTMLResponse
import os
import threading

# --- 1. HYPERSONIC BOOT (Ready in Miliseconds) ---
app = FastAPI(title="Núcleo 1.03", version="1.0.0")

# Global state
templates = None
is_loaded = False
boot_error = None

@app.get("/health")
async def health_check():
    """Essential for Railway - Respond instantly while the rest loads"""
    return JSONResponse(
        content={
            "status": "online", 
            "ready": is_loaded,
            "error": boot_error
        }, 
        status_code=200
    )

# --- 2. DEFERRED FULL BOOT ---
def deferred_boot(app_instance):
    global templates, is_loaded, boot_error
    print("🚀 [BOOT] Iniciando carga pesada em segundo plano...")
    try:
        from fastapi.middleware.cors import CORSMiddleware
        from fastapi.staticfiles import StaticFiles
        from fastapi.templating import Jinja2Templates
        
        # 2a. Middleware
        app_instance.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        # 2b. Assets
        if os.path.exists("static"):
            app_instance.mount("/static", StaticFiles(directory="static"), name="static")
        if os.path.exists("templates"):
            templates = Jinja2Templates(directory="templates")

        # 2c. Routers (This is what usually blocks)
        from backend.routers import (auth, empresas, prospeccoes, agendamentos, admin, 
                                    atribuicoes, consultores, dashboard, cnpj, 
                                    notificacoes, mensagens, cronograma, pipeline, 
                                    programs, contatos, feriados)
        from backend.routers.formularios import router as forms_router, router_public as forms_pub_router
        
        routers = [
            auth.router, admin.router, empresas.router, prospeccoes.router, 
            agendamentos.router, atribuicoes.router, consultores.router, 
            dashboard.router, cnpj.router, notificacoes.router, mensagens.router, 
            cronograma.router, pipeline.router, programs.router, contatos.router, 
            forms_router, forms_pub_router, feriados.router
        ]
        
        for r in routers:
            app_instance.include_router(r)

        is_loaded = True
        print("✅ [BOOT] Sistema totalmente funcional!")
        
    except Exception as e:
        boot_error = str(e)
        print(f"❌ [BOOT] Falha na carga background: {e}")

# Trigger boot in thread immediately
threading.Thread(target=deferred_boot, args=(app,), daemon=True).start()

# --- 3. PAGE ROUTES WITH LOADING CHECK ---
@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    if not is_loaded:
        return HTMLResponse("<h1>Carregando...</h1><p>O sistema está iniciando os módulos internos. Aguarde alguns segundos e atualize.</p>")
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard_page(request: Request):
    if not is_loaded: return HTMLResponse("Carregando...")
    return templates.TemplateResponse("dashboard.html", {"request": request})

@app.get("/empresas", response_class=HTMLResponse)
async def empresas_page(request: Request):
    if not is_loaded: return HTMLResponse("Carregando...")
    return templates.TemplateResponse("empresas.html", {"request": request})

@app.get("/contatos", response_class=HTMLResponse)
async def contatos_page(request: Request):
    if not is_loaded: return HTMLResponse("Carregando...")
    return templates.TemplateResponse("contatos.html", {"request": request})

@app.get("/empresa/{empresa_id}", response_class=HTMLResponse)
async def empresa_perfil(request: Request, empresa_id: int):
    if not is_loaded: return HTMLResponse("Carregando...")
    return templates.TemplateResponse("empresa_perfil.html", {"request": request, "empresa_id": empresa_id})

# Include all other path routes here if needed for full app functionality
@app.get("/prospeccao", response_class=HTMLResponse)
async def prospeccao_page(request: Request):
    if not is_loaded: return HTMLResponse("Carregando...")
    return templates.TemplateResponse("prospeccao_nova.html", {"request": request})

@app.get("/alertas", response_class=HTMLResponse)
async def alertas_page(request: Request):
    if not is_loaded: return HTMLResponse("Carregando...")
    return templates.TemplateResponse("alertas.html", {"request": request})

@app.get("/admin/usuarios", response_class=HTMLResponse)
async def admin_usuarios_page(request: Request):
    if not is_loaded: return HTMLResponse("Carregando...")
    return templates.TemplateResponse("admin_usuarios.html", {"request": request})

@app.get("/admin/atribuicoes", response_class=HTMLResponse)
async def admin_atribuicoes_page(request: Request):
    if not is_loaded: return HTMLResponse("Carregando...")
    return templates.TemplateResponse("admin_atribuicoes.html", {"request": request})

@app.get("/consultores", response_class=HTMLResponse)
async def consultores_page(request: Request):
    if not is_loaded: return HTMLResponse("Carregando...")
    return templates.TemplateResponse("consultores.html", {"request": request})

@app.get("/consultor/{consultor_id}", response_class=HTMLResponse)
async def consultor_perfil_page(request: Request, consultor_id: int):
    if not is_loaded: return HTMLResponse("Carregando...")
    return templates.TemplateResponse("consultor_perfil.html", {"request": request, "consultor_id": consultor_id})

@app.get("/buscar-empresa", response_class=HTMLResponse)
async def buscar_empresa_page(request: Request):
    if not is_loaded: return HTMLResponse("Carregando...")
    return templates.TemplateResponse("buscar_empresa.html", {"request": request})

@app.get("/chat", response_class=HTMLResponse)
async def chat_page(request: Request):
    if not is_loaded: return HTMLResponse("Carregando...")
    return templates.TemplateResponse("chat.html", {"request": request})

@app.get("/cronograma", response_class=HTMLResponse)
async def cronograma_page(request: Request):
    if not is_loaded: return HTMLResponse("Carregando...")
    return templates.TemplateResponse("cronograma.html", {"request": request})

@app.get("/agenda-operacional", response_class=HTMLResponse)
async def agenda_operacional_page(request: Request):
    if not is_loaded: return HTMLResponse("Carregando...")
    return templates.TemplateResponse("agenda_operacional.html", {"request": request})

@app.get("/pipeline", response_class=HTMLResponse)
async def pipeline_page(request: Request):
    if not is_loaded: return HTMLResponse("Carregando...")
    return templates.TemplateResponse("pipeline.html", {"request": request})

@app.get("/formularios", response_class=HTMLResponse)
async def formularios_page(request: Request):
    if not is_loaded: return HTMLResponse("Carregando...")
    return templates.TemplateResponse("formularios.html", {"request": request})

@app.get("/formularios/novo", response_class=HTMLResponse)
async def novo_formulario_page(request: Request):
    if not is_loaded: return HTMLResponse("Carregando...")
    return templates.TemplateResponse("novo_formulario.html", {"request": request})

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
