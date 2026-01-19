# Guia de Automação N8N - Peladeiros

Este guia descreve as automações configuradas no sistema Peladeiros.

O workflow **"Peladeiros Automation Full"** está ativo e integrado com PagSeguro.

## Integração PagSeguro (Cobrança Automática)

O sistema gera chaves Pix automaticamente via PagSeguro (PagBank).

1. **Requisito de CPF**:
    * Para gerar Pix, o PagSeguro exige o CPF do cliente.
    * Cada usuário pode atualizar seu perfil com o CPF.
    * Para usuários sem CPF cadastrado, o sistema usará o **CPF Padrão** configurado no painel Admin > Configurações.

2. **Fluxo Avulso (Cobrança Instantânea)**:
    * Usuário confirma presença no App -> Sistema gera Pix -> Envia mensagem no WhatsApp com "Copia e Cola".

3. **Fluxo Mensalista (Cobrança em Massa)**:
    * Admin clica em **"Gerar Cobrança"** na tela de configurações -> Sistema gera Pix individual para cada mensalista ativo -> Envia mensagens individuais no WhatsApp.

## Funcionalidades de Notificação

1. **Lembretes de Jogo**:
    * 2 Dias Antes (5x ao dia).
    * 1 Dia Antes (4x ao dia).
2. **Lista Final**:
    * Enviada às 15:30 do dia anterior ao jogo.
3. **Cobrança de Inadimplentes**:
    * Enviada às 12:00 do dia seguinte ao jogo (apenas se houver devedores).
4. **Bot de Saldo**:
    * Ao enviar `/saldo` no WhatsApp, o bot responde com o caixa atual.

## Configuração Obrigatória no N8N

1. Acesse `https://n8n.rogeriojunior.com.br`.
2. Abra o workflow **"Peladeiros Automation Full"**.
3. Localize todos os nós chamados **"Enviar WhatsApp (...)"**, **"WPP Casual"** e **"WPP Monthly"**.
4. Substitua `YOUR_WHATSAPP_API_URL` pela URL real da sua API (Evolution/WPPConnect).
    * Ex: `https://api.evolution.com/message/sendText`
5. Salve e ative o workflow.

## Configuração no EasyPanel

Certifique-se que as variáveis de ambiente estão corretas:

```env
N8N_WEBHOOK_URL=https://n8n.rogeriojunior.com.br
PAGSEGURO_EMAIL=...
PAGSEGURO_TOKEN=...
PAGSEGURO_SANDBOX=true (ou false para produção)
```

## Ação Necessária Agora

Entre no App (Logado como Admin), vá em **Configurações**:

1. Defina o **ID do Grupo WhatsApp**.
2. Defina o **CPF Padrão** (usado para gerar Pix de quem não tem CPF).
3. Defina o **Valor da Mensalidade**.
