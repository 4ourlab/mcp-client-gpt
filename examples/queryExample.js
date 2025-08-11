import { MCPClient } from '../src/index.js';

async function main() {
    var systemPrompt = `
        You are an intelligent assistant with access to tools. Use your knowledge and available tools to solve problems proactively. 

        For final responses, use JSON format:
        {
            "header": {
                "success": true|false,
                "usedTools": true|false,
                "message": "error description when success=false"
            },
            "result": {
                "your response content here"
            }
        }`;

    const mcpClient = new MCPClient(
        "your-openai-api-key",
        "gpt-model-name",
        3000,
        "./examples/mcpServer.json",
        systemPrompt
    );

    try {
        await mcpClient.connectToServers();
        const response = await mcpClient.processQuery("What's the weather in Sacramento?");
        console.log("\nResponse:\n" + response);
    } catch (error) {
        console.error("Error in main:", error);
    } finally {
        await mcpClient.cleanup();
        process.exit(0);
    }
}

main().catch(console.error); 