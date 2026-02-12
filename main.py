from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os

# --- 1. CORE APP & HEALTH CHECK (Must be at the top) ---
app = FastAPI(title="Núcleo 1.03", version="1.0.0")

@app.get("/health")
async def health_check():
    """Essential for Railway - Prevents 503 errors"""
    return JSONResponse(content={"status": "online"}, status_code=200)

# --- 2. STANDARD INITIALIZATION ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static first
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="templates") if os.path.exists("templates") else None

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
    app.include_router(r)

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
