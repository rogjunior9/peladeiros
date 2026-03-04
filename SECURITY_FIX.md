# 🔒 ROTAÇÃO DE CREDENCIAIS - GUIA DE EMERGÊNCIA

## ⚠️ CRÍTICO: Credenciais Expostas Detectadas

O arquivo `.env` com credenciais REAIS foi encontrado no repositório Git.
**VOCÊ DEVE ROTACIONAR TODAS AS CREDENCIAIS IMEDIATAMENTE!**

---

## 📋 CHECKLIST DE AÇÕES IMEDIATAS

### 1️⃣ FAÇA BACKUP (agora!)

```bash
# Backup do .env atual
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
```

---

### 2️⃣ ROTACIONE AS CREDENCIAIS

#### A) Google OAuth

1. Acesse: https://console.cloud.google.com/apis/credentials
2. Encontre seu OAuth 2.0 Client ID
3. Clique em "RESET SECRET" (ou crie novas credenciais)
4. Atualize no seu `.env`:
   ```
   GOOGLE_CLIENT_ID="novo-id"
   GOOGLE_CLIENT_SECRET="novo-secret"
   ```

#### B) PagSeguro

1. Acesse: https://dev.pagseguro.uol.com.br/
2. Vá em "Minhas Aplicações" > "Credenciais"
3. Revogue o token antigo e gere um novo
4. Atualize no seu `.env`:
   ```
   PAGSEGURO_TOKEN="novo-token"
   ```

#### C) N8N

1. Acesse seu painel N8N
2. Vá em Settings > API
3. Revogue a API key antiga e gere nova
4. Atualize no seu `.env`:
   ```
   N8N_API_KEY="nova-api-key"
   ```

#### D) NextAuth Secret

```bash
# Gere nova chave
openssl rand -base64 32

# Atualize no .env
NEXTAUTH_SECRET="nova-chave-gerada"
```

#### E) Cron Secret

```bash
# Gere nova chave
openssl rand -base64 32

# Atualize no .env
CRON_SECRET="nova-chave-gerada"
```

---

### 3️⃣ LIMPE O HISTÓRICO DO GIT

**⚠️ ATENÇÃO: Isso reescreve o histórico do Git!**

#### Opção A: BFG Repo-Cleaner (Recomendado - mais seguro)

```bash
# 1. Baixe o BFG
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar

# 2. Crie um mirror do repo
cd ..
git clone --mirror peladeiros peladeiros-mirror

# 3. Execute o BFG
java -jar bfg-1.14.0.jar --delete-files .env peladeiros-mirror

# 4. Limpe o reflog
cd peladeiros-mirror
git reflog expire --expire=now --all

# 5. Execute garbage collection
git gc --prune=now --aggressive

# 6. Force push (CUIDADO!)
git push --force

# 7. Limpeza
cd ..
rm -rf peladeiros-mirror
```

#### Opção B: git-filter-repo (Alternativa)

```bash
# Instale git-filter-repo
pip install git-filter-repo

# Execute
git filter-repo --path .env --invert-paths

# Force push (CUIDADO!)
git push --force
```

#### Opção C: Se já fez commits com o .env

```bash
# Adicione ao .gitignore PRIMEIRO
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore
git add .gitignore
git commit -m "Add .env to gitignore"

# Remova do git mas mantenha o arquivo
git rm --cached .env
git commit -m "Remove .env from repository"

# Force push
git push --force
```

---

### 4️⃣ VERIFIQUE SE LIMPOU

```bash
# Verifique se .env ainda está no histórico
git log --all --full-history --source -- .env

# Se retornar algo, a limpeza falhou
```

---

### 5️⃣ CONFIGURE PROTEÇÕES FUTURAS

#### A) Pre-commit Hook

```bash
# Crie o hook
mkdir -p .git/hooks
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
if git diff --cached --name-only | grep -q "\.env"; then
    echo "ERRO: Tentativa de commit de arquivo .env detectada!"
    echo "Remova o .env do staging: git reset HEAD .env"
    exit 1
fi
EOF

chmod +x .git/hooks/pre-commit
```

#### B) Git Attributes

```bash
echo ".env export-ignore" >> .gitattributes
echo ".env.example export-ignore" >> .gitattributes
```

---

### 6️⃣ ATUALIZE VARIÁVEIS DE AMBIENTE

Copie seu `.env` atualizado para todos os ambientes:

- [ ] Desenvolvimento local
- [ ] Servidor de staging
- [ ] Servidor de produção
- [ ] CI/CD (GitHub Actions, etc.)

---

### 7️⃣ REINICIE SERVIÇOS

```bash
# Docker (se usar)
docker-compose down
docker-compose up -d

# Ou PM2/Node
pm2 restart peladeiros
# ou
npm run build && npm start
```

---

### 8️⃣ VERIFIQUE FUNCIONAMENTO

- [ ] Login com Google funciona
- [ ] Geração de PIX funciona
- [ ] Webhooks do PagSeguro funcionam
- [ ] Automações N8N funcionam
- [ ] Cron jobs funcionam

---

## 🚨 SE USAR GIT HUB / GIT LAB

### GitHub - Limpar do histórico remoto

1. Após o force push, verifique se o histórico foi limpo
2. Se precisar de ajuda: https://docs.github.com/pt/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository

### Habilitar Secret Scanning

1. GitHub Repo > Settings > Security
2. Habilitar "Secret scanning"
3. Isso alertará sobre futuras exposições

---

## 📞 SUPORTE

Se precisar de ajuda:

1. **Git**: https://git-scm.com/book/en/v2/Git-Internals-Maintenance-and-Data-Recovery
2. **BFG**: https://rtyley.github.io/bfg-repo-cleaner/
3. **GitHub**: https://support.github.com

---

## ✅ VERIFICAÇÃO FINAL

```bash
# 1. Verifique se .env não está no repo
git ls-files | grep "\.env"
# Deve retornar vazio

# 2. Verifique no histórico
git log --all --full-history -- .env
# Deve retornar vazio

# 3. Teste a aplicação
npm run dev
# Tudo deve funcionar normalmente

# 4. Verifique as variáveis de ambiente
node -e "console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'OK' : 'FALTANDO')"
node -e "console.log('CRON_SECRET:', process.env.CRON_SECRET ? 'OK' : 'FALTANDO')"
```

---

**🎯 LEMBRE-SE: A segurança é responsabilidade de todos!**

Verifique sempre antes de commitar:
- [ ] Não estou commitando .env
- [ ] Não estou commitando logs com dados sensíveis
- [ ] Não estou commitando chaves de API
