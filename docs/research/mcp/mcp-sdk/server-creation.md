# MCP Server Creation Guide

## Overview

Creating MCP servers with the TypeScript SDK involves setting up the server instance, registering capabilities (tools, resources, prompts), and connecting to a transport layer for communication.

## Basic Server Setup

### Installation and Requirements

```bash
npm install @modelcontextprotocol/sdk
```

**Requirements**: Node.js v18.x or higher

### Minimal Server Example

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Create server instance
const server = new McpServer({
  name: "my-first-server",
  version: "1.0.0"
});

// Connect to stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);

console.log("MCP server running on stdio");
```

## Server Configuration

### Advanced Server Options

```typescript
const server = new McpServer({
  name: "advanced-server",
  version: "2.1.0",
  capabilities: {
    tools: {
      listChanged: true    // Support tool list change notifications
    },
    resources: {
      subscribe: true,     // Support resource subscriptions
      listChanged: true    // Support resource list change notifications
    },
    prompts: {
      listChanged: true    // Support prompt list change notifications
    },
    experimental: {
      customFeature: true  // Experimental features
    }
  }
});
```

## Transport Configuration

### Stdio Transport

Standard Input/Output transport for local communication:

```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const transport = new StdioServerTransport();
await server.connect(transport);
```

### HTTP Transport (Conceptual)

For remote server communication:

```typescript
// Note: Exact HTTP transport implementation may vary
import { HttpServerTransport } from "@modelcontextprotocol/sdk/server/http.js";

const transport = new HttpServerTransport({
  port: 8080,
  host: "0.0.0.0",
  cors: {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }
});

await server.connect(transport);
console.log("MCP server running on http://localhost:8080");
```

## Registering Tools

### Simple Tool Registration

```typescript
import { z } from "zod";

server.registerTool("echo", {
  title: "Echo Tool",
  description: "Echo back the input message",
  inputSchema: {
    message: z.string().describe("Message to echo back")
  }
}, async ({ message }) => ({
  content: [{ type: "text", text: `Echo: ${message}` }]
}));
```

### Complex Tool with Validation

```typescript
const FileProcessorSchema = z.object({
  filePath: z.string().describe("Path to the file to process"),
  operation: z.enum(["read", "count", "analyze"]).describe("Operation to perform"),
  options: z.object({
    encoding: z.string().default("utf-8").describe("File encoding"),
    maxSize: z.number().max(10485760).default(1048576).describe("Max file size in bytes")
  }).optional()
});

