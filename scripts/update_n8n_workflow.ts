const fetch = require('node-fetch');
import * as fs from 'fs';
import * as path from 'path';

// Load env variables (expects .env at project root)
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env') });

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL?.replace(/\/+$/, '');
const N8N_API_KEY = process.env.N8N_API_KEY || '';
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
        },
    });
    if (!res.ok) {
        throw new Error(`Failed to fetch workflow: ${res.status}`);
    }
    const data = await res.json();
    return data;
}

interface WorkflowNode {
    type: string;
    position: [number, number];
    name: string;
    wires?: string[][][];
    [key: string]: any;
}

function addSwitchNode(workflow: any) {
    // Find the webhook node (type: "n8n-nodes-base.webhook")
    // Explicitly cast nodes to array and use the interface
    const nodes = workflow.nodes as WorkflowNode[];
    const webhookNode = nodes.find((n) => n.type === 'n8n-nodes-base.webhook');

    if (!webhookNode) {
        console.warn('Webhook node not found – skipping switch insertion');
        return workflow;
    }

    // Create a new Switch node that checks payload.type
    const switchNode = {
        name: 'Route by type',
        type: 'n8n-nodes-base.switch',
        typeVersion: 1,
        position: [webhookNode.position[0] + 300, webhookNode.position[1]],
        parameters: {
            conditions: [
                {
                    value1: '={{$json["type"]}}',
                    operation: 'equal',
                    value2: 'message',
                },
                {
                    value1: '={{$json["type"]}}',
                    operation: 'equal',
                    value2: 'reminder',
                },
                {
                    value1: '={{$json["type"]}}',
                    operation: 'equal',
                    value2: 'payment',
                },
            ],
        },
        disabled: false,
        notesInFlow: true,
        alwaysOutputData: false,
        continueOnFail: false,
        webhookId: undefined,
        webhookPath: undefined,
        webhookMethod: undefined,
        webhookResponseCode: undefined,
        webhookResponseHeaders: undefined,
        webhookResponseBody: undefined,
        webhookResponseMode: undefined,
        webhookResponseHeadersArray: [],
        webhookResponseHeadersObject: {},
        webhookResponseHeadersString: '',
        webhookResponseHeadersJson: {},
        webhookResponseHeadersJsonString: '',
        webhookResponseHeadersJsonArray: [],
        webhookResponseHeadersJsonObject: {},
        webhookResponseHeadersJsonStringArray: [],
        webhookResponseHeadersJsonStringObject: {},
        webhookResponseHeadersJsonStringJson: {},
        webhookResponseHeadersJsonStringJsonArray: [],
        webhookResponseHeadersJsonStringJsonObject: {},
        webhookResponseHeadersJsonStringJsonString: '',
        webhookResponseHeadersJsonStringJsonStringArray: [],
        webhookResponseHeadersJsonStringJsonStringObject: {},
        // The above is verbose – n8n only needs the conditions.
    } as any;

    // Connect webhook -> switch
    webhookNode.wires = [[switchNode.name]];
    // Add the new node to the workflow
    workflow.nodes.push(switchNode);

    // NOTE: You will still need to manually connect the switch outputs to the
    // appropriate downstream nodes (e.g., Send Message, Send Reminder, Process Payment).
    // This script only creates the switch node and wires it to the webhook.

    return workflow;
}

async function updateWorkflow(updated: any) {
    const res = await fetch(`${apiBase}/workflows/${WORKFLOW_ID}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${N8N_API_KEY}`,
        },
        body: JSON.stringify(updated),
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Failed to update workflow: ${res.status} – ${txt}`);
    }
    console.log('Workflow updated successfully');
}

(async () => {
    try {
        const wf = await getWorkflow();
        const modified = addSwitchNode(wf);
        await updateWorkflow(modified);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
})();
