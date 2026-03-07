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
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ADMIN_EMAILS`
- `N8N_WEBHOOK_URL`
- `N8N_API_KEY`
- `N8N_WORKFLOW_ID`
- `CRON_SECRET`

## Rodar local
```bash
npm install
npm run db:generate
npm run db:push
npm run dev
```

## Banco de dados
- Este projeto usa somente Supabase.
- Local e produção devem usar o mesmo `DATABASE_URL` (Supabase).

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
