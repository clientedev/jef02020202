# 🚀 Deploy no Railway - Núcleo 1.03

Este guia explica como fazer o deploy da aplicação Núcleo 1.03 no Railway com PostgreSQL e migrações automáticas.

## 📋 Pré-requisitos

- Conta no [Railway](https://railway.app/)
- Código do projeto em um repositório Git (GitHub, GitLab, etc.)

## 🔧 Configuração do Projeto no Railway

### 1. Criar Novo Projeto

1. Acesse o [Railway Dashboard](https://railway.app/dashboard)
2. Clique em **"New Project"**
3. Selecione **"Deploy from GitHub repo"**
4. Escolha o repositório do Núcleo 1.03
5. Railway detectará automaticamente que é um projeto Python

### 2. Adicionar Banco de Dados PostgreSQL

1. No seu projeto Railway, clique em **"+ New"**
2. Selecione **"Database"** → **"PostgreSQL"**
3. O Railway criará automaticamente:
   - Um banco de dados PostgreSQL
   - A variável de ambiente `DATABASE_URL` conectada ao seu serviço FastAPI

### 3. Configuração Automática

O projeto já está configurado com:

- ✅ **`railway.toml`** - Configuração de build e deploy
- ✅ **`Procfile`** - Comando de inicialização alternativo
- ✅ **`start.sh`** - Script que executa migrações antes de iniciar o servidor
- ✅ **`requirements.txt`** - Dependências Python incluindo Alembic
- ✅ **Migrações Alembic** - Sistema de versionamento do banco

### 4. Variáveis de Ambiente (Opcional)

As seguintes variáveis são opcionais e têm valores padrão:

| Variável | Descrição | Valor Padrão |
|----------|-----------|--------------|
| `ADMIN_EMAIL` | Email do administrador | `admin@admin.com` |
| `ADMIN_PASSWORD` | Senha do administrador | `admin123` |
| `ADMIN_NAME` | Nome do administrador | `Administrador` |
| `PORT` | Porta do servidor | `5000` (Railway define automaticamente) |

Para adicionar/modificar variáveis:
1. Clique no serviço FastAPI
2. Vá em **"Variables"**
3. Adicione as variáveis desejadas

## 🎯 Como Funciona o Deploy

Quando você faz deploy no Railway, o seguinte acontece automaticamente:

1. **Build**: Railway instala as dependências do `requirements.txt`
2. **Migrações**: O script `start.sh` executa `alembic upgrade head`
   - Cria todas as tabelas no banco de dados
   - Aplica quaisquer mudanças futuras no schema
3. **Seed**: Ao iniciar, a aplicação cria:
   - Usuário admin padrão
   - Consultores de teste
   - Empresas de exemplo
   - Estágios do pipeline
4. **Servidor**: Uvicorn inicia o FastAPI na porta fornecida pelo Railway

## 🔄 Migrações Automáticas

### Como Funcionam

O sistema usa Alembic para gerenciar o schema do banco de dados:

- **Primeira vez**: Cria todas as tabelas baseadas nos modelos SQLAlchemy
- **Atualizações**: Detecta mudanças nos modelos e aplica automaticamente

### Otimização PostgreSQL

A migração inicial (`bf387194a72b`) foi otimizada especificamente para PostgreSQL:

1. **Criação explícita de tipos Enum** usando `CREATE TYPE`:
   - `tipousuario` (admin, consultor)
   - `statusprojeto` (planejado, em_andamento, concluido, cancelado, pausado)
   - `tiponotificacao` (PROSPECCAO_CRIADA, AGENDAMENTO_CRIADO, etc.)
   - `statusagendamento` (pendente, realizado, vencido)
   - `statusatividade` (pendente, em_andamento, concluida, cancelada)

2. **Uso de `create_type=False`** em todas as colunas Enum para evitar duplicação

3. **Downgrade seguro** com `DROP TYPE IF EXISTS` para reverter migrações sem erros

### Criar Nova Migração (Localmente)

Se você modificar os modelos do banco, crie uma nova migração:

```bash
# Configure DATABASE_URL local
export DATABASE_URL="postgresql://user:password@localhost/dbname"

# Gere a migração automaticamente
alembic revision --autogenerate -m "Descrição da mudança"

# Aplique localmente para testar
alembic upgrade head

# Commit e push para o Railway
git add alembic/versions/*.py
git commit -m "Add database migration"
git push
```

O Railway aplicará automaticamente a migração no próximo deploy.

### Comandos Úteis

```bash
# Ver histórico de migrações
alembic history

# Ver migração atual
alembic current

# Reverter última migração
alembic downgrade -1

# Aplicar todas as migrações
alembic upgrade head
```

## 🌐 Acessar a Aplicação

Após o deploy bem-sucedido:

1. Railway fornecerá uma URL pública (ex: `https://seu-app.up.railway.app`)
2. Acesse a URL para ver a aplicação rodando
3. Faça login com as credenciais do admin:
   - Email: `admin@admin.com` (ou o que você configurou)
   - Senha: `admin123` (ou o que você configurou)

## 📊 Monitoramento

No Railway Dashboard você pode:

- **Ver Logs**: Clique no serviço → "Deployments" → Ver logs em tempo real
- **Métricas**: CPU, memória, requisições
- **Banco de Dados**: Conectar via cliente PostgreSQL usando as credenciais fornecidas

## 🔒 Segurança

### Recomendações para Produção:

1. **Mudar senhas padrão**: Configure `ADMIN_PASSWORD` com senha forte
2. **HTTPS**: Railway fornece HTTPS automaticamente
3. **Backups**: Configure backups automáticos no PostgreSQL do Railway
4. **Secrets**: Nunca commite senhas ou chaves no código

## 🐛 Troubleshooting

### Erro: "Migrações falharam"
```bash
# Ver logs detalhados
railway logs

# Conectar ao banco e verificar tabelas
railway run alembic current
```

### Erro: "Não conecta ao banco"
- Verifique se o serviço PostgreSQL está rodando
- Confirme que `DATABASE_URL` está configurada automaticamente

### Erro: "Importação de modelos falhou"
- Verifique se todos os modelos estão importados em `alembic/env.py`
- Confirme que não há erros de sintaxe nos modelos

## 📚 Recursos Adicionais

- [Documentação Railway](https://docs.railway.app/)
- [Documentação Alembic](https://alembic.sqlalchemy.org/)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)

## 🆘 Suporte

Se encontrar problemas:
1. Verifique os logs no Railway Dashboard
2. Consulte a documentação do Railway
3. Revise os arquivos de configuração (`railway.toml`, `start.sh`)

---

**Última atualização**: Novembro 2025
