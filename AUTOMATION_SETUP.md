# Configuração de Automação (Lista de Espera e N8N)

Este documento descreve como configurar a automação da Lista de Espera e integração com N8N no sistema Peladeiros.

## 1. Visão Geral
O sistema agora possui uma **Lista de Espera Automática**.
- **Avulsos** que confirmam com mais de 4,5 horas de antecedência entram na Lista de Espera.
- **Mensalistas e Goleiros** têm prioridade e entram como Confirmados (se houver vaga, senão erro).
- Um **Cron Job** deve rodar periodicamente para mover os primeiros da Lista de Espera para Confirmados quando faltar menos de 4,5 horas.

## 2. Configurar Variáveis de Ambiente (Produção / EasyPanel)
Adicione as seguintes variáveis no seu ambiente de produção (EasyPanel > Projeto > Environment):

```bash
N8N_WEBHOOK_URL="https://seu-n8n.com/webhook/..."
N8N_API_KEY="seu-token-jwt-aqui"
```
*(Nota: A `N8N_API_KEY` deve ser o token JWT que você forneceu: `eyJhbGciOiJIUzI1Ni...`)*

## 3. Configurar Endpoint do Cron Job
Você precisa configurar um agendador externo (como cron-job.org ou o Cron do EasyPanel se disponível) para chamar o seguinte endpoint a cada **30 minutos ou 1 hora**:

- **URL**: `https://peladeiros.rogeriojunior.com.br/api/cron/process-waiting-list`
- **Método**: `GET`

### Exemplo de Configuração:
- **URL**: `https://peladeiros.rogeriojunior.com.br/api/cron/process-waiting-list`
- **Intervalo**: `30 minutes`

## 4. Configurar Workflow no N8N
O sistema enviará um POST para a `N8N_WEBHOOK_URL` quando processar a lista e promover jogadores com sucesso.

**Exemplo de Payload JSON enviado pelo sistema:**
```json
{
  "event": "waiting_list_promotion",
  "gameId": "clq...",
  "gameTitle": "Pelada de Quinta",
  "gameTime": "20/01/2026 20:00",
  "promotedCount": 2,
  "promotedUsers": [
    { "name": "João Silva", "phone": "11999999999" },
    { "name": "Maria Souza", "phone": null }
  ]
}
```

Use esses dados no N8N para disparar a mensagem no WhatsApp. Certifique-se de que o workflow comece com um **Webhook Trigger** configurado para o método `POST`.
