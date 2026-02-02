# Deploy no Railway - Núcleo 1.03

## 🚀 Guia Completo de Deploy

### 1. Pré-requisitos
- Conta no Railway (https://railway.app)
- Repositório Git com o código do projeto

### 2. Configuração do Banco de Dados

1. No Railway, clique em **"New Project"**
2. Adicione um serviço **PostgreSQL**
3. Aguarde o provisionamento do banco de dados
4. A variável `DATABASE_URL` será criada automaticamente

### 3. Deploy da Aplicação

1. No mesmo projeto, adicione um novo serviço **"Deploy from GitHub"**
2. Selecione o repositório do projeto
3. O Railway detectará automaticamente o `railway.toml`

### 4. Variáveis de Ambiente Necessárias

O Railway já configura automaticamente:
- ✅ `DATABASE_URL` - URL de conexão com o PostgreSQL
- ✅ `PORT` - Porta em que o servidor deve escutar

**Variável opcional (recomendada para produção):**
- 🔐 `SESSION_SECRET` - Chave para assinar tokens JWT

> **Nota:** Se `SESSION_SECRET` não estiver configurada, uma chave temporária será gerada automaticamente. Para produção, é recomendado configurar esta variável com um valor fixo para evitar logout de usuários após restarts.

### 5. Verificação do Deploy

Após o deploy:
1. Aguarde a aplicação iniciar (pode levar 1-2 minutos na primeira vez)
2. As migrações do banco serão executadas automaticamente
3. O servidor iniciará na porta fornecida pelo Railway
4. Acesse a URL fornecida pelo Railway

### 6. Logs e Debugging

Para verificar logs no Railway:
1. Clique no serviço da aplicação
2. Vá para a aba **"Deployments"**
3. Clique no deployment ativo
4. Veja os logs em tempo real

### 7. Troubleshooting - Erro 502 Bad Gateway

Se você receber erro 502, verifique:

#### ✅ Checklist:
- [ ] DATABASE_URL está configurada?
- [ ] O deploy foi concluído com sucesso?
- [ ] As migrações rodaram sem erros?
- [ ] O servidor está escutando na porta correta (variável $PORT)?

#### 🔧 Soluções Comuns:

**Problema: Migrações falhando**
- Verifique os logs do deploy
- Confirme que o DATABASE_URL está correto
- As migrações rodarão automaticamente no primeiro deploy

**Problema: Timeout no healthcheck**
- A aplicação tem 300 segundos para iniciar
- Verifique se não há erros no startup nos logs

**Problema: Porta incorreta**
- O Railway define a variável $PORT automaticamente
- O `start.sh` já está configurado para usar essa variável

### 8. Comandos Úteis no Railway CLI (Opcional)

```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Ver logs em tempo real
railway logs

# Executar comando no container
railway run bash
```

### 9. Usuário Admin Padrão

Após o primeiro deploy, será criado automaticamente:
- **Email**: admin@admin.com
- **Senha**: admin123

⚠️ **IMPORTANTE:** Mude a senha do admin após o primeiro acesso por segurança!

### 10. Estrutura de Arquivos Importantes

```
.
├── railway.toml          # Configuração do Railway
├── Procfile             # Comando de inicialização
├── start.sh             # Script de inicialização
├── requirements.txt     # Dependências Python
├── alembic/            # Migrações do banco
└── main.py             # Aplicação FastAPI
```

## 🆘 Suporte

Se o erro 502 persistir após seguir todos os passos:

1. Verifique os logs no Railway
2. Confirme que o DATABASE_URL está presente nas variáveis de ambiente
3. Verifique se o deployment foi concluído (não está em estado de "building")
4. Aguarde alguns minutos - o primeiro deploy pode ser mais lento

## 📝 Notas Importantes

- O Railway faz deploy automático a cada push no branch principal
- As migrações são executadas automaticamente antes de iniciar o servidor
- O healthcheck está configurado para verificar a rota `/`
- O timeout do healthcheck é de 300 segundos (5 minutos)
