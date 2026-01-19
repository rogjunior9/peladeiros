#!/bin/sh

echo "Aguardando banco de dados..."
sleep 5

echo "Executando migracoes do Prisma..."
npx prisma db push --accept-data-loss

echo "Iniciando aplicacao..."
node server.js
