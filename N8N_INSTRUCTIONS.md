# Guia de Automação N8N - Peladeiros

Este guia descreve como configurar os workflows no N8N para automatizar as notificações do Grupo de WhatsApp.

## 1. Configuração Inicial

No Painel Admin do App (`/settings`), configure:

1. **ID do Grupo WhatsApp**: Copie o ID do grupo (ex: `12036304...@g.us`) onde o bot está.
2. **Chave PIX**: Para aparecer nas mensagens.
3. **Ative as automações** desejadas.

## 2. Endpoints da API para o N8N

O N8N deve fazer requisições `GET` para estes endpoints:

* **Trigger (Cérebro):** `https://peladeiros.rogeriojunior.com.br/api/n8n/trigger`
  * Retorna a lista de jogos próximos e flags (`is2DaysBefore`, `is1DayBefore`, `isToday`, `isFinishedYesterday`).
* **Mensagem Lista:** `https://peladeiros.rogeriojunior.com.br/api/n8n/message/list?gameId={ID}`
  * Retorna o texto formatado da lista de presença.
* **Mensagem Devedores:** `https://peladeiros.rogeriojunior.com.br/api/n8n/message/debtors?gameId={ID}`
  * Retorna lista de quem não pagou (para jogos de ontem).
* **Saldo:** `https://peladeiros.rogeriojunior.com.br/api/n8n/finance/balance`
  * Retorna o saldo do caixa.

## 3. Workflows Sugeridos no N8N

Você deve criar **Cron Jobs** (Schedule Triggers) no N8N para os horários específicos.

### Workflow A: Lembrete 2 Dias Antes (09h - 22h)

* **Trigger:** Schedule `0 9,12,15,18,21 * * *` (Ajuste conforme fuso horário do servidor N8N)
* **Ação:** GET `/api/n8n/trigger`
* **Lógica (IF/Switch):** Para cada jogo, SE `is2DaysBefore == true` E `settings.enableReminder2Days == true`:
  * GET `/api/n8n/message/list?gameId={{ $json.gameId }}`
  * **WhatsApp Send:** Enviar `message` para `settings.whatsappGroupId`.

### Workflow B: Lembrete 1 Dia Antes (09h - 15h)

* **Trigger:** Schedule `0 9,11,13,15 * * *`
* **Ação:** GET `/api/n8n/trigger`
* **Lógica:** SE `is1DayBefore == true` E `settings.enableReminder1Day == true`:
  * GET `/api/n8n/message/list?gameId={{ $json.gameId }}`
  * **WhatsApp Send:** Enviar mensagem.

### Workflow C: Lista Final (1 Dia Antes as 15:30)

* **Trigger:** Schedule `30 15 * * *`
* **Ação:** GET `/api/n8n/trigger`
* **Lógica:** SE `is1DayBefore == true` E `settings.enableFinalList == true`:
  * GET `/api/n8n/message/list?gameId={{ $json.gameId }}`
  * **WhatsApp Send:** Enviar mensagem ("Lista Final...").

### Workflow D: Cobrança (Dia Seguinte 12h)

* **Trigger:** Schedule `0 12 * * *`
* **Ação:** GET `/api/n8n/trigger`
* **Lógica:** SE `isFinishedYesterday == true` E `settings.enableDebtors == true`:
  * GET `/api/n8n/message/debtors?gameId={{ $json.gameId }}`
  * **IF:** `message` não for nulo/vazio.
  * **WhatsApp Send:** Enviar mensagem.

### Workflow E: Comando /saldo

* **Trigger:** WhatsApp Message (Webhook) -> Filtrar texto `/saldo`
* **Ação:** GET `/api/n8n/finance/balance`
* **WhatsApp Send:** Responder com o saldo.

## Notas Importantes

* **Fuso Horário:** Verifique se o N8N está no mesmo fuso horário (Brasília -03:00). Se estiver em UTC, ajuste os CRONs (+3h).
* **Segurança:** Recomenda-se adicionar Autenticação nos endpoints se possível (Header Authorization), configurando no N8N e no `.env`.
