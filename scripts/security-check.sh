#!/bin/bash

# Script de verificação de segurança
# Execute: ./scripts/security-check.sh

set -e

echo "🔍 VERIFICAÇÃO DE SEGURANÇA - Peladeiros"
echo "========================================="
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# Função para printar seções
section() {
    echo ""
    echo -e "${BLUE}$1${NC}"
    echo "-------------------------------------------"
}

# Função para erro
error() {
    echo -e "${RED}❌ $1${NC}"
    ((ERRORS++))
}

# Função para warning
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

# Função para sucesso
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 1. Verificar .env no git
section "1. Verificando arquivos .env no git"

if git ls-files 2>/dev/null | grep -q "^\.env"; then
    error "Arquivos .env encontrados no git:"
    git ls-files | grep "^\.env"
else
    success "Nenhum arquivo .env no git"
fi

# 2. Verificar .gitignore
section "2. Verificando .gitignore"

if [ -f ".gitignore" ]; then
    if grep -q "^\.env$" .gitignore; then
        success ".env está no .gitignore"
    else
        error ".env NÃO está no .gitignore"
    fi
    
    if grep -q "\.env\." .gitignore; then
        success "Variações de .env estão no .gitignore"
    else
        warning "Variações de .env (.env.local, etc.) podem não estar no .gitignore"
    fi
else
    error ".gitignore não encontrado"
fi

# 3. Verificar credenciais hardcoded
section "3. Verificando credenciais hardcoded no código"

# Patterns a procurar
PATTERNS=(
    "password\s*[=:]\s*[\"'][^\"']{8,}[\"']"
    "secret\s*[=:]\s*[\"'][^\"']{10,}[\"']"
    "token\s*[=:]\s*[\"'][^\"']{10,}[\"']"
    "api[_-]?key\s*[=:]\s*[\"'][^\"']{10,}[\"']"
    "private[_-]?key\s*[=:]\s*[\"'][^\"']{10,}[\"']"
)

FOUND_CREDENTIALS=false
for pattern in "${PATTERNS[@]}"; do
    if grep -r -n -i -E "$pattern" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" 2>/dev/null | grep -v "node_modules" | grep -v ".env.example" | head -5 > /dev/null; then
        if [ "$FOUND_CREDENTIALS" = false ]; then
            warning "Possíveis credenciais hardcoded encontradas:"
            FOUND_CREDENTIALS=true
        fi
        grep -r -n -i -E "$pattern" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" 2>/dev/null | grep -v "node_modules" | grep -v ".env.example" | head -3
        echo "..."
    fi
done

if [ "$FOUND_CREDENTIALS" = false ]; then
    success "Nenhuma credencial hardcoded óbvia encontrada"
fi

# 4. Verificar pre-commit hook
section "4. Verificando pre-commit hook"

if [ -f ".git/hooks/pre-commit" ]; then
    success "Pre-commit hook existe"
    if grep -q "\.env" .git/hooks/pre-commit; then
        success "Pre-commit hook verifica arquivos .env"
    else
        warning "Pre-commit hook não verifica arquivos .env"
    fi
else
    warning "Pre-commit hook não encontrado"
fi

# 5. Verificar variáveis de ambiente
section "5. Verificando variáveis de ambiente críticas"

if [ -f ".env" ]; then
    # Verificar secrets fortes
    if grep -q "NEXTAUTH_SECRET" .env; then
        NEXTAUTH_SECRET=$(grep "NEXTAUTH_SECRET" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
        if [ ${#NEXTAUTH_SECRET} -lt 32 ]; then
            error "NEXTAUTH_SECRET muito curto (${#NEXTAUTH_SECRET} chars, mínimo 32)"
        else
            success "NEXTAUTH_SECRET configurado (${#NEXTAUTH_SECRET} caracteres)"
        fi
    else
        error "NEXTAUTH_SECRET não encontrado no .env"
    fi
    
    if grep -q "CRON_SECRET" .env; then
        CRON_SECRET=$(grep "CRON_SECRET" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
        if [ ${#CRON_SECRET} -lt 32 ]; then
            error "CRON_SECRET muito curto (${#CRON_SECRET} chars, mínimo 32)"
        else
            success "CRON_SECRET configurado (${#CRON_SECRET} caracteres)"
        fi
    else
        warning "CRON_SECRET não encontrado no .env (recomendado para cron jobs)"
    fi
    
    # Verificar se não são valores default/fracos
    WEAK_SECRETS=("your-secret" "change-me" "123456" "password" "admin" "secret")
    for weak in "${WEAK_SECRETS[@]}"; do
        if grep -i -q "$weak" .env; then
            error "Valor fraco detectado no .env: '$weak'"
        fi
    done
    
    # Verificar PAGSEGURO_SANDBOX
    if grep -q 'PAGSEGURO_SANDBOX="false"' .env; then
        warning "PAGSEGURO_SANDBOX está em modo PRODUÇÃO"
    elif grep -q 'PAGSEGURO_SANDBOX="true"' .env; then
        success "PAGSEGURO_SANDBOX está em modo SANDBOX"
    fi
else
    error ".env não encontrado"
fi

# 6. Verificar dependências vulneráveis
section "6. Verificando dependências"

if command -v npm &> /dev/null; then
    if npm audit --json 2>/dev/null | grep -q "vulnerabilities"; then
        VULN_COUNT=$(npm audit --json 2>/dev/null | grep -o '"vulnerabilities":[0-9]*' | grep -o '[0-9]*' | head -1)
        if [ "$VULN_COUNT" -gt 0 ]; then
            warning "$VULN_COUNT vulnerabilidades encontradas em dependências"
            echo "   Execute: npm audit fix"
        else
            success "Nenhuma vulnerabilidade conhecida em dependências"
        fi
    else
        success "Audit de dependências OK"
    fi
else
    warning "npm não encontrado"
fi

# 7. Verificar permissões de arquivos
section "7. Verificando permissões de arquivos"

if [ -f ".env" ]; then
    PERMS=$(stat -c %a .env 2>/dev/null || stat -f %Lp .env 2>/dev/null)
    if [ "$PERMS" = "644" ] || [ "$PERMS" = "600" ]; then
        success "Permissões do .env estão adequadas ($PERMS)"
    else
        warning "Permissões do .env podem ser muito abertas ($PERMS)"
        echo "   Recomendado: chmod 600 .env"
    fi
fi

# 8. Verificar console.logs com dados sensíveis
section "8. Verificando console.logs potencialmente perigosos"

SENSITIVE_LOGS=$(grep -r -n "console.log.*password\|console.log.*secret\|console.log.*token\|console.log.*key" src/ --include="*.ts" --include="*.tsx" 2>/dev/null || true)

if [ -n "$SENSITIVE_LOGS" ]; then
    warning "console.logs potencialmente sensíveis encontrados:"
    echo "$SENSITIVE_LOGS" | head -5
else
    success "Nenhum console.log suspeito encontrado"
fi

# 9. Resumo
section "📊 RESUMO"

echo ""
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 Todos os checks passaram!${NC}"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS aviso(s) encontrado(s)${NC}"
    echo "   Revise os avisos acima"
else
    echo -e "${RED}❌ $ERRORS erro(s) e $WARNINGS aviso(s) encontrado(s)${NC}"
    echo "   Corrija os erros antes de fazer deploy"
fi

echo ""
echo "============================================"
echo "Para corrigir problemas, veja SECURITY_FIX.md"
echo "============================================"

exit $ERRORS
