# 🚀 QUICK START - Testar o Peladeiros

## Opção 1: Usar Neon (Recomendado - 2 minutos)

```bash
# 1. Acesse https://neon.tech e crie conta
# 2. Crie projeto "peladeiros"
# 3. Copie a Connection String
# 4. Cole aqui substituindo XXX:

echo 'DATABASE_URL="postgresql://usuario:senha@host.neon.tech/peladeiros?sslmode=require"' > .env.local

# 5. Execute:
npx prisma db push
npm run dev
```

## Opção 2: PostgreSQL Local/Docker

```bash
# Se tiver Docker:
docker-compose up -d db

# Ou configure seu PostgreSQL:
echo 'DATABASE_URL="postgresql://postgres:senha@localhost:5432/peladeiros"' > .env.local

npx prisma db push
npm run dev
```

## Opção 3: Testar sem banco (Interface apenas)

```bash
npm run dev
# Vai mostrar erros de DB mas a interface carrega
```

## Acessos

- App: http://localhost:3000
- Login: http://localhost:3000/login
- Prisma Studio: npx prisma studio

## Testes de Segurança

```bash
./scripts/security-check.sh
```

