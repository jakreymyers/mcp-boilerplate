/**
 * MCP Server Implementation
 * 
 * This module creates and configures the MCP server with tool handlers,
 * proper error handling, and STDIO transport for Claude Desktop integration.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  CallToolRequest,
  ListToolsRequest,
} from '@modelcontextprotocol/sdk/types.js';

import { toolRegistry } from './tools/index.js';
import { validateToolInput } from './utils/validation.js';
import { createMethodNotFoundError, createInternalError, isMcpError } from './utils/errors.js';

/**
 * Create and configure the MCP server
 * 
 * @returns Configured MCP server instance
 */
export function createServer(): Server {
  // Create server with metadata
  const server = new Server(
    {
      name: 'mcp-boilerplate',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {}, // IMPORTANT: Enable tools capability
      },
    }
  );

  // GOTCHA: Must register handlers before connecting
  setupToolHandlers(server);

  return server;
}

/**
 * Set up tool-related request handlers
 * 
 * @param server - MCP server instance
 */
function setupToolHandlers(server: Server): void {
  // Handle tool listing requests
  server.setRequestHandler(ListToolsRequestSchema, async (_request: ListToolsRequest) => {
    try {
      return {
        tools: toolRegistry.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    } catch (error) {
      console.error('Error listing tools:', error);
      throw createInternalError('Failed to list available tools', error);
    }
  });

  // Handle tool execution requests
  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    try {
      const { name, arguments: args } = request.params;

      // Find the requested tool
      const tool = toolRegistry.find(t => t.name === name);
      if (!tool) {
        throw createMethodNotFoundError(`Tool '${name}' not found`);
      }

      // Validate input parameters using the tool's schema
      const validatedParams = validateToolInput(tool.inputSchema, args);

      // Execute the tool with validated parameters
      return await tool.execute(validatedParams);

    } catch (error) {
      // Handle known MCP errors
      if (isMcpError(error)) {
        throw error;
      }

      // Log and wrap unexpected errors
      console.error(`Unexpected error executing tool '${request.params.name}':`, error);
      throw createInternalError(
        `Failed to execute tool '${request.params.name}'`,
        error
      );
    }
  });
}

/**
 * Connect server to STDIO transport
 * 
 * This is the standard transport for Claude Desktop integration.
 * The server will communicate via stdin/stdout.
 * 
 * @param server - MCP server instance
 */
export async function connectServer(server: Server): Promise<void> {
  try {
    // GOTCHA: Use STDIO transport for Claude Desktop compatibility
    const transport = new StdioServerTransport();
    
    // Connect server to transport
    await server.connect(transport);
    
    console.error('MCP server connected and ready'); // Use stderr for logging
  } catch (error) {
    console.error('Failed to connect MCP server:', error);
    throw error;
  }
}

/**
 * Create and start the MCP server
 * 
 * Convenience function that creates server and connects transport
 * 
 * @returns Promise that resolves when server is connected
 */
export async function startServer(): Promise<Server> {
  const server = createServer();
  await connectServer(server);
  return server;
}