# 🔒 Resumo das Melhorias de Segurança Implementadas

## 📅 Data: $(date)

---

## ✅ Correções Urgentes Implementadas

### 1. Validação de Webhook PagSeguro

**Arquivo:** `src/lib/webhook-validator.ts` (NOVO)

Implementações:
- ✅ Validação de assinatura HMAC para webhooks
- ✅ Sanitização de dados sensíveis nos logs
- ✅ Verificação de payload obrigatório
- ✅ Proteção contra timing attacks

**Arquivo:** `src/app/api/webhooks/pagseguro/route.ts`

Melhorias:
- ✅ Validação de schema com Zod
- ✅ Processamento em transação atômica
- ✅ Prevenção de dupla confirmação
- ✅ Rate limiting específico para webhooks
- ✅ Logging auditável

---

### 2. Rate Limiting

**Arquivo:** `src/lib/rate-limit.ts` (NOVO)

Implementações:
- ✅ Rate limiting em memória (com suporte a Redis futuro)
- ✅ Limites por tipo de operação:
  - Auth: 5 req/min
  - Pagamentos: 10 req/min
  - API geral: 100 req/min
  - Webhooks: 1000 req/min
  - Confirmações: 20 req/min
- ✅ Headers informativos (X-RateLimit-*)
- ✅ Middleware reutilizável `withRateLimit`

---

### 3. Validação Zod em Todas as Rotas

**Arquivo:** `src/lib/schemas.ts` (NOVO)

Schemas criados:
- ✅ `createUserSchema` / `updateUserSchema`
- ✅ `createGameSchema` / `updateGameSchema`
- ✅ `createPaymentSchema` / `createPixPaymentSchema` / `createCardPaymentSchema`
- ✅ `createTransactionSchema`
- ✅ `createVenueSchema`
- ✅ `confirmGameSchema`
- ✅ `updateSettingsSchema`
- ✅ Schemas de query params
- ✅ `pagseguroWebhookSchema`

**Rotas atualizadas:**
- ✅ `/api/payments/route.ts`
- ✅ `/api/payments/pix/route.ts`
- ✅ `/api/games/route.ts`
- ✅ `/api/games/[id]/confirm/route.ts`
- ✅ `/api/transactions/route.ts`
- ✅ `/api/users/route.ts`
- ✅ `/api/users/[id]/route.ts`
- ✅ `/api/venues/route.ts`

---

### 4. Correção de Race Conditions

**Implementações:**

#### `/api/games/[id]/confirm/route.ts`
- ✅ Contagem de confirmados dentro da transação
- ✅ Isolation level `Serializable`
- ✅ Lock pessimista durante verificação de vagas

#### `/api/webhooks/pagseguro/route.ts`
- ✅ Verificação dupla de status antes de atualizar
- ✅ Transação atômica para atualização + notificação

#### `/api/games/route.ts`
- ✅ Criação de jogos recorrentes em transação
- ✅ Verificação de colisão com range de datas

#### `/api/transactions/route.ts`
- ✅ Criação em transação isolada

---

### 5. Expiração Automática de PIX

**Arquivo:** `src/app/api/cron/expire-pix/route.ts` (NOVO)

Funcionalidades:
- ✅ Job para expirar PIX pendentes após 24h
- ✅ Verificação de status no PagSeguro antes de expirar
- ✅ Notificação ao usuário quando PIX expira
- ✅ Movimentação para lista de espera se pagamento cancelado
- ✅ Proteção por CRON_SECRET

**Como usar:**
```bash
# Chamada manual
curl "https://seu-dominio.com/api/cron/expire-pix?key=SUA_CRON_SECRET"

# Ou configure no Vercel Cron (vercel.json):
{
  "crons": [
    {
      "path": "/api/cron/expire-pix?key=SUA_CRON_SECRET",
      "schedule": "0 * * * *"
    }
  ]
}
```

---

### 6. Atualizações no Sistema de Autenticação

**Arquivo:** `src/lib/auth.ts`

Melhorias:
- ✅ Lista de admin emails via variável de ambiente `ADMIN_EMAILS`
- ✅ Validação de domínio de email (opcional)
- ✅ Verificação de usuário ativo na sessão
- ✅ Cookies seguros em produção
- ✅ Sessão com maxAge configurado (30 dias)

---

### 7. Correções de Timezone

**Arquivo:** `src/app/api/games/route.ts`

