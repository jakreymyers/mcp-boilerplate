# MCP Tools API Reference

## Overview

Tools in MCP allow servers to expose executable functions that can be invoked by clients and used by LLMs to perform actions. They are similar to POST endpoints in REST APIs, designed to execute code or produce side effects.

## Tool Definition Structure

Each tool is defined with the following TypeScript interface:

```typescript
interface Tool {
  name: string;           // Unique identifier for the tool
  description?: string;   // Human-readable description
  inputSchema: {         // JSON Schema for the tool's parameters
    type: "object",
    properties: { ... },
    required?: string[]
  }
}
```

## Basic Tool Registration

### Simple Tool Example

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const server = new McpServer({
  name: "demo-server",
  version: "1.0.0"
});

server.registerTool("add", {
  title: "Addition Tool",
  description: "Add two numbers",
  inputSchema: { 
    a: z.number().describe("First number"),
    b: z.number().describe("Second number")
  }
}, async ({ a, b }) => ({
  content: [{ type: "text", text: String(a + b) }]
}));
```

### BMI Calculator Example

```typescript
server.registerTool("calculate-bmi", {
  title: "BMI Calculator",
  description: "Calculate Body Mass Index",
  inputSchema: { 
    weightKg: z.number().describe("Weight in kilograms"), 
    heightM: z.number().describe("Height in meters")
  }
}, async ({ weightKg, heightM }) => ({
  content: [{ 
    type: "text", 
    text: `BMI: ${(weightKg / (heightM * heightM)).toFixed(2)}` 
  }]
}));
```

## Advanced Tool Features

### Tool with Multiple Return Types

```typescript
server.registerTool("file-analyzer", {
  title: "File Analyzer",
  description: "Analyze file content and metadata",
  inputSchema: {
    filePath: z.string().describe("Path to the file to analyze")
  }
}, async ({ filePath }) => {
  try {
    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf-8');
    
    return {
      content: [
        { type: "text", text: `File size: ${stats.size} bytes` },
        { type: "text", text: `Content preview: ${content.slice(0, 100)}...` }
      ]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
});
```

## Tool Response Format

### Standard Response

```typescript
interface ToolResponse {
  content: Content[];     // Array of content items
  isError?: boolean;      // Indicates if this is an error response
}

interface Content {
  type: "text" | "image" | "resource";
  text?: string;          // For text content
  data?: string;          // For image content (base64)
  mimeType?: string;      // For image content
  resource?: {            // For resource links
    uri: string;
    name?: string;
    description?: string;
  };
}
```

### Error Handling in Tools

Tools should handle errors gracefully and return them within the response:

```typescript
server.registerTool("divide", {
  title: "Division Tool",
  description: "Divide two numbers",
  inputSchema: {
    dividend: z.number(),
    divisor: z.number()
  }
}, async ({ dividend, divisor }) => {
  if (divisor === 0) {
    return {
      content: [{ type: "text", text: "Error: Division by zero is not allowed" }],
      isError: true
    };
  }
  
  return {
    content: [{ type: "text", text: String(dividend / divisor) }]
  };
});
```

## Schema Validation with Zod

### Complex Schema Example

```typescript
const CreateUserSchema = z.object({
  name: z.string().min(1).describe("User's full name"),
  email: z.string().email().describe("Valid email address"),
  age: z.number().min(0).max(120).optional().describe("User's age"),
  tags: z.array(z.string()).default([]).describe("User tags"),
  metadata: z.record(z.string(), z.any()).optional().describe("Additional metadata")
});

server.registerTool("create-user", {
  title: "Create User",
  description: "Create a new user with validation",
  inputSchema: CreateUserSchema
}, async (input) => {
  // TypeScript automatically infers the correct types:
  // input.name is string
  // input.email is string  
  // input.age is number | undefined
  // input.tags is string[]
  // input.metadata is Record<string, any> | undefined
  
  return {
    content: [{ 
      type: "text", 
      text: `User created: ${input.name} (${input.email})` 
    }]
  };
});
```

## Tool Discovery and Introspection

### Listing Available Tools

Clients can discover available tools using the MCP protocol:

```typescript
// Client-side code to list tools
const toolsResponse = await client.request(
  { method: "tools/list" },
  ListToolsResultSchema
);

console.log("Available tools:", toolsResponse.tools);
```

### Tool Call Execution

```typescript
// Client-side code to call a tool
const result = await client.request({
  method: "tools/call",
  params: {
    name: "add",
    arguments: { a: 5, b: 3 }
  }
}, CallToolResultSchema);

console.log("Tool result:", result.content);
```

## Best Practices

### 1. Descriptive Schemas
Always provide descriptions for all schema fields:

```typescript
const schema = z.object({
  query: z.string().describe("Search query string"),
  limit: z.number().min(1).max(100).default(10).describe("Maximum number of results")
});
```

### 2. Error Handling
Return errors within the tool response, not as protocol-level errors:

```typescript
// ✅ Good - Error in tool response
return {
  content: [{ type: "text", text: "Invalid input provided" }],
  isError: true
};

// ❌ Bad - Protocol-level error
throw new McpError(ErrorCode.InvalidParams, "Invalid input");
```

### 3. Type Safety
Leverage TypeScript's type inference with Zod schemas:

```typescript
// Full type safety without duplicate interfaces
const schema = z.object({
  name: z.string(),
  count: z.number()
});

// TypeScript automatically knows the parameter types
async (params) => {
  // params.name is string
  // params.count is number
}
```

### 4. Resource Links
Return resource links when appropriate:

```typescript
return {
  content: [{
    type: "resource",
    resource: {
      uri: "file:///path/to/generated/report.pdf",
      name: "Analysis Report",
      description: "Detailed analysis results"
    }
  }]
};
```