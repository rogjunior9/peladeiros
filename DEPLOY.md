# Deploy no EasyPanel

## Passo a Passo Completo

### 1. Configurar Google OAuth

Antes de tudo, voce precisa criar as credenciais do Google:

1. Acesse https://console.cloud.google.com
2. Crie um novo projeto (ou use existente)
3. Va em **APIs e Servicos** > **Credenciais**
4. Clique em **Criar Credenciais** > **ID do cliente OAuth**
5. Selecione **Aplicativo da Web**
6. Adicione as URIs de redirecionamento autorizadas:
   ```
   https://peladeiros.rogeriojunior.com.br/api/auth/callback/google
   ```
7. Copie o **Client ID** e **Client Secret**

### 2. No EasyPanel

#### 2.1 Criar Projeto

1. Acesse seu EasyPanel
2. Clique em **New Project**
3. Nome: `peladeiros`

#### 2.2 Criar Banco de Dados PostgreSQL

1. Dentro do projeto, clique em **+ Service**
2. Selecione **Postgres**
3. Configure:
   - Service Name: `db`
   - Password: `peladeiros123` (ou gere uma senha forte)
4. Clique em **Create**
5. Anote a **Connection String** que aparece

#### 2.3 Criar Aplicacao

1. Clique em **+ Service**
2. Selecione **App**
3. Configure:
   - Service Name: `app`
   - Source: **GitHub**
   - Repository: `rogjunior9/peladeiros`
   - Branch: `main`
   - Build: **Dockerfile**

#### 2.4 Configurar Dominio

1. Na aba **Domains** do servico `app`
2. Adicione: `peladeiros.rogeriojunior.com.br`
3. Habilite HTTPS/SSL

#### 2.5 Configurar Variaveis de Ambiente

Na aba **Environment** do servico `app`, adicione:

```
DATABASE_URL=postgresql://postgres:peladeiros123@db:5432/postgres
NEXTAUTH_URL=https://peladeiros.rogeriojunior.com.br
NEXTAUTH_SECRET=gere-uma-chave-com-openssl-rand-base64-32
GOOGLE_CLIENT_ID=seu-client-id-do-google
GOOGLE_CLIENT_SECRET=seu-client-secret-do-google
PAGSEGURO_EMAIL=seu-email-pagseguro
PAGSEGURO_TOKEN=seu-token-pagseguro
PAGSEGURO_SANDBOX=false
PAGSEGURO_NOTIFICATION_URL=https://peladeiros.rogeriojunior.com.br/api/webhooks/pagseguro
```

**Para gerar NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

#### 2.6 Deploy

1. Clique em **Deploy**
2. Aguarde o build (pode levar alguns minutos)
3. Acesse https://peladeiros.rogeriojunior.com.br

### 3. Configurar DNS

No seu provedor de dominio (onde registrou rogeriojunior.com.br):

1. Adicione um registro **A** ou **CNAME**:
   - Tipo: A (ou CNAME se preferir)
   - Nome: peladeiros
   - Valor: IP do seu servidor EasyPanel

### 4. Configurar PagSeguro (Opcional)

Para receber pagamentos:

1. Acesse https://pagseguro.uol.com.br
2. Va em **Configuracoes** > **Integracoes** > **Token de Seguranca**
3. Gere seu token
4. Configure a URL de notificacao:
   ```
   https://peladeiros.rogeriojunior.com.br/api/webhooks/pagseguro
   ```

### 5. Primeiro Acesso

1. Acesse https://peladeiros.rogeriojunior.com.br
2. Faca login com Google
3. O primeiro usuario a fazer login sera automaticamente ADMIN

Para promover outros usuarios a admin, edite diretamente no banco:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'email@exemplo.com';
```

---

## Rodar Localmente (Desenvolvimento)

Se preferir rodar localmente primeiro:

```bash
# 1. Clone o repositorio
git clone https://github.com/rogjunior9/peladeiros.git
cd peladeiros

# 2. Instale as dependencias
npm install

# 3. Configure as variaveis
cp .env.example .env
# Edite o .env com suas credenciais

# 4. Inicie o PostgreSQL (com Docker)
docker run -d \
  --name peladeiros-db \
  -e POSTGRES_USER=peladeiros \
  -e POSTGRES_PASSWORD=peladeiros123 \
  -e POSTGRES_DB=peladeiros \
  -p 5432:5432 \
  postgres:15-alpine

# 5. Configure o banco
npm run db:push

# 6. Inicie o servidor
npm run dev

# 7. Acesse http://localhost:3000
```

---

## Problemas Comuns

### Erro de conexao com banco
- Verifique se o PostgreSQL esta rodando
- Confirme a DATABASE_URL

### Erro no login Google
- Verifique se a URL de callback esta correta no Google Console
- Confirme GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET

### Aplicacao nao inicia
- Verifique os logs no EasyPanel
- Confirme todas as variaveis de ambiente
