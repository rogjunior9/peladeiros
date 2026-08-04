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

### Banco de dados Supabase
- Em VPS/EasyPanel, prefira a connection string do **Session pooler** do Supabase.
- A URL direta `db.<project-ref>.supabase.co` costuma depender de IPv6. Se o host não tiver IPv6 funcional, o app sobe mas o login quebra ao salvar usuário/sessão no NextAuth.
- Copie a string em `Supabase Dashboard > Connect > Session pooler`.

```
DATABASE_URL=postgresql://postgres.<project-ref>:SUA_SENHA@aws-0-REGIAO.pooler.supabase.com:5432/postgres?sslmode=require
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
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

Opcional se usar APIs administrativas do Supabase fora do Prisma:

```
SUPABASE_SERVICE_ROLE_KEY=...
```

Não use `SUPABASE_SERVICE_ROLE_KEY` em variável `NEXT_PUBLIC_*`, porque ela fica exposta ao navegador.

## 4. Primeiro start
1. Deploy
2. Verifique logs
3. App executa `prisma db push` no start para sincronizar schema
4. Se o Prisma não conectar no banco, o container deve falhar no boot. Corrija a `DATABASE_URL` antes de tentar logar.

## 5. Troubleshooting
- Erro de banco: confira `DATABASE_URL` com `?sslmode=require` e prefira o `Session pooler` no EasyPanel
- Erros comuns de log quando a conexão está errada: `P1001`, `Can't reach database server`, `PrismaClientInitializationError`
- Erro OAuth: confira callback URL no Google
- Erro n8n: confira URL/API key/workflow id
