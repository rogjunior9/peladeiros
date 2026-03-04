#!/bin/bash

echo "🔄 Verificando conexão com PostgreSQL..."
echo "Host: easypanel.rogeriojunior.com.br:5432"
echo ""

for i in {1..10}; do
    echo -n "Tentativa $i/10... "
    
    if npx prisma db pull > /dev/null 2>&1; then
        echo "✅ CONECTADO!"
        echo ""
        echo "🔄 Sincronizando schema..."
        npx prisma db push --accept-data-loss
        echo ""
        echo "✅ Banco pronto! Iniciando app..."
        npm run dev
        exit 0
    else
        echo "❌ Falhou"
    fi
    
    if [ $i -lt 10 ]; then
        echo "   Aguardando 5 segundos..."
        sleep 5
    fi
done

echo ""
echo "⚠️  Não foi possível conectar após 10 tentativas."
echo ""
echo "Verifique no Easypanel:"
echo "1. Se o serviço postgres está rodando"
echo "2. Se a porta 5432 está liberada externamente"
echo "3. Ou considere usar Neon: https://neon.tech"
