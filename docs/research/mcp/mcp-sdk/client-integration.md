# MCP Client Integration Guide

## Overview

MCP clients connect to MCP servers to access tools, resources, and prompts. The TypeScript SDK provides comprehensive client functionality for integrating MCP capabilities into applications.

## Basic Client Setup

### Installation and Imports

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { 
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
```

### Simple Client Connection

```typescript
// Create client instance
const client = new Client({
  name: "my-mcp-client",
  version: "1.0.0"
});

// Connect via stdio transport
const transport = new StdioClientTransport({
  command: "node",
  args: ["path/to/server.js"]
});

await client.connect(transport);
console.log("Connected to MCP server");
```

## Transport Configuration

### Stdio Transport

Connect to local servers running as subprocesses:

```typescript
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "python",               // Server command
  args: ["-m", "my_mcp_server"],  // Command arguments
  env: {                          // Environment variables
    ...process.env,
    MCP_DEBUG: "1"
  }
});

await client.connect(transport);
```

### HTTP Transport (Conceptual)

Connect to remote servers:

```typescript
// Note: Exact HTTP transport implementation may vary
import { HttpClientTransport } from "@modelcontextprotocol/sdk/client/http.js";

const transport = new HttpClientTransport({
  url: "https://api.example.com/mcp",
  headers: {
    "Authorization": "Bearer your-token-here",
    "X-Client-Version": "1.0.0"
  },
  timeout: 30000  // 30 second timeout
});

await client.connect(transport);
```

## Working with Resources

### Listing Available Resources

```typescript
try {
  const resourcesResponse = await client.request(
    { method: "resources/list" },
    ListResourcesRequestSchema
  );
  
  console.log("Available resources:");
  resourcesResponse.resources.forEach(resource => {
    console.log(`- ${resource.name}: ${resource.uri}`);
    console.log(`  Description: ${resource.description}`);
    console.log(`  MIME Type: ${resource.mimeType}`);
  });
} catch (error) {
  console.error("Failed to list resources:", error);
}
```

### Reading Resource Content

```typescript
async function readResource(uri: string) {
  try {
    const response = await client.request({
      method: "resources/read",
      params: { uri }
    }, ReadResourceRequestSchema);
    
    response.contents.forEach(content => {
      console.log(`Content for ${content.uri}:`);
      console.log(`MIME Type: ${content.mimeType}`);
      
      if (content.text) {
        console.log("Text content:", content.text);
      }
      
      if (content.blob) {
        console.log("Binary content length:", content.blob.length);
      }
    });
    
    return response.contents;
  } catch (error) {
    console.error(`Failed to read resource ${uri}:`, error);
    throw error;
  }
}

// Usage
await readResource("file:///path/to/document.txt");
```

### Resource Pagination

```typescript
async function getAllResources() {
  const allResources = [];
  let cursor = undefined;
  
  do {
    const response = await client.request({
      method: "resources/list",
      params: cursor ? { cursor } : {}
    }, ListResourcesRequestSchema);
    
    allResources.push(...response.resources);
    cursor = response.nextCursor;
  } while (cursor);
  
  return allResources;
}
```

## Working with Tools

### Listing Available Tools

```typescript
async function listTools() {
  try {
    const toolsResponse = await client.request(
      { method: "tools/list" },
      ListToolsRequestSchema
    );
    
    console.log("Available tools:");
    toolsResponse.tools.forEach(tool => {
      console.log(`- ${tool.name}: ${tool.description}`);
      
      if (tool.inputSchema) {
        console.log("  Input schema:", JSON.stringify(tool.inputSchema, null, 2));
      }
    });
    
    return toolsResponse.tools;
  } catch (error) {
    console.error("Failed to list tools:", error);
    throw error;
  }
}
```

### Calling Tools

```typescript
async function callTool(name: string, arguments: Record<string, any>) {
  try {
    const response = await client.request({
      method: "tools/call",
      params: {
        name,
        arguments
      }
    }, CallToolRequestSchema);
    
    if (response.isError) {
      console.error(`Tool ${name} returned an error:`, response.content);
      return null;
    }
    
    console.log(`Tool ${name} result:`);
    response.content.forEach(content => {
      switch (content.type) {
        case "text":
          console.log("Text:", content.text);
          break;
        case "image":
          console.log("Image:", content.mimeType, `${content.data.length} bytes`);
          break;
        case "resource":
          console.log("Resource:", content.resource.uri);
          break;
      }
    });
    
    return response.content;
  } catch (error) {
    console.error(`Failed to call tool ${name}:`, error);
    throw error;
  }
}

