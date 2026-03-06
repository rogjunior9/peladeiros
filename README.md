# Peladeiros

Sistema para gestão de peladas com autenticação Google, controle de jogos, confirmações, pagamentos e financeiro.

## Stack
- Next.js 14 (App Router)
- TypeScript
- Prisma + PostgreSQL
- NextAuth
- PagSeguro

## Requisitos
- Node.js 18+
- PostgreSQL
- Credenciais Google OAuth
- Credenciais PagSeguro

## Configuração
1. Copie `.env.example` para `.env`.
2. Preencha as variáveis obrigatórias:
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ADMIN_EMAILS`
- `PAGSEGURO_EMAIL`
- `PAGSEGURO_TOKEN`
- `PAGSEGURO_SANDBOX`
- `PAGSEGURO_NOTIFICATION_URL`
- `CRON_SECRET`

## Rodar local
```bash
npm install
npm run db:generate
npm run db:push
npm run dev
```

## Banco de dados: contingência rápida
- O projeto usa `Prisma + PostgreSQL`. Se um host Postgres cair ou ficar inacessível, a troca mais rápida e segura é para **outro Postgres gerenciado** (ex.: Supabase, Neon, Railway), sem refatorar código.
- Passos:
1. Crie um novo banco PostgreSQL no provedor.
2. Atualize `DATABASE_URL` no `.env` (ou variável de ambiente da hospedagem).
3. Rode `npm run db:push` para sincronizar o schema.
4. Valide com `npm run build` e teste os fluxos principais.

- Alternativa local imediata:
1. Suba o Postgres do projeto com `docker compose up -d db`.
2. Aponte `DATABASE_URL` para `localhost:5432`.
3. Rode `npm run db:push`.

- Sobre Firebase:
  Firebase exige mudança de ORM/acesso a dados (o Prisma não conecta direto no Firestore), então não é fallback de curto prazo para este código atual.

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
- `Dockerfile` e `docker-compose.yml` estão mantidos para deploy containerizado.
- Consulte `DEPLOY.md` para um passo a passo de publicação.

## Segurança
- Não versionar segredos em JSON, scripts, docs ou commits.
- Use `.env` apenas localmente.