- ✅ Criação de datas usando `Date.UTC()` para evitar problemas de timezone
- ✅ Uso de `addDays` do date-fns para cálculos de data

---

## 🛠️ Scripts de Segurança Criados

### `scripts/rotate-secrets.sh`
Script para auxiliar na rotação de credenciais:
- Gera novos secrets (NEXTAUTH_SECRET, CRON_SECRET)
- Atualiza .env
- Configura .gitignore
- Configura pre-commit hook

**Uso:**
```bash
./scripts/rotate-secrets.sh
```

### `scripts/security-check.sh`
Script de verificação de segurança:
- Verifica se .env está no git
- Verifica credenciais hardcoded
- Verifica pre-commit hook
- Verifica variáveis de ambiente
- Verifica vulnerabilidades em dependências
- Verifica permissões de arquivos

**Uso:**
```bash
./scripts/security-check.sh
```

---

## 📚 Documentação Criada

### `SECURITY_FIX.md`
Guia completo de rotação de credenciais:
- Instruções passo a passo
- Comandos para limpar histórico do git
- Como rotacionar cada tipo de credencial
- Configuração de proteções futuras

### `.env.example` (Atualizado)
- Adicionadas novas variáveis de segurança
- Documentação inline
- Instruções de geração de secrets

---

## ⚠️ Ações Pendentes (Requerem Ação Manual)

### 1. Rotacionar Credenciais Expostas

Você DEVE rotacionar manualmente:

- [ ] **Google OAuth**: https://console.cloud.google.com/apis/credentials
- [ ] **PagSeguro Token**: https://dev.pagseguro.uol.com.br/
- [ ] **N8N API Key**: Seu painel N8N

Execute o script helper:
```bash
./scripts/rotate-secrets.sh
```

### 2. Configurar Variáveis de Ambiente

Adicione ao seu `.env`:

```bash
# Novas variáveis necessárias
ADMIN_EMAILS="seu-email@dominio.com"
CRON_SECRET="$(openssl rand -base64 32)"

# Opcional mas recomendado
PAGSEGURO_WEBHOOK_SECRET="$(openssl rand -base64 32)"
ALLOWED_EMAIL_DOMAINS="gmail.com"  # Se quiser restringir
```

### 3. Configurar Cron Job

Configure o job de expiração de PIX para rodar periodicamente:

**Opção A - Vercel Cron:**
Crie/adicione em `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/expire-pix?key=SUA_CRON_SECRET",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/process-waiting-list?key=SUA_CRON_SECRET",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

**Opção B - Cron tradicional:**
```bash
0 * * * * curl "https://seu-dominio.com/api/cron/expire-pix?key=SUA_CRON_SECRET"
```

### 4. Verificar Funcionamento

Após aplicar as mudanças, teste:

```bash
# 1. Build
npm run build

# 2. Teste de segurança
./scripts/security-check.sh

# 3. Teste de funcionalidade
npm run dev
```

Testes manuais:
- [ ] Login com Google funciona
- [ ] Criar pelada como admin funciona
- [ ] Confirmar presença funciona
- [ ] Gerar PIX funciona
- [ ] Webhook de confirmação de pagamento funciona
- [ ] Cron job de expiração funciona

---

## 📊 Antes vs Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Validação de Input** | Nenhuma | Zod em todas as rotas |
| **Rate Limiting** | Não existia | Implementado |
| **Race Conditions** | Vulnerável | Transações atômicas |
| **Webhook Security** | Sem validação | Validação de assinatura |
| **PIX Expiration** | Manual | Automático via cron |
| **Admin Hardcoded** | Email fixo | Via env var |
| **Env File** | Exposto | Scripts de proteção |

---

## 🔐 Próximos Passos Recomendados

### Média Prioridade:
1. Implementar Redis para rate limiting distribuído
2. Adicionar testes automatizados de segurança
3. Implementar logging estruturado (Pino/Winston)
4. Configurar monitoramento de segurança (Sentry)

### Baixa Prioridade:
1. Implementar 2FA para admins
2. Adicionar captcha em formulários públicos
3. Configurar WAF (Cloudflare/AWS WAF)
4. Implementar backup criptografado do banco

---

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs: `npm run dev` ou `docker logs`
2. Execute: `./scripts/security-check.sh`
3. Verifique: `cat SECURITY_FIX.md`
4. Verifique variáveis: `cat .env | grep -v "^#" | grep -v "^$"`

---

**Status:** ✅ Todas as correções urgentes e de alta prioridade implementadas!
