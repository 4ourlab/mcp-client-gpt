import { MCPClient } from '../src/index.js';

async function main() {  
    const mcpClient = new MCPClient(
        "your-openai-api-key",
        "gpt-model-name",
        1000,
        "./examples/mcpServer.json"
    );

    try {
        await mcpClient.connectToServers();
        await mcpClient.chatLoop();
    } finally {
        await mcpClient.cleanup();
        process.exit(0);
    }
}

main().catch(console.error);