// Usage examples
await callTool("calculate", { expression: "2 + 2" });
await callTool("search", { query: "MCP documentation", limit: 5 });
```

### Type-Safe Tool Calling

```typescript
// Define tool parameter types
interface CalculateParams {
  expression: string;
}

interface SearchParams {
  query: string;
  limit?: number;
  filters?: string[];
}

// Type-safe tool caller
async function callTypedTool<T>(
  name: string, 
  params: T
): Promise<Content[] | null> {
  return callTool(name, params as Record<string, any>);
}

// Usage with type safety
const calcResult = await callTypedTool<CalculateParams>("calculate", {
  expression: "10 * 5"
});

const searchResult = await callTypedTool<SearchParams>("search", {
  query: "TypeScript MCP",
  limit: 10,
  filters: ["documentation", "tutorial"]
});
```

## Working with Prompts

### Listing Available Prompts

```typescript
async function listPrompts() {
  try {
    const promptsResponse = await client.request(
      { method: "prompts/list" },
      ListPromptsRequestSchema
    );
    
    console.log("Available prompts:");
    promptsResponse.prompts.forEach(prompt => {
      console.log(`- ${prompt.name}: ${prompt.description}`);
      
      if (prompt.arguments) {
        console.log("  Arguments:");
        prompt.arguments.forEach(arg => {
          const required = arg.required ? " (required)" : " (optional)";
          console.log(`    - ${arg.name}${required}: ${arg.description}`);
        });
      }
    });
    
    return promptsResponse.prompts;
  } catch (error) {
    console.error("Failed to list prompts:", error);
    throw error;
  }
}
```

### Getting Prompt Content

```typescript
async function getPrompt(name: string, arguments?: Record<string, any>) {
  try {
    const response = await client.request({
      method: "prompts/get",
      params: {
        name,
        arguments
      }
    }, GetPromptRequestSchema);
    
    console.log(`Prompt: ${name}`);
    console.log(`Description: ${response.description}`);
    console.log("Messages:");
    
    response.messages.forEach((message, index) => {
      console.log(`  ${index + 1}. Role: ${message.role}`);
      console.log(`     Content: ${message.content.text}`);
    });
    
    return response;
  } catch (error) {
    console.error(`Failed to get prompt ${name}:`, error);
    throw error;
  }
}

// Usage
await getPrompt("code-review", {
  code: "function hello() { console.log('Hello, World!'); }",
  language: "javascript"
});
```

## Advanced Client Features

### Connection Management

```typescript
class ManagedMcpClient {
  private client: Client;
  private transport: Transport;
  private connected: boolean = false;
  
  constructor(private config: {
    name: string;
    version: string;
    serverCommand: string;
    serverArgs: string[];
  }) {
    this.client = new Client({
      name: config.name,
      version: config.version
    });
  }
  
  async connect(): Promise<void> {
    if (this.connected) return;
    
    this.transport = new StdioClientTransport({
      command: this.config.serverCommand,
      args: this.config.serverArgs
    });
    
    await this.client.connect(this.transport);
    this.connected = true;
    console.log("MCP client connected");
  }
  
  async disconnect(): Promise<void> {
    if (!this.connected) return;
    
    await this.client.close();
    this.connected = false;
    console.log("MCP client disconnected");
  }
  
  async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }
  
  async safeRequest<T>(request: any, schema: any): Promise<T | null> {
    try {
      await this.ensureConnected();
      return await this.client.request(request, schema);
    } catch (error) {
      console.error("Request failed:", error);
      return null;
    }
  }
}

// Usage
const managedClient = new ManagedMcpClient({
  name: "my-app",
  version: "1.0.0",
  serverCommand: "node",
  serverArgs: ["./my-server.js"]
});

