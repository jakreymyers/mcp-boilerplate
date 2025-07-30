# MCP TypeScript Types and Interfaces

## Overview

The MCP TypeScript SDK provides comprehensive type definitions for all protocol components, ensuring type safety throughout your MCP implementation. The schema is defined in TypeScript first and made available as JSON Schema for wider compatibility.

## Core Type Definitions

### Server Configuration

```typescript
interface ServerOptions {
  name: string;           // Server identifier
  version: string;        // Server version
  capabilities?: {        // Optional server capabilities
    experimental?: Record<string, any>;
    tools?: {
      listChanged?: boolean;
    };
    resources?: {
      subscribe?: boolean;
      listChanged?: boolean;
    };
    prompts?: {
      listChanged?: boolean;
    };
  };
}

// Usage
const server = new McpServer({
  name: "my-server",
  version: "1.0.0"
});
```

### Resource Types

```typescript
interface Resource {
  uri: string;              // Unique resource identifier
  name?: string;            // Human-readable name
  description?: string;     // Resource description
  mimeType?: string;        // Content MIME type
}

interface ResourceContents {
  uri: string;              // Resource URI
  mimeType?: string;        // Content type
  text?: string;           // Text content
  blob?: string;           // Binary content (base64)
}

interface ResourceTemplate {
  uriTemplate: string;      // URI template pattern
  name?: string;           // Template name
  description?: string;    // Template description
  mimeType?: string;       // Expected content type
}
```

### Tool Types

```typescript
interface Tool {
  name: string;             // Unique tool identifier
  description?: string;     // Tool description
  inputSchema?: {           // JSON Schema for parameters
    type: "object";
    properties?: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

interface ToolCall {
  name: string;             // Tool name to call
  arguments?: Record<string, any>; // Tool arguments
}

interface ToolResult {
  content: Content[];       // Response content
  isError?: boolean;        // Error indicator
}
```

### Content Types

```typescript
type ContentType = "text" | "image" | "resource";

interface BaseContent {
  type: ContentType;
  annotations?: {
    audience?: ("human" | "assistant")[];
    priority?: number;
  };
}

interface TextContent extends BaseContent {
  type: "text";
  text: string;
}

interface ImageContent extends BaseContent {
  type: "image";
  data: string;             // Base64 encoded image
  mimeType: string;         // Image MIME type (e.g., "image/png")
}

interface ResourceContent extends BaseContent {
  type: "resource";
  resource: {
    uri: string;            // Resource URI
    name?: string;          // Resource name
    description?: string;   // Resource description
    mimeType?: string;      // Resource MIME type
  };
}

type Content = TextContent | ImageContent | ResourceContent;
```

### Prompt Types

```typescript
interface Prompt {
  name: string;             // Unique prompt identifier
  description?: string;     // Prompt description
  arguments?: PromptArgument[]; // Prompt parameters
}

interface PromptArgument {
  name: string;             // Argument name
  description?: string;     // Argument description
  required?: boolean;       // Whether argument is required
}

interface PromptMessage {
  role: "user" | "assistant" | "system";
  content: Content;
}

interface GetPromptResult {
  description?: string;     // Prompt description
  messages: PromptMessage[]; // Prompt messages
}
```

## Request/Response Types

### Resource Requests

```typescript
interface ListResourcesRequest {
  method: "resources/list";
  params?: {
    cursor?: string;        // Pagination cursor
  };
}

interface ListResourcesResult {
  resources: Resource[];
  nextCursor?: string;      // Next page cursor
}

interface ReadResourceRequest {
  method: "resources/read";
  params: {
    uri: string;            // Resource URI to read
  };
}

interface ReadResourceResult {
  contents: ResourceContents[];
}

interface ResourceUpdatedNotification {
  method: "notifications/resources/updated";
  params: {
    uri: string;            // Updated resource URI
  };
}
```

### Tool Requests

```typescript
interface ListToolsRequest {
  method: "tools/list";
  params?: {
    cursor?: string;
  };
}

interface ListToolsResult {
  tools: Tool[];
  nextCursor?: string;
}

interface CallToolRequest {
  method: "tools/call";
  params: {
    name: string;           // Tool name
    arguments?: Record<string, any>; // Tool arguments
  };
}

interface CallToolResult {
  content: Content[];
  isError?: boolean;
}
```

