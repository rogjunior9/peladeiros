# Deploy no EasyPanel (Front + Supabase + n8n)

## 1. Google OAuth
1. Acesse https://console.cloud.google.com
2. Crie o OAuth Client Web
3. Callback autorizada:
   - `https://SEU_DOMINIO/api/auth/callback/google`

## 2. EasyPanel
1. Crie um serviço **App** com o repositório `rogjunior9/peladeiros`
2. Use `Dockerfile` como build
3. Configure domínio e SSL

## 3. Variáveis de ambiente (um único `.env` equivalente no painel)

```
DATABASE_URL=postgresql://postgres:SUA_SENHA@db.<project-ref>.supabase.co:5432/postgres?sslmode=require
NEXTAUTH_URL=https://SEU_DOMINIO
NEXTAUTH_SECRET=gere-com-openssl-rand-base64-32
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ADMIN_EMAILS=...
N8N_WEBHOOK_URL=https://SEU_N8N
N8N_API_KEY=...
N8N_WORKFLOW_ID=...
CRON_SECRET=gere-com-openssl-rand-base64-32
```

Opcional se usar APIs do Supabase fora do Prisma:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

## 4. Primeiro start
1. Deploy
2. Verifique logs
3. App executa `prisma db push` no start para sincronizar schema

## 5. Troubleshooting
- Erro de banco: confira `DATABASE_URL` com `?sslmode=require`
- Erro OAuth: confira callback URL no Google
- Erro n8n: confira URL/API key/workflow id