const resources = await managedClient.safeRequest(
  { method: "resources/list" },
  ListResourcesRequestSchema
);
```

### Error Handling and Retry Logic

```typescript
class RobustMcpClient {
  private client: Client;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;
  
  constructor(client: Client) {
    this.client = client;
  }
  
  async requestWithRetry<T>(
    request: any, 
    schema: any, 
    retries: number = this.maxRetries
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await this.client.request(request, schema);
      } catch (error) {
        console.warn(`Attempt ${attempt} failed:`, error);
        
        if (attempt === retries) {
          throw error;
        }
        
        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error("All retry attempts exhausted");
  }
  
  async callToolWithFallback(
    primaryTool: string,
    fallbackTool: string,
    params: Record<string, any>
  ) {
    try {
      return await this.requestWithRetry({
        method: "tools/call",
        params: { name: primaryTool, arguments: params }
      }, CallToolRequestSchema);
    } catch (error) {
      console.warn(`Primary tool ${primaryTool} failed, trying fallback ${fallbackTool}`);
      
      return await this.requestWithRetry({
        method: "tools/call",
        params: { name: fallbackTool, arguments: params }
      }, CallToolRequestSchema);
    }
  }
}
```

### Event Handling and Notifications

```typescript
// Handle server notifications
client.onNotification("notifications/resources/updated", (notification) => {
  console.log("Resource updated:", notification.params.uri);
  // Refresh resource cache or update UI
});

client.onNotification("notifications/tools/list_changed", () => {
  console.log("Tool list changed, refreshing...");
  // Re-fetch tool list
});

// Handle connection events
client.onClose(() => {
  console.log("Connection closed");
  // Implement reconnection logic
});

client.onError((error) => {
  console.error("Client error:", error);
  // Handle connection errors
});
```

## Complete Client Application Example

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

class McpClientApp {
  private client: Client;
  private transport: StdioClientTransport;
  
  constructor() {
    this.client = new Client({
      name: "mcp-client-app",
      version: "1.0.0"
    });
    
    this.transport = new StdioClientTransport({
      command: "node",
      args: ["./server.js"]
    });
  }
  
  async initialize() {
    await this.client.connect(this.transport);
    console.log("MCP client initialized");
    
    // List all capabilities
    await this.discoverCapabilities();
  }
  
  async discoverCapabilities() {
    console.log("\n=== Discovering Server Capabilities ===");
    
    // Discover resources
    const resources = await this.client.request(
      { method: "resources/list" },
      ListResourcesRequestSchema
    );
    console.log(`Found ${resources.resources.length} resources`);
    
    // Discover tools
    const tools = await this.client.request(
      { method: "tools/list" },
      ListToolsRequestSchema
    );
    console.log(`Found ${tools.tools.length} tools`);
    
    // Discover prompts
    const prompts = await this.client.request(
      { method: "prompts/list" },
      ListPromptsRequestSchema
    );
    console.log(`Found ${prompts.prompts.length} prompts`);
  }
  
  async runDemo() {
    // Demo: Read a resource
    try {
      const resource = await this.client.request({
        method: "resources/read",
        params: { uri: "config://app" }
      }, ReadResourceRequestSchema);
      
      console.log("\nResource content:", resource.contents[0].text);
    } catch (error) {
      console.log("No demo resource available");
    }
    
    // Demo: Call a tool
    try {
      const result = await this.client.request({
        method: "tools/call",
        params: {
          name: "calculate",
          arguments: { expression: "2 + 2" }
        }
      }, CallToolRequestSchema);
      
      console.log("\nTool result:", result.content[0].text);
    } catch (error) {
      console.log("No demo tool available");
    }
  }
  
  async shutdown() {
    await this.client.close();
    console.log("MCP client shut down");
  }
}

// Run the application
async function main() {
  const app = new McpClientApp();
  
  try {
    await app.initialize();
    await app.runDemo();
  } catch (error) {
    console.error("Application error:", error);
  } finally {
    await app.shutdown();
  }
}

main().catch(console.error);
```

This comprehensive guide covers all aspects of MCP client integration, from basic setup to advanced features like error handling, retry logic, and event management.