#!/bin/bash

# Script de verificação para deploy no Easypanel
# Execute antes de fazer o deploy

echo ""
echo "🚀 EASYPANEL DEPLOY CHECKLIST"
echo "=============================="
echo ""

ERRORS=0
WARNINGS=0

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_error() {
    echo -e "${RED}❌ $1${NC}"
    ((ERRORS++))
}

check_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

check_ok() {
    echo -e "${GREEN}✅ $1${NC}"
}

check_info() {
    echo "ℹ️  $1"
}

# 1. Verificar .env não está no git
echo "1. Verificando se .env está no git..."
if git ls-files 2>/dev/null | grep -q "^\.env$"; then
    check_error ".env está no git! REMOVA IMEDIATAMENTE"
    echo "   Execute: git rm --cached .env && git commit -m 'Remove .env'"
else
    check_ok ".env não está no git"
fi

# 2. Verificar node_modules não está no git
echo ""
echo "2. Verificando node_modules..."
if git ls-files 2>/dev/null | grep -q "node_modules"; then
    check_error "node_modules está no git!"
else
    check_ok "node_modules não está no git"
fi

# 3. Verificar build local
echo ""
echo "3. Verificando build..."
if [ -d ".next" ]; then
    check_ok "Pasta .next existe (build feito)"
else
    check_warning "Build não encontrado. Execute: npm run build"
fi

# 4. Verificar Dockerfile
echo ""
echo "4. Verificando Dockerfile..."
if [ -f "Dockerfile" ]; then
    check_ok "Dockerfile encontrado"
    
    # Verificar se start.sh existe
    if [ -f "start.sh" ]; then
        check_ok "start.sh encontrado"
    else
        check_error "start.sh não encontrado!"
    fi
else
    check_error "Dockerfile não encontrado!"
fi

# 5. Verificar schema.prisma
echo ""
echo "5. Verificando Prisma..."
if [ -f "prisma/schema.prisma" ]; then
    check_ok "schema.prisma encontrado"
    
    # Validar schema
    if npx prisma validate > /dev/null 2>&1; then
        check_ok "Schema Prisma válido"
    else
        check_error "Schema Prisma inválido!"
    fi
else
    check_error "schema.prisma não encontrado!"
fi

# 6. Verificar variáveis necessárias
echo ""
echo "6. Verificando variáveis de ambiente..."
REQUIRED_VARS=(
    "NEXTAUTH_SECRET"
    "GOOGLE_CLIENT_ID"
    "GOOGLE_CLIENT_SECRET"
    "CRON_SECRET"
)

for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "$var" .env.example; then
        check_ok "$var está documentado"
    else
        check_warning "$var não encontrado no .env.example"
    fi
done

# 7. Verificar scripts de segurança
echo ""
echo "7. Verificando scripts de segurança..."
if [ -f "scripts/security-check.sh" ]; then
    check_ok "security-check.sh existe"
else
    check_warning "security-check.sh não encontrado"
fi

# 8. Verificar se há credenciais hardcoded
echo ""
echo "8. Verificando credenciais hardcoded..."
if grep -r "password\|secret\|token" src/ --include="*.ts" --include="*.tsx" | grep -v "process.env" | grep -v "// " | head -1 > /dev/null; then
    check_warning "Possíveis credenciais hardcoded encontradas. Verifique:"
    grep -r "password\|secret\|token" src/ --include="*.ts" --include="*.tsx" | grep -v "process.env" | grep -v "// " | head -3
else
    check_ok "Nenhuma credencial hardcoded óbvia"
fi

# 9. Resumo
echo ""
echo "=============================="
echo "📊 RESUMO"
echo "=============================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 Tudo pronto para o deploy!${NC}"
    echo ""
    echo "Próximos passos:"
    echo "1. Crie o serviço PostgreSQL no Easypanel"
    echo "2. Configure as variáveis de ambiente"
    echo "3. Faça o deploy do app"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS aviso(s) - pode fazer deploy${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}❌ $ERRORS erro(s) e $WARNINGS aviso(s)${NC}"
    echo "Corrija os erros antes de fazer deploy"
    echo ""
    exit 1
fi
