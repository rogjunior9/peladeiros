#!/bin/bash

# Script para auxiliar na rotação de credenciais
# Execute: ./scripts/rotate-secrets.sh

set -e

echo "🔐 ROTACIONADOR DE CREDENCIAIS - Peladeiros"
echo "============================================"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 1. Backup
echo -e "${YELLOW}1. Criando backup do .env...${NC}"
if [ -f ".env" ]; then
    cp .env ".env.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${GREEN}✓ Backup criado${NC}"
else
    echo -e "${RED}✗ .env não encontrado!${NC}"
    exit 1
fi

# 2. Gerar novos secrets
echo ""
echo -e "${YELLOW}2. Gerando novos secrets...${NC}"

NEW_NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEW_CRON_SECRET=$(openssl rand -base64 32)

echo -e "${GREEN}✓ Novo NEXTAUTH_SECRET gerado${NC}"
echo -e "${GREEN}✓ Novo CRON_SECRET gerado${NC}"

# 3. Atualizar .env
echo ""
echo -e "${YELLOW}3. Atualizando .env...${NC}"

# Função para atualizar ou adicionar variável
update_env_var() {
    local var_name=$1
    local new_value=$2
    
    if grep -q "^${var_name}=" .env; then
        # Atualizar existente
        sed -i "s|^${var_name}=.*|${var_name}=\"${new_value}\"|" .env
    else
        # Adicionar nova
        echo "" >> .env
        echo "# Gerado automaticamente em $(date)" >> .env
        echo "${var_name}=\"${new_value}\"" >> .env
    fi
}

# Atualizar secrets
update_env_var "NEXTAUTH_SECRET" "$NEW_NEXTAUTH_SECRET"
update_env_var "CRON_SECRET" "$NEW_CRON_SECRET"

echo -e "${GREEN}✓ .env atualizado${NC}"

# 4. Verificar se .env está no .gitignore
echo ""
echo -e "${YELLOW}4. Verificando .gitignore...${NC}"

if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
    echo ".env" >> .gitignore
    echo -e "${GREEN}✓ .env adicionado ao .gitignore${NC}"
else
    echo -e "${GREEN}✓ .env já está no .gitignore${NC}"
fi

# 5. Pre-commit hook
echo ""
echo -e "${YELLOW}5. Configurando pre-commit hook...${NC}"

mkdir -p .git/hooks

cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit hook para evitar commit de arquivos sensíveis

SENSITIVE_FILES=(".env" ".env.local" ".env.production" ".env.staging")
STAGED_FILES=$(git diff --cached --name-only)

for file in "${SENSITIVE_FILES[@]}"; do
    if echo "$STAGED_FILES" | grep -q "^${file}$"; then
        echo "❌ ERRO: Tentativa de commit de arquivo sensível detectado: ${file}"
        echo ""
        echo "Remova do staging com: git reset HEAD ${file}"
        echo ""
        echo "Se realmente precisa commitar este arquivo, use:"
        echo "  git commit --no-verify"
        exit 1
    fi
done

# Verificar por strings sensíveis nos arquivos staged
if echo "$STAGED_FILES" | grep -E "\.(ts|tsx|js|jsx|json)$" > /dev/null; then
    # Verificar por tokens/credentials em código
    if git diff --cached -G "(password|secret|token|key|credential).*[=:] *[\"'][^\"']{10,}[\"']" --name-only | grep -v "node_modules" | grep -v ".env.example" > /dev/null; then
        echo "⚠️  AVISO: Possíveis credenciais detectadas no código."
        echo "Verifique os arquivos acima antes de commitar."
        echo ""
        git diff --cached -G "(password|secret|token|key|credential).*[=:] *[\"'][^\"']{10,}[\"']" --name-only | grep -v "node_modules" | grep -v ".env.example"
        echo ""
        read -p "Continuar mesmo assim? (s/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
            exit 1
        fi
    fi
fi

exit 0
EOF

chmod +x .git/hooks/pre-commit
echo -e "${GREEN}✓ Pre-commit hook configurado${NC}"

# 6. Limpar do git (se estiver commitado)
echo ""
echo -e "${YELLOW}6. Verificando se .env está no git...${NC}"

if git ls-files | grep -q "^\.env$"; then
    echo -e "${RED}⚠️  .env encontrado no repositório git!${NC}"
    echo ""
    echo "Para remover do git (mantendo o arquivo local):"
    echo "  git rm --cached .env"
    echo "  git commit -m 'Remove .env from repository'"
    echo "  git push"
    echo ""
    echo -e "${YELLOW}Para limpar do histórico (MAIS SEGURO):${NC}"
    echo "  Siga o guia em SECURITY_FIX.md"
else
    echo -e "${GREEN}✓ .env não está no git${NC}"
fi

# 7. Resumo
echo ""
echo "============================================"
echo -e "${GREEN}✅ Rotação de secrets concluída!${NC}"
echo "============================================"
echo ""
echo "Próximos passos:"
echo ""
echo "1. Rotacione manualmente:"
echo "   • Google OAuth Client Secret (https://console.cloud.google.com)"
echo "   • PagSeguro Token (https://dev.pagseguro.uol.com.br)"
echo "   • N8N API Key (seu painel N8N)"
echo ""
echo "2. Atualize as variáveis no seu servidor de produção"
echo ""
echo "3. Se .env estava no git, execute:"
echo "   git rm --cached .env"
echo "   git commit -m 'Remove .env from repository'"
echo "   git push --force"
echo ""
echo "4. Reinicie a aplicação"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Guarde o backup do .env em local seguro!${NC}"
echo ""
