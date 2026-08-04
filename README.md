# Peladeiros

Sistema para gestão de peladas com autenticação Google, controle de jogos, confirmações, pagamentos e financeiro.

## Stack
- Next.js 14 (App Router)
- TypeScript
- Prisma + Supabase (PostgreSQL)
- NextAuth
- n8n

## Requisitos
- Node.js 18+
- Projeto Supabase ativo
- Credenciais Google OAuth
- URL/API Key do n8n

## Configuração
Preencha um único arquivo `.env` com:
- `DATABASE_URL` do Supabase (preferencialmente a URL do `Session pooler` em ambientes como EasyPanel/VPS)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ou `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ADMIN_EMAILS`
- `N8N_WEBHOOK_URL`
- `N8N_API_KEY`
- `N8N_WORKFLOW_ID`
- `CRON_SECRET`

Nunca use `SUPABASE_SERVICE_ROLE_KEY` em variável `NEXT_PUBLIC_*`, porque ela fica exposta ao navegador.

## Rodar local
```bash
npm install
npm run db:generate
npm run db:push
npm run dev
```

## Banco de dados
- Este projeto usa somente Supabase.
- Em produção com EasyPanel/VPS, prefira a string do `Session pooler` do Supabase.
- A URL direta `db.<project-ref>.supabase.co` pode falhar em hosts sem IPv6 e quebrar o login do NextAuth.

## Scripts
```bash
npm run dev
npm run build
npm run start
npm run lint
npm run db:generate
npm run db:push
npm run db:migrate
npm run db:studio
```

## Deploy
- `Dockerfile` está configurado para deploy containerizado.
- Consulte `DEPLOY.md` para um passo a passo de publicação.

## Segurança
- Não versionar segredos em JSON, scripts, docs ou commits.
- Use `.env` apenas localmente.
