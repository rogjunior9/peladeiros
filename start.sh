#!/bin/sh

set -eu

print_database_help() {
  echo >&2 "Erro: Prisma nao conseguiu conectar ao PostgreSQL."

  if [ -z "${DATABASE_URL:-}" ]; then
    echo >&2 "DATABASE_URL nao esta definida no ambiente."
    return
  fi

  case "$DATABASE_URL" in
    *@db.*.supabase.co:5432/*)
      echo >&2 "A DATABASE_URL atual usa o host direto do Supabase (db.<project-ref>.supabase.co:5432)."
      echo >&2 "Esse endpoint costuma falhar em EasyPanel/VPS sem IPv6."
      echo >&2 "Use a string do Session pooler em Supabase Dashboard > Connect."
      echo >&2 "Formato esperado: postgresql://postgres.<project-ref>:SENHA@aws-0-REGIAO.pooler.supabase.com:5432/postgres"
      ;;
    *)
      echo >&2 "Confira DATABASE_URL, acesso de rede e credenciais do banco."
      ;;
  esac
}

echo "Aguardando banco de dados..."
sleep 5

echo "Executando sincronizacao do Prisma..."
if ! DATABASE_URL="${DIRECT_URL:-$DATABASE_URL}" npx prisma db push --accept-data-loss; then
  print_database_help
  exit 1
fi

echo "Iniciando aplicacao..."
exec node server.js
