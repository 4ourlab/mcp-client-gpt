import OpenAI from "openai";
import { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import readline from "readline/promises";
import fs from "fs/promises";
import { MCPConfig, MCPConnection, ServerConfig } from "../types/serverTools";

export class MCPClient {
    private connections: Map<string, MCPConnection> = new Map();
    private openai: OpenAI;
    private allTools: ChatCompletionTool[] = [];
    private model: string;
    private maxOutputTokens: number;
    private serverConfigPath: string;
    private systemPrompt: string;

    constructor(apiKey: string, model: string, maxOutputTokens: number, serverConfigPath: string, systemPrompt: string = "") {
        /**
         * Constructor for MCPClient
         * @param apiKey - The API key for the OpenAI API
         * @param model - The model to use for the OpenAI API
         * @param maxOutputTokens - The maximum number of tokens to output
         * @param serverConfigPath - The path to the server configuration file (json)
         * @param systemPrompt - The system prompt to use for the OpenAI API. Optional
         */
        this.openai = new OpenAI({ apiKey: apiKey });
        this.model = model;
        this.serverConfigPath = serverConfigPath;
        this.systemPrompt = systemPrompt;
        this.maxOutputTokens = maxOutputTokens;
    }

    async connectToServers() {
        /**
         * Connect to multiple MCP servers using the serverConfigPath
         */
        try {
            const configData = await fs.readFile(this.serverConfigPath, 'utf-8');
            const config: MCPConfig = JSON.parse(configData);

            for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
                try {
                    await this.connectToServer(serverName, serverConfig);
                } catch (error) {
                    throw new Error(`Failed to connect to server ${serverName}: ${error}`);
                }
            }
        } catch (error) {
            throw new Error(`Failed to read configuration file: ${error}`);
        }
    }

    private async connectToServer(serverName: string, serverConfig: ServerConfig) {
        /**
         * Connect to a single MCP server
         */
        try {
            const client = new Client({
                name: `mcp-client-${serverName}`,
                version: "1.0.0"
            });

            const transport = new StdioClientTransport({
                command: serverConfig.command,
                args: serverConfig.args,
            });

            client.connect(transport);

            const toolsResult = await client.listTools();
            const tools: ChatCompletionTool[] = toolsResult.tools.map((tool) => ({
                type: "function",
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.inputSchema,
                },
            }));

            this.connections.set(serverName, {
                serverName,
                client,
                transport,
                tools,
            });

            this.allTools.push(...tools);
        } catch (error) {
            throw new Error(`Error connecting to server ${serverName}: ${error}`);
        }
    }

    async processQuery(query: string) {
        /**
         * Process a query using GPT and available tools from all servers
         *
         * @param query - The user's input query
         * @returns Processed response as a string
         */
        const messages: ChatCompletionMessageParam[] = [
            {
                role: "user",
                content: query,
            },
        ];

        try {
            // Initial GPT API call
            const response = await this.openai.chat.completions.create({
                model: this.model,
                max_completion_tokens: this.maxOutputTokens,
                messages: this.systemPrompt ? [
                    { role: "system", content: this.systemPrompt },
                    ...messages
                ] : messages,
                tools: this.allTools.length > 0 ? this.allTools : undefined,
                tool_choice: this.allTools.length > 0 ? "auto" : undefined,
            });

            const assistantMessage = response.choices[0]?.message;
            if (!assistantMessage) {
                throw new Error("No response from GPT");
            }

            // Add assistant message to conversation
            messages.push(assistantMessage);

            // Process tool calls if any
            if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
                const toolResults: ChatCompletionMessageParam[] = [];

                for (const toolCall of assistantMessage.tool_calls) {
                    const toolName = toolCall.function.name;
                    const toolArgs = JSON.parse(toolCall.function.arguments);

                    const serverConnection = this.findToolServer(toolName);
                    if (!serverConnection) {
                        throw new Error(`Tool ${toolName} not found in any connected server`);
                    }

                    const result = await serverConnection.client.callTool({
                        name: toolName,
                        arguments: toolArgs,
                    });

                    toolResults.push({
                        role: "tool",
                        content: result.content as string,
                        tool_call_id: toolCall.id,
                    });
                }

                // Add tool results to conversation
                messages.push(...toolResults);

                // Get final response from GPT
                const finalResponse = await this.openai.chat.completions.create({
                    model: this.model,
                    max_completion_tokens: this.maxOutputTokens,
                    messages: this.systemPrompt ? [
                        { role: "system", content: this.systemPrompt },
                        ...messages
                    ] : messages,
                });

                if (finalResponse.choices[0]?.finish_reason === "length") {
                    return JSON.stringify({
                        finish_reason : "length",
                        description : "The maximum number of tokens specified in the request was reached.",
                        usage : finalResponse.usage
                    });
                }

                return finalResponse.choices[0]?.message?.content || "";
            }

            return assistantMessage.content || "";
        } catch (error) {
            throw new Error(`Error processing query: ${error}`);
        }
    }

    private findToolServer(toolName: string): MCPConnection | null {
        /**
         * Find the server that contains a specific tool
         * 
         * @param toolName - Name of the tool to find
         * @returns Connection info, or null if not found
         */
        for (const connection of this.connections.values()) {
            const tool = connection.tools.find(t => t.function?.name === toolName);
            if (tool) {
                return connection;
            }
        }
        return null;
    }

    async chatLoop() {
        /**
         * Run an interactive chat loop
         */
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        try {
            console.log("\nChat started!\nType your queries or 'quit' to exit.");

            while (true) {
                const message = await rl.question("\nQuery: ");
                if (message.toLowerCase() === "quit") {
                    break;
                }
                const response = await this.processQuery(message);
                console.log("\nResponse: " + response);
            }
        } catch (error) {
            console.error("Error in chat loop:", error);
        } finally {
            rl.close();
        }
    }

    async cleanup() {
        /**
         * Clean up all connections
         */
        for (const connection of this.connections.values()) {
            await connection.client.close();
        }
        this.connections.clear();
    }
}