server.registerTool("file-processor", {
  title: "File Processor",
  description: "Process files with various operations",
  inputSchema: FileProcessorSchema
}, async ({ filePath, operation, options = {} }) => {
  try {
    const { encoding = "utf-8", maxSize = 1048576 } = options;
    
    // Check file size
    const stats = await fs.stat(filePath);
    if (stats.size > maxSize) {
      return {
        content: [{ type: "text", text: `File too large: ${stats.size} bytes` }],
        isError: true
      };
    }
    
    switch (operation) {
      case "read":
        const content = await fs.readFile(filePath, encoding);
        return { content: [{ type: "text", text: content }] };
        
      case "count":
        const text = await fs.readFile(filePath, encoding);
        const lines = text.split('\n').length;
        const words = text.split(/\s+/).length;
        const chars = text.length;
        
        return {
          content: [{
            type: "text",
            text: `Lines: ${lines}, Words: ${words}, Characters: ${chars}`
          }]
        };
        
      case "analyze":
        const analysisContent = await fs.readFile(filePath, encoding);
        const analysis = {
          size: stats.size,
          lines: analysisContent.split('\n').length,
          isEmpty: analysisContent.trim().length === 0,
          encoding: encoding
        };
        
        return {
          content: [{ type: "text", text: JSON.stringify(analysis, null, 2) }]
        };
        
      default:
        return {
          content: [{ type: "text", text: "Unknown operation" }],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
});
```

## Registering Resources

### Static Resource Registration

```typescript
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "file:///app/config.json",
      name: "Application Configuration",
      description: "Main application configuration file",
      mimeType: "application/json"
    },
    {
      uri: "file:///app/logs/server.log",
      name: "Server Logs",
      description: "Current server log file",
      mimeType: "text/plain"
    }
  ]
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  switch (uri) {
    case "file:///app/config.json":
      const config = await fs.readFile("./config.json", "utf-8");
      return {
        contents: [{
          uri,
          mimeType: "application/json",
          text: config
        }]
      };
      
    case "file:///app/logs/server.log":
      const logs = await fs.readFile("./logs/server.log", "utf-8");
      return {
        contents: [{
          uri,
          mimeType: "text/plain",
          text: logs
        }]
      };
      
    default:
      throw new McpError(
        ErrorCode.ResourceNotFound,
        `Resource not found: ${uri}`
      );
  }
});
```

### Dynamic Resource Registration

```typescript
import { glob } from "glob";

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  // Dynamically find all markdown files
  const markdownFiles = await glob("**/*.md", { cwd: "./docs" });
  
  const resources = markdownFiles.map(file => ({
    uri: `file:///docs/${file}`,
    name: file.replace(/\.md$/, "").replace(/[-_]/g, " "),
    description: `Documentation: ${file}`,
    mimeType: "text/markdown"
  }));
  
  return { resources };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  if (!uri.startsWith("file:///docs/")) {
    throw new McpError(
      ErrorCode.ResourceNotFound,
      "Only docs resources are supported"
    );
  }
  
  const filePath = uri.replace("file:///docs/", "./docs/");
  
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return {
      contents: [{
        uri,
        mimeType: "text/markdown",
        text: content
      }]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.ResourceNotFound,
      `Could not read resource: ${error.message}`
    );
  }
});
```

## Registering Prompts

### Simple Prompt Registration

```typescript
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: "code-review",
      description: "Review code for best practices and potential issues",
      arguments: [
        {
          name: "code",
          description: "Code to review",
          required: true
        },
        {
          name: "language",
          description: "Programming language",
          required: false
        }
      ]
    }
  ]
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === "code-review") {
    const code = args?.code || "";
    const language = args?.language || "unknown";
    
    return {
      description: "Code review prompt",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please review this ${language} code for best practices, potential bugs, and improvements:\n\n\`\`\`${language}\n${code}\n\`\`\``
          }
        }
      ]
    };
  }
  
  throw new McpError(
    ErrorCode.InvalidParams,
    `Unknown prompt: ${name}`
  );
});
```

## Complete Server Example

### Full-Featured Server

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  McpError,
  ErrorCode
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import * as fs from "fs/promises";

class ComprehensiveServer {
  private server: McpServer;
  
  constructor() {
    this.server = new McpServer({
      name: "comprehensive-mcp-server",
      version: "1.0.0",
      capabilities: {
        tools: { listChanged: true },
        resources: { subscribe: true, listChanged: true },
        prompts: { listChanged: true }
      }
    });
    
    this.setupTools();
    this.setupResources();
    this.setupPrompts();
  }
  
  private setupTools() {
    // Math calculator tool
    this.server.registerTool("calculate", {
      title: "Calculator",
      description: "Perform basic mathematical operations",
      inputSchema: {
        expression: z.string().describe("Mathematical expression to evaluate")
      }
    }, async ({ expression }) => {
      try {
        // Simple evaluation (in production, use a safe evaluator)
        const result = eval(expression);
        return {
          content: [{ type: "text", text: `Result: ${result}` }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true
        };
      }
    });
    
    // File system tool
    this.server.registerTool("list-files", {
      title: "List Files",
      description: "List files in a directory",
      inputSchema: {
        path: z.string().describe("Directory path to list"),
        pattern: z.string().optional().describe("Optional glob pattern")
      }
    }, async ({ path, pattern }) => {
      try {
        const files = await fs.readdir(path);
        const filteredFiles = pattern ? 
          files.filter(f => f.includes(pattern)) : files;
          
        return {
          content: [{
            type: "text",
            text: `Files in ${path}:\n${filteredFiles.join('\n')}`
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true
        };
      }
    });
  }
  
  private setupResources() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "config://app",
          name: "Application Configuration",
          description: "Current application configuration"
        }
      ]
    }));
    
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      if (uri === "config://app") {
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify({
              name: "comprehensive-mcp-server",
              version: "1.0.0",
              features: ["tools", "resources", "prompts"]
            }, null, 2)
          }]
        };
      }
      
      throw new McpError(ErrorCode.ResourceNotFound, `Unknown resource: ${uri}`);
    });
  }
  
  private setupPrompts() {
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: "explain-code",
          description: "Explain how code works",
          arguments: [
            { name: "code", description: "Code to explain", required: true },
            { name: "level", description: "Explanation level (beginner/intermediate/advanced)", required: false }
          ]
        }
      ]
    }));
    
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      if (name === "explain-code") {
        const code = args?.code || "";
        const level = args?.level || "intermediate";
        
        return {
          description: "Code explanation prompt",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Please explain this code at a ${level} level:\n\n\`\`\`\n${code}\n\`\`\`\n\nInclude: what it does, how it works, and any important concepts.`
              }
            }
          ]
        };
      }
      
      throw new McpError(ErrorCode.InvalidParams, `Unknown prompt: ${name}`);
    });
  }
  
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log("Comprehensive MCP server started");
  }
}

// Start the server
const server = new ComprehensiveServer();
server.start().catch(console.error);
```

## Development Best Practices

### 1. Error Handling

```typescript
// Always handle errors gracefully
server.registerTool("safe-tool", {
  title: "Safe Tool",
  inputSchema: { data: z.string() }
}, async ({ data }) => {
  try {
    const result = await riskyOperation(data);
    return { content: [{ type: "text", text: result }] };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Operation failed: ${error.message}` }],
      isError: true
    };
  }
});
```

### 2. Validation

```typescript
// Use comprehensive Zod schemas
const UserSchema = z.object({
  name: z.string().min(1).max(100).describe("User name"),
  email: z.string().email().describe("Valid email address"),
  age: z.number().min(0).max(150).optional().describe("User age")
});
```

### 3. Resource Management

```typescript
// Implement proper cleanup
process.on('SIGINT', async () => {
  console.log('Shutting down MCP server...');
  await server.close();
  process.exit(0);
});
```

This comprehensive guide covers all aspects of creating robust MCP servers with the TypeScript SDK, from basic setup to advanced features and best practices.