### Prompt Requests

```typescript
interface ListPromptsRequest {
  method: "prompts/list";
  params?: {
    cursor?: string;
  };
}

interface ListPromptsResult {
  prompts: Prompt[];
  nextCursor?: string;
}

interface GetPromptRequest {
  method: "prompts/get";
  params: {
    name: string;           // Prompt name
    arguments?: Record<string, any>; // Prompt arguments
  };
}
```

## Schema Validation Types

### Zod Integration

```typescript
import { z } from "zod";

// Define input schema with Zod
const ToolInputSchema = z.object({
  query: z.string().describe("Search query"),
  limit: z.number().min(1).max(100).default(10).describe("Result limit"),
  filters: z.array(z.string()).optional().describe("Optional filters")
});

// TypeScript automatically infers the type
type ToolInput = z.infer<typeof ToolInputSchema>;
// Equivalent to:
// type ToolInput = {
//   query: string;
//   limit: number;
//   filters?: string[] | undefined;
// }

// Tool handler with automatic type inference
server.registerTool("search", {
  title: "Search Tool",
  description: "Search with filters",
  inputSchema: ToolInputSchema
}, async (input) => {
  // input is fully typed as ToolInput
  console.log(input.query);     // string
  console.log(input.limit);     // number
  console.log(input.filters);   // string[] | undefined
  
  return {
    content: [{ type: "text", text: "Results..." }]
  };
});
```

## Transport Types

### Stdio Transport

```typescript
interface StdioTransportOptions {
  // No specific options for stdio transport
}

// Usage
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const transport = new StdioServerTransport();
await server.connect(transport);
```

### HTTP Transport

```typescript
interface HttpTransportOptions {
  port?: number;            // Server port (default: 3000)
  host?: string;           // Server host (default: "localhost")
  cors?: {                 // CORS configuration
    origin?: string | string[] | boolean;
    credentials?: boolean;
    methods?: string[];
    allowedHeaders?: string[];
  };
}

// Usage (conceptual - actual HTTP transport may vary)
const transport = new HttpServerTransport({
  port: 8080,
  host: "0.0.0.0",
  cors: {
    origin: true,
    credentials: true
  }
});
```

## Error Types

```typescript
enum ErrorCode {
  // JSON-RPC 2.0 Standard
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  
  // MCP Specific
  ResourceNotFound = -32002,
}

class McpError extends Error {
  constructor(code: ErrorCode, message: string, data?: any);
  
  code: ErrorCode;
  data?: any;
}

interface ErrorResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: any;
  };
}
```

## Generic Utility Types

### Request Handler Types

```typescript
type RequestHandler<TRequest, TResult> = (
  request: TRequest
) => Promise<TResult>;

// Example usage
const resourceHandler: RequestHandler<ReadResourceRequest, ReadResourceResult> = 
  async (request) => {
    // Handle resource reading
    return { contents: [] };
  };
```

### Event Handler Types

```typescript
type EventHandler<TNotification> = (
  notification: TNotification
) => Promise<void>;

// Example usage
const updateHandler: EventHandler<ResourceUpdatedNotification> = 
  async (notification) => {
    console.log(`Resource updated: ${notification.params.uri}`);
  };
```

## Advanced Type Patterns

### Conditional Types for Tools

```typescript
// Create type-safe tool registration
type ToolHandler<T extends z.ZodType> = (
  input: z.infer<T>
) => Promise<ToolResult>;

function createTypedTool<T extends z.ZodType>(
  name: string,
  config: {
    title: string;
    description: string;
    inputSchema: T;
  },
  handler: ToolHandler<T>
) {
  return server.registerTool(name, config, handler);
}

// Usage with full type safety
createTypedTool("calculate", {
  title: "Calculator",
  description: "Perform calculations",
  inputSchema: z.object({
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
    a: z.number(),
    b: z.number()
  })
}, async ({ operation, a, b }) => {
  // All parameters are fully typed
  const result = operation === "add" ? a + b : 
                operation === "subtract" ? a - b :
                operation === "multiply" ? a * b : a / b;
  
  return {
    content: [{ type: "text", text: result.toString() }]
  };
});
```

This comprehensive type system ensures that MCP applications are type-safe, maintainable, and less prone to runtime errors. The integration with Zod provides both runtime validation and compile-time type safety.