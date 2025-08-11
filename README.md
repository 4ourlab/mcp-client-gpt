# @4ourlab/mcp-client-gpt

A MCP (Model Context Protocol) implementation for OpenAI GPT models that allows connecting and using multiple MCP servers through OpenAI's GPT API.

This implementation is based on the official [Model Context Protocol documentation](https://modelcontextprotocol.io/).

## Features

- 🔗 Connect to multiple MCP servers
- 🤖 Integration with OpenAI GPT API
- 📝 Support for custom system prompts
- 🔧 Complete TypeScript interface
- 🛠️ Included usage examples
- ⚙️ Configurable token limits

## Supported Models

This client has been tested with the following GPT models:
- `gpt-5` (GPT-5)
- `gpt-5-mini` (GPT-5 Mini)
- `gpt-5-nano` (GPT-5 Nano)

## Installation

```bash
npm install @4ourlab/mcp-client-gpt
```

## Basic Usage

```javascript
import { MCPClient } from '@4ourlab/mcp-client-gpt';

const mcpClient = new MCPClient(
    "your-openai-api-key",
    "gpt-5", // or any other supported model
    1000, // maxOutputTokens
    "./examples/mcpServer.json",
    "Optional system prompt"
);

try {
    await mcpClient.connectToServers();
    const response = await mcpClient.processQuery("Your query here");
    console.log(response);
} finally {
    await mcpClient.cleanup();
}
```

## MCP Server Configuration

Create an `mcpServer.json` file with your server configuration:

```json
{
    "mcpServers": {
        "weather": {
            "command": "node",
            "args": ["/path/to/mcpserver-weather/build/index.js"]
        },
        "mssql": {
            "command": "dotnet",
            "args": ["run", "--project", "/path/to/mcpserver-mssql.csproj"]
        }
    }
}
```

## Examples

### Example 1: Interactive Chat

```javascript
import { MCPClient } from '@4ourlab/mcp-client-gpt';

async function main() {
    const mcpClient = new MCPClient(
        "your-openai-api-key",
        "gpt-5",
        1000, // maxOutputTokens
        "./examples/mcpServer.json",
        "" // systemPrompt (optional)
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
```

### Example 2: Query Processing with JSON Response

```javascript
import { MCPClient } from '@4ourlab/mcp-client-gpt';

async function main() {
    const systemPrompt = `
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
        "gpt-5",
        3000, // maxOutputTokens
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
```

## API

### MCPClient

#### Constructor
```javascript
new MCPClient(
    apiKey: string, 
    model: string, 
    maxOutputTokens: number, 
    serverConfigPath: string, 
    systemPrompt?: string
)
```

**Parameters:**
- `apiKey`: Your OpenAI API key
- `model`: The GPT model to use (e.g., "gpt-5", "gpt-5-mini", "gpt-5-nano")
- `maxOutputTokens`: Maximum number of tokens for the response
- `serverConfigPath`: Path to the MCP server configuration JSON file
- `systemPrompt`: Optional system prompt to guide the model's behavior

#### Methods

- `connectToServers()`: Connect to all configured MCP servers
- `processQuery(query: string)`: Process a query using available servers
- `chatLoop()`: Start an interactive chat loop
- `cleanup()`: Clean up connections and resources

## Dependencies

- `openai`: Official OpenAI API client
- `@modelcontextprotocol/sdk`: Official MCP SDK

## Development

### Building the project

```bash
npm run build
```

### Development mode

```bash
npm run dev
```

## License

MIT 