# Núcleo 1.03 - Railway Deploy

## 🚀 Deploy Rápido

1. **Fork/Clone** este repositório
2. No [Railway](https://railway.app/):
   - Crie novo projeto → Deploy from GitHub
   - Adicione PostgreSQL ao projeto
   - Deploy automático! ✨

## 📝 Credenciais Padrão

- **Email**: admin@admin.com
- **Senha**: admin123

⚠️ **Importante**: Altere a senha em produção via variável `ADMIN_PASSWORD`

## 🔧 Como Funciona

```bash
# No Railway, ao fazer deploy:
alembic upgrade head  # ← Cria/atualiza tabelas automaticamente
uvicorn main:app      # ← Inicia servidor
```

## 📚 Documentação Completa

Veja [RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md) para guia detalhado.

## 🛠️ Tecnologias

- **FastAPI** - Framework web
- **SQLAlchemy** - ORM
- **Alembic** - Migrações de banco
- **PostgreSQL** - Banco de dados
- **Railway** - Hosting
