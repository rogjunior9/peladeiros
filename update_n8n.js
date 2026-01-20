const fs = require('fs');
const https = require('https');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ZDJkMGY0NS02MzgyLTQ0YzAtOTBjMy1kMzcxNzk2ZjdkNWIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY3NzUzMzIzfQ.fMRptfXDQlmJ_sj9-TEsK5SYEXYkeZnBHL4EzRoLJRI";
const BASE_URL = "https://n8n.rogeriojunior.com.br/api/v1";
const WORKFLOW_FILE = "n8n_peladeiros.json";

function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            method: method,
            headers: {
                'X-N8N-API-KEY': API_KEY,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(`${BASE_URL}${path}`, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(JSON.parse(data));
                    } else {
                        reject({ statusCode: res.statusCode, body: data });
                    }
                } catch (e) {
                    console.log("Raw response:", data);
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function main() {
    try {
        console.log("Reading local workflow file...");
        const localWorkflow = JSON.parse(fs.readFileSync(WORKFLOW_FILE, 'utf8'));
        const workflowName = localWorkflow.name;

        console.log(`Searching for workflow: "${workflowName}"...`);
        const listResponse = await request('GET', '/workflows');
        const workflows = listResponse.data;

        const existingWorkflow = workflows.find(w => w.name === workflowName);

        if (existingWorkflow) {
            console.log(`Found existing workflow with ID: ${existingWorkflow.id}`);
            console.log("Updating workflow...");

            // We generally update nodes and connections. 
            // N8N API expects { nodes: [...], connections: {...}, settings: {...}, name: ... }
            await request('PUT', `/workflows/${existingWorkflow.id}`, {
                name: localWorkflow.name,
                nodes: localWorkflow.nodes,
                connections: localWorkflow.connections,
                settings: localWorkflow.settings
            });
            console.log("Workflow updated successfully!");
        } else {
            console.log("Workflow not found. Creating new one...");
            const newWorkflow = await request('POST', '/workflows', {
                name: localWorkflow.name,
                nodes: localWorkflow.nodes,
                connections: localWorkflow.connections,
                settings: localWorkflow.settings
            });
            console.log(`Workflow created successfully! ID: ${newWorkflow.id}`);
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

main();
