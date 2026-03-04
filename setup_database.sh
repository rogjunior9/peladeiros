#!/bin/bash
echo ""
echo "🐘 CONFIGURAÇÃO RÁPIDA DO BANCO"
echo "==============================="
echo ""
echo "Escolha uma opção:"
echo ""
echo "1) Neon (Gratuito, online, recomendado)"
echo "   → Acesse: https://console.neon.tech/app/projects"
echo ""
echo "2) Configurar manualmente"
echo ""
read -p "Digite 1 ou 2: " opcao

if [ "$opcao" = "1" ]; then
    echo ""
    echo "📋 PASSO A PASSO NEON:"
    echo ""
    echo "1. Abra: https://console.neon.tech/app/projects"
    echo "2. Clique em 'New Project'"
    echo "3. Nome: peladeiros"
    echo "4. Região: São Paulo (sa-east-1)"
    echo "5. Clique 'Create Project'"
    echo ""
    echo "6. Na tela seguinte, copie a string que começa com:"
    echo "   postgresql://usuario:senha@..."
    echo ""
    read -p "7. Cole aqui a connection string: " conn
    
    echo "DATABASE_URL=\"$conn\"" > .env.local
    echo "✅ Configurado!"
    
elif [ "$opcao" = "2" ]; then
    echo ""
    read -p "Host: " host
    read -p "Porta (5432): " port
    port=${port:-5432}
    read -p "Usuário: " user
    echo -n "Senha: "
    read -s pass
    echo ""
    read -p "Database: " db
    
    echo "DATABASE_URL=\"postgresql://${user}:${pass}@${host}:${port}/${db}?schema=public\"" > .env.local
    echo "✅ Configurado!"
else
    echo "Opção inválida"
    exit 1
fi

echo ""
echo "🔄 Sincronizando schema..."
npx prisma db push --accept-data-loss

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Banco configurado com sucesso!"
    echo ""
    echo "🚀 Iniciando aplicativo..."
    npm run dev
else
    echo ""
    echo "❌ Erro ao conectar. Verifique suas credenciais."
fi
