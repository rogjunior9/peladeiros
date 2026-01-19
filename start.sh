#!/bin/sh

echo "Aguardando banco de dados..."
sleep 5

echo "Executando migracoes do Prisma..."
npx prisma db push --accept-data-loss || echo "Aviso: Migracao falhou, continuando..."

echo "Iniciando aplicacao..."
exec node server.js
