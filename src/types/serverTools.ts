import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ChatCompletionTool } from "openai/resources/chat/completions";

export interface ServerConfig {
    command: string;
    args: string[];
}

export interface MCPConfig {
    mcpServers: {
        [serverName: string]: ServerConfig;
    };
}

export interface MCPConnection {
    serverName: string;
    client: Client;
    transport: StdioClientTransport;
    tools: ChatCompletionTool[];
}