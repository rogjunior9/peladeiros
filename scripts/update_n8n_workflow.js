const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const N8N_WEBHOOK_URL = (process.env.N8N_WEBHOOK_URL || '').replace(/\/+$|\/+$/g, '');
const N8N_API_KEY = (process.env.N8N_API_KEY || '').replace(/^"|"$/g, '');
const WORKFLOW_ID = process.env.N8N_WORKFLOW_ID;

if (!N8N_WEBHOOK_URL || !WORKFLOW_ID) {
    console.error('Missing N8N_WEBHOOK_URL or N8N_WORKFLOW_ID');
    process.exit(1);
}

const apiBase = `${N8N_WEBHOOK_URL}/api/v1`;

async function getWorkflow() {
    const res = await fetch(`${apiBase}/workflows/${WORKFLOW_ID}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${N8N_API_KEY}`,
            'X-N8N-API-KEY': N8N_API_KEY,
        },
    });
    if (!res.ok) {
        throw new Error(`Failed to fetch workflow: ${res.status}`);
    }
    return await res.json();
}

function addSwitchNode(workflow) {
    // Find the webhook node in the workflow
    const webhookNode = workflow.nodes.find((n) => n.type === 'n8n-nodes-base.webhook');
    if (!webhookNode) {
        console.warn('Webhook node not found – skipping switch insertion');
        return workflow;
    }

    // Define the Switch node that routes by payload.type
    const switchNode = {
        name: 'Route by type',
        type: 'n8n-nodes-base.switch',
        typeVersion: 1,
        position: [webhookNode.position[0] + 300, webhookNode.position[1]],
        parameters: {
            conditions: [
                { value1: '={{$json["type"]}}', operation: 'equal', value2: 'message' },
                { value1: '={{$json["type"]}}', operation: 'equal', value2: 'reminder' },
                { value1: '={{$json["type"]}}', operation: 'equal', value2: 'payment' },
            ],
        },
        disabled: false,
        notesInFlow: true,
        alwaysOutputData: false,
        continueOnFail: false,
    };

    // Add the new node to the workflow
    workflow.nodes.push(switchNode);

    // Ensure connections object exists and connect webhook -> switch (main output)
    // n8n expects main to be an array of arrays: [[{node, type, index}]]
    workflow.connections = workflow.connections || {};
    workflow.connections[webhookNode.name] = workflow.connections[webhookNode.name] || {};
    workflow.connections[webhookNode.name].main = [
        [{ node: switchNode.name, type: 'main', index: 0 }]
    ];

    // NOTE: you still need to manually connect the switch outputs to downstream nodes.
    return workflow;
}

async function updateWorkflow(updated) {
    // Keep only editable settings fields (if any)
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
}

(async () => {
    try {
        const wf = await getWorkflow();
        console.log('Fetched workflow (first 200 chars):', JSON.stringify(wf).substring(0, 200));
        const modified = addSwitchNode(wf);
        await updateWorkflow(modified);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
})();
