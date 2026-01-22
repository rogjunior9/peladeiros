const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const N8N_WEBHOOK_URL = (process.env.N8N_WEBHOOK_URL || '')
    .replace(/^"|"$/g, '')
    .replace(/\/+$/, '');

const N8N_API_KEY = (process.env.N8N_API_KEY || '').replace(/^"|"$/g, '');
const WORKFLOW_ID = process.env.N8N_WORKFLOW_ID;

if (!N8N_WEBHOOK_URL || !WORKFLOW_ID) {
    console.error('Missing N8N_WEBHOOK_URL or N8N_WORKFLOW_ID');
    process.exit(1);
}

const apiBase = `${N8N_WEBHOOK_URL}/api/v1`;

// Evolution API credentials template (from existing node)
const EVO_CREDENTIALS = {
    evolutionApi: {
        id: 'aHSXN2pnRdX8XUOW',
        name: 'Evo_rogeriojunior',
    },
};

const EVO_INSTANCE = 'rogjunior9';
const GROUP_JID = '120363405698701647@g.us';

// Nodes to replace (name -> message expression mapping)
const NODES_TO_REPLACE = [
    {
        oldName: 'Enviar WhatsApp (2 Days)',
        newName: 'EVO WhatsApp (2 Days)',
        messageExpr: '={{ $json.message }}',
        remoteJid: GROUP_JID,
    },
    {
        oldName: 'Enviar WhatsApp (1 Day)',
        newName: 'EVO WhatsApp (1 Day)',
        messageExpr: '={{ $json.message }}',
        remoteJid: GROUP_JID,
    },
    {
        oldName: 'Enviar WhatsApp (Final)',
        newName: 'EVO WhatsApp (Final)',
        messageExpr: '=*LISTA FINAL - CONFIRA*\n\n{{ $json.message }}',
        remoteJid: GROUP_JID,
    },
    {
        oldName: 'Enviar WhatsApp (Debt)',
        newName: 'EVO WhatsApp (Debt)',
        messageExpr: '={{ $json.message }}',
        remoteJid: GROUP_JID,
    },
    {
        oldName: 'WPP Monthly',
        newName: 'EVO WPP Monthly',
        messageExpr: '=*Mensalidade Peladeiros* ⚽\n\nOlá {{ $json.name }}, este é um lembrete da mensalidade.\n\nValor: R$ {{ $(\'Webhook Financial\').first().json.body.amount }}\n\nCopia e Cola o PIX:\n{{ $json.pixCode }}\n\nOu Link de Pagamento (Cartão + Taxa) R$ {{ $json.creditAmount }}:\n{{ $json.creditLink }}\n\n(Com direito a churrasco sempre que a turma organizar! 🍖)',
        remoteJid: '={{ $json.phone }}',
    },
];

async function getWorkflow() {
    const res = await fetch(`${apiBase}/workflows/${WORKFLOW_ID}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${N8N_API_KEY}`,
            'X-N8N-API-KEY': N8N_API_KEY,
        },
    });
    if (!res.ok) throw new Error(`Failed to fetch workflow: ${res.status}`);
    return await res.json();
}

function createEvoNode(config, position, id) {
    return {
        parameters: {
            resource: 'messages-api',
            instanceName: EVO_INSTANCE,
            remoteJid: config.remoteJid,
            messageText: config.messageExpr,
            options_message: {},
        },
        type: 'n8n-nodes-evolution-api.evolutionApi',
        typeVersion: 1,
        position: position,
        id: id,
        name: config.newName,
        credentials: EVO_CREDENTIALS,
    };
}

function replaceNodes(workflow) {
    const nodesToReplace = NODES_TO_REPLACE.map((n) => n.oldName);

    // Find and replace each node
    workflow.nodes = workflow.nodes.map((node) => {
        const config = NODES_TO_REPLACE.find((n) => n.oldName === node.name);
        if (config) {
            console.log(`Replacing: ${node.name} -> ${config.newName}`);
            return createEvoNode(config, node.position, node.id);
        }
        return node;
    });

    // Update connections to use new node names
    const newConnections = {};
    for (const [sourceName, conn] of Object.entries(workflow.connections)) {
        // Find if source was renamed
        const sourceConfig = NODES_TO_REPLACE.find((n) => n.oldName === sourceName);
        const newSourceName = sourceConfig ? sourceConfig.newName : sourceName;

        // Update target names in connections
        const updatedConn = {};
        for (const [type, outputs] of Object.entries(conn)) {
            updatedConn[type] = outputs.map((outputArr) =>
                outputArr.map((link) => {
                    const targetConfig = NODES_TO_REPLACE.find((n) => n.oldName === link.node);
                    return {
                        ...link,
                        node: targetConfig ? targetConfig.newName : link.node,
                    };
                })
            );
        }
        newConnections[newSourceName] = updatedConn;
    }
    workflow.connections = newConnections;

    return workflow;
}

async function updateWorkflow(updated) {
    // Keep only editable settings fields
    const allowedSettings = [
        'saveDataErrorExecution',
        'saveDataSuccessExecution',
        'saveDataErrorWorkflow',
        'saveDataSuccessWorkflow',
        'errorWorkflow',
        'errorWorkflowExecution',
        'executionOrder',
    ];
    const cleanSettings = {};
    if (updated.settings && typeof updated.settings === 'object') {
        for (const key of allowedSettings) {
            if (key in updated.settings) cleanSettings[key] = updated.settings[key];
        }
    }

    const payload = {
        name: updated.name,
        nodes: updated.nodes,
        connections: updated.connections,
        settings: cleanSettings,
    };

    const res = await fetch(`${apiBase}/workflows/${WORKFLOW_ID}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${N8N_API_KEY}`,
            'X-N8N-API-KEY': N8N_API_KEY,
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Failed to update workflow: ${res.status} – ${txt}`);
    }
    console.log('Workflow updated successfully!');
}

(async () => {
    try {
        console.log('Fetching workflow...');
        const wf = await getWorkflow();

        console.log('\nReplacing HTTP Request nodes with Evolution API nodes...\n');
        const modified = replaceNodes(wf);

        console.log('\nUpdating workflow...');
        await updateWorkflow(modified);

        console.log('\n✅ Done! All WhatsApp HTTP nodes replaced with Evolution API nodes.');
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
})();
