# Peladeiros - Sistema de Gestao de Peladas

Sistema completo para gestao de peladas de futebol amador, com suporte a grama sintetica, futsal e futebol de campo.

## Funcionalidades

### Autenticacao
- Login via Google (NextAuth.js)
- Niveis de usuario: Administrador e Jogador Padrao
- Tipos de jogador: Mensalista, Avulso e Goleiro

### Gestao de Peladas
- Criacao e edicao de jogos (apenas admin)
- Cadastro de locais/quadras (apenas admin)
- Sistema de confirmacao de presenca
- Controle de vagas disponiveis

### Financeiro
- Pagamentos via PIX (PagSeguro)
- Pagamentos via Cartao de Credito (PagSeguro)
- Registro manual de pagamentos em dinheiro (admin)
- Lancamento de despesas/saidas (admin)
- Reconhecimento automatico de pagamentos via webhook

### Dashboard
- Total de jogadores por tipo
- Receita e despesas do mes
- Pagamentos pendentes
- Proximas peladas agendadas
- Pagamentos recentes

## Tecnologias

- **Frontend**: Next.js 14, React 18, TypeScript
- **Estilizacao**: Tailwind CSS, Radix UI
- **Backend**: Next.js API Routes
- **Banco de Dados**: PostgreSQL com Prisma ORM
- **Autenticacao**: NextAuth.js com Google Provider
- **Pagamentos**: PagSeguro API (PIX e Cartao)

## Configuracao

### Pre-requisitos

- Node.js 18+
- PostgreSQL
- Conta Google Cloud (para OAuth)
- Conta PagSeguro (para pagamentos)

### Variaveis de Ambiente

Copie o arquivo `.env.example` para `.env` e configure:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/peladeiros"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="gere-uma-chave-segura"

# Google OAuth
GOOGLE_CLIENT_ID="seu-client-id"
GOOGLE_CLIENT_SECRET="seu-client-secret"

# PagSeguro
PAGSEGURO_EMAIL="seu-email"
PAGSEGURO_TOKEN="seu-token"
PAGSEGURO_SANDBOX="true"
PAGSEGURO_NOTIFICATION_URL="https://seu-dominio.com/api/webhooks/pagseguro"
```

### Instalacao

```bash
# Instalar dependencias
npm install

# Gerar cliente Prisma
npm run db:generate

# Criar tabelas no banco
npm run db:push

# Iniciar servidor de desenvolvimento
npm run dev
```

### Configuracao do Google OAuth

1. Acesse o [Google Cloud Console](https://console.cloud.google.com)
2. Crie um novo projeto ou selecione existente
3. Ative a API do Google+
4. Configure a tela de consentimento OAuth
5. Crie credenciais OAuth 2.0
6. Adicione as URLs de callback:
   - `http://localhost:3000/api/auth/callback/google` (desenvolvimento)
   - `https://seu-dominio.com/api/auth/callback/google` (producao)

### Configuracao do PagSeguro

1. Acesse o [PagSeguro Sandbox](https://sandbox.pagseguro.uol.com.br) para testes
2. Obtenha seu token de autenticacao
3. Configure a URL de notificacao para webhooks
4. Para producao, use as credenciais da conta real

## Estrutura do Projeto

```
src/
├── app/
│   ├── (dashboard)/      # Paginas autenticadas
│   │   ├── dashboard/    # Dashboard principal
│   │   ├── games/        # Gestao de peladas
│   │   ├── players/      # Gestao de jogadores
│   │   ├── venues/       # Gestao de locais
│   │   ├── payments/     # Pagamentos
│   │   ├── finance/      # Financeiro
│   │   └── settings/     # Configuracoes
│   ├── api/              # API Routes
│   │   ├── auth/         # Autenticacao
│   │   ├── dashboard/    # Dados do dashboard
│   │   ├── games/        # CRUD de jogos
│   │   ├── venues/       # CRUD de locais
│   │   ├── users/        # CRUD de usuarios
│   │   ├── payments/     # Pagamentos
│   │   ├── transactions/ # Transacoes financeiras
│   │   └── webhooks/     # Webhooks externos
│   ├── login/            # Pagina de login
│   └── page.tsx          # Landing page
├── components/
│   ├── layout/           # Componentes de layout
│   └── ui/               # Componentes UI reutilizaveis
├── lib/
│   ├── auth.ts           # Configuracao NextAuth
│   ├── prisma.ts         # Cliente Prisma
│   ├── pagseguro.ts      # Integracao PagSeguro
│   └── utils.ts          # Funcoes utilitarias
└── types/                # Tipos TypeScript
```

## Tipos de Usuario

### Administrador
- Criar/editar/excluir peladas
- Cadastrar locais de jogo
- Gerenciar usuarios (alterar tipo, permissoes)
- Registrar pagamentos em dinheiro
- Lancar despesas/saidas
- Confirmar pagamentos pendentes

### Jogador Padrao
- Confirmar presenca em peladas
- Realizar pagamentos (PIX/Cartao)
- Visualizar historico de pagamentos
- Editar perfil

### Tipos de Jogador
- **Mensalista**: Paga mensalidade fixa
- **Avulso**: Paga por jogo
- **Goleiro**: Nao paga (configuravel)

## Scripts Disponiveis

```bash
npm run dev       # Servidor de desenvolvimento
npm run build     # Build de producao
npm run start     # Iniciar build de producao
npm run lint      # Verificar codigo

npm run db:generate  # Gerar cliente Prisma
npm run db:push      # Sincronizar schema com banco
npm run db:migrate   # Criar migracoes
npm run db:studio    # Interface visual do banco
```

## Deploy

O projeto pode ser deployado em:
- Vercel (recomendado para Next.js)
- Railway
- Render
- AWS/GCP/Azure

Certifique-se de:
1. Configurar todas as variaveis de ambiente
2. Usar um banco PostgreSQL de producao
3. Configurar URLs corretas para OAuth e webhooks
4. Desabilitar o modo sandbox do PagSeguro

## Licenca

MIT
