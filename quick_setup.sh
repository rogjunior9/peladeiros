#!/bin/bash

echo ""
echo "🚀 CONFIGURAÇÃO RÁPIDA DO BANCO"
echo "==============================="
echo ""
echo "Cole a Connection String do Neon/Supabase:"
read -p "> " conn

if [ -z "$conn" ]; then
    echo "❌ Connection string vazia"
    exit 1
fi

echo ""
echo "📝 Configurando..."
echo "DATABASE_URL=\"$conn\"" > .env

echo "🔄 Testando conexão..."
if npx prisma db pull > /dev/null 2>&1; then
    echo "✅ Conectado!"
    echo ""
    echo "🔄 Criando tabelas..."
    npx prisma db push --accept-data-loss
    echo ""
    echo "✅ Banco configurado!"
    echo ""
    echo "🚀 Iniciando aplicativo..."
    echo ""
    npm run dev
else
    echo ""
    echo "❌ Falha na conexão"
    echo "Verifique se a connection string está correta"
    exit 1
fi
