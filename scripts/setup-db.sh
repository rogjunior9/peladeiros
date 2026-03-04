#!/bin/bash
# Script de configuração rápida do banco

echo ""
echo "🐘 CONFIGURAÇÃO DO BANCO DE DADOS"
echo "=================================="
echo ""
echo "Escolha uma opção:"
echo ""
echo "1) Usar Neon (PostgreSQL gratuito online - recomendado)"
echo "2) Usar Supabase (PostgreSQL gratuito)"
echo "3) Inserir credenciais manualmente"
echo "4) Usar configuração atual"
echo ""
read -p "Opção (1-4): " choice

case $choice in
  1)
    echo ""
    echo "📝 Instruções para Neon:"
    echo "1. Acesse: https://neon.tech"
    echo "2. Crie uma conta gratuita"
    echo "3. Crie um projeto chamado 'peladeiros'"
    echo "4. Copie a 'Connection String'"
    echo ""
    read -p "Cole a Connection String: " conn_string
    echo "DATABASE_URL=\"$conn_string\"" > .env.local
    echo "✅ Configurado!"
    ;;
  2)
    echo ""
    echo "📝 Instruções para Supabase:"
    echo "1. Acesse: https://supabase.com"
    echo "2. Crie um projeto"
    echo "3. Vá em Settings > Database > Connection string"
    echo "4. Copie a URI de conexão"
    echo ""
    read -p "Cole a Connection String: " conn_string
    echo "DATABASE_URL=\"$conn_string\"" > .env.local
    echo "✅ Configurado!"
    ;;
  3)
    echo ""
    read -p "Host: " host
    read -p "Porta (5432): " port
    port=${port:-5432}
    read -p "Usuário: " user
    echo -n "Senha: "
    read -s pass
    echo ""
    read -p "Database: " db
    read -p "Schema (public): " schema
    schema=${schema:-public}
    
    conn_string="postgresql://${user}:${pass}@${host}:${port}/${db}?schema=${schema}"
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${conn_string}\"|" .env
    echo "✅ .env atualizado!"
    ;;
  4)
    echo "Usando configuração atual..."
    ;;
  *)
    echo "Opção inválida"
    exit 1
    ;;
esac

echo ""
echo "🧪 Testando conexão..."
npx prisma db pull 2>&1 | head -5

if [ $? -eq 0 ]; then
  echo "✅ Conexão OK!"
  echo ""
  read -p "Deseja sincronizar o schema? (s/N): " sync
  if [[ $sync =~ ^[Ss]$ ]]; then
    echo "🔄 Sincronizando..."
    npx prisma db push
    echo "✅ Schema sincronizado!"
  fi
else
  echo "❌ Erro na conexão. Verifique as credenciais."
fi
