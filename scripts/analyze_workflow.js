const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
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

(async () => {
    try {
        const wf = await getWorkflow();
        // Save full workflow to file for analysis
        fs.writeFileSync(
            path.resolve(__dirname, 'workflow_dump.json'),
            JSON.stringify(wf, null, 2)
        );
        console.log('Workflow saved to scripts/workflow_dump.json');
        console.log('\nNodes in workflow:');
        wf.nodes.forEach((node, i) => {
            console.log(`${i + 1}. ${node.name} (${node.type})`);
        });
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
})();
