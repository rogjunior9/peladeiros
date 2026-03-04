# 🚀 Guia Completo: Deploy no Easypanel

Centralizar PostgreSQL + App + N8N no mesmo servidor

---

## 📋 Estrutura no Easypanel

```
Serviços:
├── postgres-peladeiros (novo banco dedicado)
├── peladeiros (app Next.js)
└── n8n-peladeiros (automações)
```

---

## 1️⃣ CRIAR NOVO POSTGRESQL DEDICADO

### No Painel Easypanel:

1. **Clique em "+ Serviço"**
2. Escolha **"PostgreSQL"**
3. Configure:
   ```
   Nome: postgres-peladeiros
   Versão: 15 ou 16
   Database: peladeiros
   Usuário: peladeiros
   Senha: (gerar uma forte)
   Porta: 5432 (ou deixar padrão)
   ```
4. **Importante**: Marque **"External Access"** ou **"Exposed"**
5. Clique em **"Criar"**

### Aguarde o serviço iniciar (30 segundos)

---

## 2️⃣ OBTER CREDENCIAIS

Após criar, clique no serviço `postgres-peladeiros`:

Copie a **URL de Conexão Interna**:
```
postgresql://peladeiros:SENHA@postgres-peladeiros:5432/peladeiros
```

> ⚠️ Como será no mesmo servidor, usamos o nome do serviço como host

---

## 3️⃣ CONFIGURAR APP (PELO GIT)

### 3.1 Preparar Repositório

Seu código já está no Git. Certifique-se que o `.env` NÃO está commitado:

```bash
# Verifique
git ls-files | grep "\.env"
# Deve retornar vazio
```

### 3.2 Criar Serviço no Easypanel

1. **Clique em "+ Serviço"**
2. Escolha **"Git"**
3. Configure:
   ```
   Nome: peladeiros
   Repositório: (URL do seu repo)
   Branch: main (ou sua branch)
   ```
4. **Build Type**: Dockerfile
5. **Porta**: 3000

### 3.3 Variáveis de Ambiente

Adicione no Easypanel (Environment Variables):

```env
# Database (conexão INTERNA - mais rápida!)
DATABASE_URL="postgresql://peladeiros:SENHA@postgres-peladeiros:5432/peladeiros"

# Auth
NEXTAUTH_URL="https://peladeiros.seu-dominio.com.br"
NEXTAUTH_SECRET="(gerar com: openssl rand -base64 32)"

# Google OAuth
GOOGLE_CLIENT_ID="seu-client-id"
GOOGLE_CLIENT_SECRET="seu-client-secret"

# PagSeguro
PAGSEGURO_EMAIL="contato@rogeriojunior.com.br"
PAGSEGURO_TOKEN="seu-token"
PAGSEGURO_SANDBOX="false"
PAGSEGURO_NOTIFICATION_URL="https://peladeiros.seu-dominio.com.br/api/webhooks/pagseguro"

# Admin
ADMIN_EMAILS="seu-email@gmail.com"

# Cron
CRON_SECRET="(gerar com: openssl rand -base64 32)"

# N8N
N8N_WEBHOOK_URL="https://n8n-peladeiros.seu-dominio.com.br"
N8N_API_KEY="sua-api-key-n8n"
```

### 3.4 Deploy

Clique em **"Deploy"** e aguarde o build

---

## 4️⃣ CONFIGURAR N8N

### 4.1 Criar Serviço N8N

1. **Clique em "+ Serviço"**
2. Escolha **"Docker Image"**
3. Configure:
   ```
   Nome: n8n-peladeiros
   Imagem: n8nio/n8n:latest
   Porta: 5678
   ```

### 4.2 Variáveis de Ambiente do N8N

```env
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=(senha forte)
WEBHOOK_URL="https://n8n-peladeiros.seu-dominio.com.br"
```

### 4.3 Configurar Webhook no App

No N8N, configure o workflow para chamar:
```
https://peladeiros.seu-dominio.com.br/api/n8n/trigger
```

---

## 5️⃣ CONFIGURAR CRON JOBS

No Easypanel, adicione um serviço tipo **"Cron Job"**:

### Job 1: Expirar PIX
```
Nome: cron-expire-pix
Schedule: 0 * * * * (toda hora)
Comando: curl "https://peladeiros.seu-dominio.com.br/api/cron/expire-pix?key=SUA_CRON_SECRET"
```

### Job 2: Processar Lista de Espera
```
Nome: cron-waiting-list
Schedule: */30 * * * * (a cada 30 min)
Comando: curl "https://peladeiros.seu-dominio.com.br/api/cron/process-waiting-list?key=SUA_CRON_SECRET"
```

---

## 6️⃣ CONFIGURAR DOMÍNIOS

Para cada serviço, configure o domínio:

| Serviço | Domínio Sugerido |
|---------|------------------|
| App | peladeiros.seu-dominio.com.br |
| N8N | n8n-peladeiros.seu-dominio.com.br |

No Easypanel:
1. Clique no serviço
2. Vá em "Domains"
3. Adicione o domínio
4. Configure o DNS apontando para o servidor

---

## 7️⃣ INICIALIZAR BANCO

Após o primeiro deploy, execute no terminal do serviço `peladeiros`:

```bash
npx prisma db push
```

Ou adicione ao Dockerfile:
```dockerfile
RUN npx prisma db push || true
```

---

## ✅ CHECKLIST FINAL

- [ ] PostgreSQL criado com External Access
- [ ] App deployado via Git
- [ ] Variáveis de ambiente configuradas
- [ ] N8N criado e configurado
- [ ] Cron jobs adicionados
- [ ] Domínios configurados
- [ ] SSL/HTTPS ativo
- [ ] Teste de login funcionando

---

## 🔧 ARQUIVOS DE APOIO

Veja na pasta `easypanel/`:
- `docker-compose.yml` - Configuração completa
- `deploy-checklist.sh` - Script de verificação

---

## 🆘 SUPORTE

Problemas comuns:

### "Can't reach database"
- Verifique se o PostgreSQL está com "External Access" ativo
- Confirme se o hostname no DATABASE_URL está correto

### "Build falhou"
- Verifique se o `npm run build` funciona localmente
- Confirme que o `node_modules` não está no git

### "Erro de permissão"
- Verifique se o CRON_SECRET está correto nas variáveis
