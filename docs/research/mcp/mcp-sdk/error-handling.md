# MCP Error Handling with McpError

## Overview

The MCP TypeScript SDK provides comprehensive error handling through the `McpError` class and structured error responses. Error handling in MCP operates at both the protocol level and the application level.

## McpError Class

### Definition

```typescript
class McpError extends Error {
  constructor(code: ErrorCode, message: string, data?: any) {
    super(`MCP error ${code}: ${message}`);
    this.code = code;
    this.data = data;
  }
  
  code: ErrorCode;
  data?: any;
}
```

### Error Structure

MCP builds on JSON-RPC 2.0 for error representation. Error objects contain:

```typescript
interface ErrorObject {
  jsonrpc: "2.0";
  id: string | number | null;
  error: {
    code: number;        // Numeric error identifier
    message: string;     // Human-readable explanation
    data?: any;         // Optional additional context
  };
}
```

## Common Error Codes

### Protocol-Level Errors

```typescript
enum ErrorCode {
  // JSON-RPC 2.0 Standard Errors
  ParseError = -32700,      // Invalid JSON received
  InvalidRequest = -32600,  // JSON not valid request object
  MethodNotFound = -32601,  // Method does not exist
  InvalidParams = -32602,   // Invalid method parameters
  InternalError = -32603,   // Internal JSON-RPC error
  
  // MCP-Specific Errors
  ResourceNotFound = -32002, // Requested resource doesn't exist
  // Additional MCP error codes...
}
```

### Error Code Examples

- **-32002**: Resource not found or can't be accessed
- **-32601**: Method not found (different MCP versions or unimplemented capabilities)
- **-32602**: Parameter validation failures

## Error Handling Patterns

### 1. Client-Side Error Handling

```typescript
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk";

try {
  const result = await client.request(
    { method: "resources/read", params: { uri: "file:///sample.txt" } },
    ReadResourceResultSchema
  );
  console.log("Resource content:", result.contents);
} catch (error) {
  if (error instanceof McpError) {
    switch (error.code) {
      case ErrorCode.ResourceNotFound:
        console.error("Resource not found:", error.message);
        break;
      case ErrorCode.MethodNotFound:
        console.error("Method not supported:", error.message);
        break;
      default:
        console.error(`MCP Error ${error.code}: ${error.message}`);
    }
  } else {
    console.error("Unexpected error:", error);
  }
}
```

### 2. Server-Side Error Handling

```typescript
import { McpServer, McpError, ErrorCode } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({
  name: "example-server",
  version: "1.0.0"
});

// Resource handler with error handling
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  try {
    if (!uri.startsWith("file://")) {
      throw new McpError(
        ErrorCode.InvalidParams, 
        "Only file:// URIs are supported"
      );
    }
    
    const filePath = uri.replace("file://", "");
    const content = await fs.readFile(filePath, 'utf-8');
    
    return {
      contents: [{
        uri,
        mimeType: "text/plain",
        text: content
      }]
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new McpError(
        ErrorCode.ResourceNotFound,
        `File not found: ${uri}`
      );
    }
    throw error;
  }
});
```

### 3. Tool Error Handling

**Important**: Tool errors should be reported within the result object, not as MCP protocol-level errors.

```typescript
// ✅ Correct: Error within tool response
server.registerTool("file-reader", {
  title: "File Reader",
  description: "Read file contents",
  inputSchema: {
    path: z.string().describe("File path to read")
  }
}, async ({ path }) => {
  try {
    const content = await fs.readFile(path, 'utf-8');
    return {
      content: [{ type: "text", text: content }]
    };
  } catch (error) {
    return {
      content: [{ 
        type: "text", 
        text: `Error reading file: ${error.message}` 
      }],
      isError: true  // Mark as error response
    };
  }
});

// ❌ Incorrect: Protocol-level error for tool issues
server.registerTool("bad-example", {
  title: "Bad Example",
  inputSchema: { path: z.string() }
}, async ({ path }) => {
  try {
    const content = await fs.readFile(path, 'utf-8');
    return { content: [{ type: "text", text: content }] };
  } catch (error) {
    // This prevents the LLM from seeing and handling the error
    throw new McpError(ErrorCode.InternalError, error.message);
  }
});
```

## Error Response Format

### Tool Error Response

```typescript
interface ToolErrorResponse {
  content: Content[];
  isError: true;  // Indicates error state
}

// Example implementation
return {
  content: [{
    type: "text",
    text: "Failed to process request: Invalid input format"
  }],
  isError: true
};
```

### Resource Error Response

```typescript
// When a resource cannot be found or accessed
throw new McpError(
  ErrorCode.ResourceNotFound,
  "The requested resource could not be found",
  { uri: request.params.uri, timestamp: new Date().toISOString() }
);
```

## Best Practices

### 1. Appropriate Error Levels

- **Protocol-level errors**: Use for MCP protocol violations, authentication failures, or server-level issues
- **Tool-level errors**: Use for business logic errors, validation failures, or expected error conditions

### 2. Error Context

Provide helpful context in error messages:

```typescript
throw new McpError(
  ErrorCode.InvalidParams,
  "File path must be absolute and start with '/'",
  { 
    provided: relativePath,
    expected: "absolute path starting with '/'"
  }
);
```

### 3. Timeout Handling

Implement appropriate timeouts to prevent hung connections:

```typescript
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => {
    reject(new McpError(
      ErrorCode.InternalError, 
      "Operation timed out"
    ));
  }, 30000); // 30 second timeout
});

try {
  const result = await Promise.race([operationPromise, timeoutPromise]);
  return result;
} catch (error) {
  if (error instanceof McpError) {
    throw error;
  }
  throw new McpError(ErrorCode.InternalError, "Unexpected error occurred");
}
```

### 4. Error Recovery

Implement graceful degradation where possible:

```typescript
server.registerTool("search", {
  title: "Search Tool",
  inputSchema: { query: z.string() }
}, async ({ query }) => {
  try {
    const results = await primarySearchService.search(query);
    return { content: [{ type: "text", text: JSON.stringify(results) }] };
  } catch (error) {
    // Try fallback search service
    try {
      const fallbackResults = await fallbackSearchService.search(query);
      return { 
        content: [{ 
          type: "text", 
          text: `Fallback results: ${JSON.stringify(fallbackResults)}` 
        }] 
      };
    } catch (fallbackError) {
      return {
        content: [{ 
          type: "text", 
          text: "Search service temporarily unavailable" 
        }],
        isError: true
      };
    }
  }
});
```

## Known Issues

### Uncatchable Exceptions

There's a known issue where MCP can throw exceptions outside of any API call, making it difficult to write crash-resistant code. To mitigate:

```typescript
// Wrap MCP operations in global error handlers
process.on('unhandledRejection', (error) => {
  console.error('Unhandled MCP error:', error);
  // Implement recovery logic
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught MCP exception:', error);
  // Implement graceful shutdown
});
```

This comprehensive error handling approach ensures robust MCP applications that can gracefully handle various failure scenarios while providing meaningful feedback to both users and AI models.