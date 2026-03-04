# 🚀 DEPLOY NO EASYPANEL - PASSO A PASSO

## ⚡ RESUMO RÁPIDO (5 MINUTOS)

### PASSO 1: Verificar se está tudo certo no Git

```bash
# Certifique-se que .env NÃO está no git
git ls-files | grep "\.env"
# Deve retornar VAZIO

# Se retornar algo, remova:
git rm --cached .env
git commit -m "Remove .env do repo"
git push
```

### PASSO 2: No Painel Easypanel

1. **Vá em: Serviços → + Novo Serviço**

2. **Escolha: Git**

3. **Configure:**
   ```
   Nome: peladeiros
   Repositório Git: https://github.com/rogjunior9/peladeiros
   Branch: main
   ```

4. **Tipo de Build:** Dockerfile

5. **Clique em "Criar"**

### PASSO 3: Configurar Variáveis de Ambiente

No Easypanel, vá na aba **"Environment"** e adicione:

```env
# 1. BANCO (conexão INTERNA - mais rápida!)
DATABASE_URL=postgresql://peladeiros:@4??3^w2JvpbG@sites_postgres:5432/peladeiros

# 2. AUTH (gerar novo!)
NEXTAUTH_URL=https://peladeiros.seu-dominio.com.br
NEXTAUTH_SECRET=COLE_AQUI_O_SECRET_GERADO

# 3. GOOGLE (use os mesmos do .env atual)
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret

# 4. PAGSEGURO
PAGSEGURO_EMAIL=contato@rogeriojunior.com.br
PAGSEGURO_TOKEN=seu-token-pagseguro
PAGSEGURO_SANDBOX=false
PAGSEGURO_NOTIFICATION_URL=https://peladeiros.seu-dominio.com.br/api/webhooks/pagseguro

# 5. ADMIN
ADMIN_EMAILS=rogjunior9@gmail.com

# 6. CRON (gerar novo!)
CRON_SECRET=COLE_AQUI_O_SECRET_GERADO

# 7. N8N
N8N_WEBHOOK_URL=https://n8n.seu-dominio.com.br
N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### PASSO 4: Gerar Secrets

Execute no terminal LOCAL (seu computador):

```bash
# Gerar NEXTAUTH_SECRET
openssl rand -base64 32

# Gerar CRON_SECRET  
openssl rand -base64 32
```

Copie os valores e cole no Easypanel!

### PASSO 5: Deploy!

1. Clique em **"Deploy"**
2. Aguarde o build (2-3 minutos)
3. Acesse a URL!

---

## 🔧 APÓS O PRIMEIRO DEPLOY

### Sincronizar o banco:

No terminal do serviço (Easypanel → peladeiros → Terminal):

```bash
npx prisma db push
```

Ou adicione ao Dockerfile antes do CMD:
```dockerfile
RUN npx prisma db push || true
```

---

## 🌐 CONFIGURAR DOMÍNIO

1. No Easypanel, vá em: peladeiros → Domains
2. Adicione: `peladeiros.seu-dominio.com.br`
3. No seu DNS, aponte para o IP do servidor
4. Ative SSL (Let's Encrypt)

---

## ✅ CHECKLIST PRÉ-DEPLOY

- [ ] .env não está no git
- [ ] node_modules não está no git
- [ ] npm run build funciona local
- [ ] Dockerfile existe
- [ ] start.sh existe
- [ ] Variáveis configuradas no Easypanel
- [ ] NEXTAUTH_SECRET gerado
- [ ] CRON_SECRET gerado

---

## 🆘 SE DER ERRO

### "Can't reach database"
→ Verifique se `sites_postgres` está rodando

### "Build failed"
→ Verifique os logs no Easypanel (aba Logs)

### "Erro na porta"
→ Certifique-se que expõe porta 3000 no Dockerfile

---

🎉 PRONTO! SEU APP VAI ESTAR NO AR!
