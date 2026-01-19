# Guia de Automação N8N - Peladeiros

Este guia descreve as automações configuradas no sistema Peladeiros.

O workflow **"Peladeiros Automation Full"** já foi criado e atualizado na sua instância N8N.

## Funcionalidades Ativas

1. **Lembretes de Jogo**:
    * 2 Dias Antes (5x ao dia).
    * 1 Dia Antes (4x ao dia).
2. **Lista Final**:
    * Enviada às 15:30 do dia anterior ao jogo.
3. **Cobrança de Inadimplentes**:
    * Enviada às 12:00 do dia seguinte ao jogo (apenas se houver devedores).
4. **Bot de Saldo**:
    * Ao enviar `/saldo` no WhatsApp, o bot responde com o caixa atual.
5. **Cobrança Instantânea (Avulsos)**:
    * Assim que um jogador "Avulso" confirma presença no App, recebe uma mensagem no WhatsApp com o valor e a chave Pix.
6. **Cobrança de Mensalistas (Manual)**:
    * No painel Admin > Configurações, ao clicar em "Enviar Cobrança", todos os mensalistas ativos recebem o lembrete de pagamento no WhatsApp.

## Configuração Obrigatória

Para que as mensagens sejam enviadas, você precisa acessar o N8N e configurar os nós de envio:

1. Acesse `https://n8n.rogeriojunior.com.br`.
2. Abra o workflow **"Peladeiros Automation Full"**.
3. Localize todos os nós chamados **"Enviar WhatsApp (...)"**, **"WPP Casual"** e **"WPP Monthly"**.
4. Substitua `YOUR_WHATSAPP_API_URL` pela URL real da sua API (Evolution/WPPConnect).
    * Ex: `https://api.evolution.com/message/sendText`
5. Salve e verifique se o workflow está **Ativo**.

### Envio de Email

Para enviar emails de cobrança também:

1. No N8N, adicione um node **Gmail** ou **Email** (SMTP).
2. Conecte-o nas saídas do nó **"Switch Event"** (Saída 0 = Casual, Saída 1 = Mensal).
3. Configure as credenciais do seu provedor de email.

## Webhooks Utilizados

* `/webhook/saldo`: Para comandos de bot.
* `/webhook/financial-events`: Para eventos de cobrança disparados pelo App.

## Configuração no EasyPanel

Certifique-se que a variável `N8N_WEBHOOK_URL` está configurada corretamente no App. O sistema tentará usar `${N8N_WEBHOOK_URL}/webhook/financial-events` automaticamente.
Se sua URL base for `https://n8n.rogeriojunior.com.br`, configure `N8N_WEBHOOK_URL` como `https://n8n.rogeriojunior.com.br` (sem webhook no final, ou ajuste conforme preferir, o código tenta tratar).

Recomendado: `N8N_WEBHOOK_URL=https://n8n.rogeriojunior.com.br`
