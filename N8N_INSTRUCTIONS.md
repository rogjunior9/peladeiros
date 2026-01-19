# Guia de Automação N8N - Peladeiros

Este guia descreve como importar e configurar o workflow de automação no seu N8N.

## 1. Importação do Workflow

1. Baixe o arquivo `n8n_peladeiros.json` que está na raiz do projeto.
2. Acesse seu N8N em `n8n.rogeriojunior.com.br`.
3. Crie um novo workflow ou clique em **Import from File**.
4. Selecione o arquivo `n8n_peladeiros.json`.

## 2. Configurações Necessárias no N8N

Após importar, você verá vários nós de **"Enviar WhatsApp"**. Eles precisam ser configurados com a sua API de WhatsApp (Evolution, WPPConnect, etc).

1. Abra cada nó chamado **"Enviar WhatsApp (...)"**.
2. No campo **URL**, substitua `YOUR_WHATSAPP_API_URL` pela URL real da sua API.
    * Exemplo: `https://api.evolution.com/message/sendText`
3. Verifique se o método de Autenticação (Header `apikey` ou `Authorization`) é necessário na aba "Authentication" ou "Headers" do nó HTTP Request.
4. Salve e **ative** o Workflow.

## 3. Configuração do Webhook (/saldo)

O fluxo de saldo começa com um nó **Webhook**.

1. Abra o nó **Webhook Saldo**.
2. Copie a **Production URL** (algo como `https://n8n.rogeriojunior.com.br/webhook/saldo`).
3. Configure sua API de WhatsApp para enviar mensagens recebidas (Webhooks) para essa URL.
4. Certifique-se de que o caminho no JSON do webhook corresponde ao que o nó **Check Command** espera.
    * Atualmente ele verifica `$json.body.message.text`. Se sua API enviar em outro formato (ex: `data.message.conversation`), ajuste a expressão no nó "Check Command".

## 4. Endpoints da API Utilizados

O workflow chama automaticamente os seguintes endpoints do seu sistema Peladeiros:

* `GET /api/n8n/trigger`
* `GET /api/n8n/message/list?gameId=...`
* `GET /api/n8n/message/debtors?gameId=...`
* `GET /api/n8n/finance/balance`

## 5. Variáveis de Ambiente (EasyPanel)

Lembre-se de configurar as variáveis no EasyPanel se quiser segurança extra ou se precisar que o sistema envie hooks diretamente (para o caso da lista de espera automática):

* `N8N_WEBHOOK_URL`
* `N8N_API_KEY`
