# McpError Class Reference

## Overview

The `McpError` class is the primary exception type used in the Model Context Protocol (MCP) ecosystem. It extends the standard JavaScript `Error` class and provides structured error handling with standardized error codes and optional additional data.

## Class Definition

### TypeScript Definition

```typescript
class McpError extends Error {
  constructor(code: ErrorCode, message: string, data?: any) {
    super(`MCP error ${code}: ${message}`);
    this.name = 'McpError';
    this.code = code;
    this.data = data;
  }
  
  code: ErrorCode;
  data?: any;
}
```

### Python Definition

```python
class McpError(Exception):
    def __init__(self, code: int, message: str, data: Any = None):
        super().__init__(f"MCP error {code}: {message}")
        self.code = code
        self.message = message
        self.data = data
```

## Properties

### `code: ErrorCode`
- **Type**: Number (ErrorCode enum)
- **Description**: Standardized error code following JSON-RPC conventions
- **Required**: Yes

### `message: string`
- **Type**: String
- **Description**: Human-readable error description
- **Required**: Yes

### `data?: any`
- **Type**: Any
- **Description**: Optional additional context data
- **Required**: No

## Usage Patterns

### Basic Error Creation

```typescript
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk";

// Simple error
throw new McpError(
  ErrorCode.InvalidParams, 
  "Missing required parameter 'name'"
);

// Error with additional context
throw new McpError(
  ErrorCode.ResourceNotFound,
  "File not found",
  { 
    uri: "file:///missing.txt",
    timestamp: new Date().toISOString() 
  }
);
```

### Error Handling

```typescript
try {
  const result = await someOperation();
  return result;
} catch (error) {
  if (error instanceof McpError) {
    // Handle MCP-specific errors
    console.error(`MCP Error ${error.code}: ${error.message}`);
    if (error.data) {
      console.error('Additional context:', error.data);
    }
    throw error; // Re-throw or handle appropriately
  } else {
    // Convert other errors to McpError
    throw new McpError(
      ErrorCode.InternalError,
      `Unexpected error: ${error.message}`
    );
  }
}
```

## Error Code Integration

### Standard Error Codes

```typescript
enum ErrorCode {
  // JSON-RPC 2.0 Standard Errors
  ParseError = -32700,      // Invalid JSON received
  InvalidRequest = -32600,  // JSON not valid request object
  MethodNotFound = -32601,  // Method does not exist
  InvalidParams = -32602,   // Invalid method parameters
  InternalError = -32603,   // Internal JSON-RPC error
  
  // MCP-Specific Errors (can extend above -32000)
  ResourceNotFound = -32002, // Requested resource doesn't exist
}
```

### Custom Error Codes

```typescript
// Custom error codes should be above -32000
enum CustomErrorCode {
  AuthenticationFailed = -31000,
  RateLimitExceeded = -31001,
  ServiceUnavailable = -31002,
}

// Usage
throw new McpError(
  CustomErrorCode.RateLimitExceeded,
  "API rate limit exceeded",
  { 
    retryAfter: 60,
    limit: 100,
    windowSeconds: 3600 
  }
);
```

## Context Data Patterns

### File System Errors

```typescript
throw new McpError(
  ErrorCode.ResourceNotFound,
  "File not found",
  {
    uri: request.params.uri,
    path: resolvedPath,
    exists: false,
    permissions: 'readable'
  }
);
```

### Validation Errors

```typescript
throw new McpError(
  ErrorCode.InvalidParams,
  "Schema validation failed",
  {
    field: 'email',
    provided: 'invalid-email',
    expected: 'valid email address',
    schema: inputSchema
  }
);
```

### Network Errors

```typescript
throw new McpError(
  ErrorCode.InternalError,
  "External API request failed",
  {
    url: apiEndpoint,
    status: response.status,
    statusText: response.statusText,
    retryable: true
  }
);
```

## Framework-Specific Usage

### MCP SDK (TypeScript)

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

const server = new Server({
  name: "example-server",
  version: "1.0.0"
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  try {
    const content = await readFile(request.params.uri);
    return { contents: [content] };
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new McpError(
        ErrorCode.ResourceNotFound,
        `Resource not found: ${request.params.uri}`,
        { uri: request.params.uri }
      );
    }
    throw new McpError(
      ErrorCode.InternalError,
      "Failed to read resource"
    );
  }
});
```

### MCP SDK (Python)

```python
from mcp.server import Server
from mcp.types import McpError, ErrorCode
import mcp.types as types

app = Server("example-server")

@app.read_resource()
async def read_resource(uri: str) -> types.ReadResourceResult:
    try:
        content = await read_file(uri)
        return types.ReadResourceResult(contents=[content])
    except FileNotFoundError:
        raise McpError(
            ErrorCode.RESOURCE_NOT_FOUND,
            f"Resource not found: {uri}",
            {"uri": uri}
        )
    except Exception as e:
        raise McpError(
            ErrorCode.INTERNAL_ERROR,
            "Failed to read resource"
        )
```

### FastMCP Integration

```python
from fastmcp import FastMCP
from fastmcp.exceptions import McpError, ErrorCode

mcp = FastMCP("fastmcp-server")

@mcp.tool
def process_data(data: str) -> str:
    """Process data with error handling"""
    try:
        if not data.strip():
            raise McpError(
                ErrorCode.INVALID_PARAMS,
                "Data cannot be empty",
                {"provided": data, "expected": "non-empty string"}
            )
        
        result = complex_processing(data)
        return result
        
    except ProcessingError as e:
        raise McpError(
            ErrorCode.INTERNAL_ERROR,
            f"Processing failed: {e}",
            {"originalError": str(e)}
        )
```

## Error Serialization

### JSON-RPC Error Response

When McpError is thrown, it gets serialized into a JSON-RPC error response:

```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "error": {
    "code": -32602,
    "message": "Invalid params: Missing required parameter 'name'",
    "data": {
      "parameter": "name",
      "type": "string",
      "required": true
    }
  }
}
```

### Transport Layer Handling

```typescript
// Server-side error serialization
function serializeError(error: McpError): JSONRPCError {
  return {
    code: error.code,
    message: error.message,
    data: error.data
  };
}

// Client-side error deserialization
function deserializeError(errorObj: JSONRPCError): McpError {
  return new McpError(
    errorObj.code,
    errorObj.message,
    errorObj.data
  );
}
```

## Best Practices

### 1. Use Appropriate Error Codes

```typescript
// ✅ Correct: Use specific error codes
throw new McpError(ErrorCode.InvalidParams, "Missing 'id' parameter");

// ❌ Incorrect: Generic error for specific issues
throw new McpError(ErrorCode.InternalError, "Missing 'id' parameter");
```

### 2. Provide Helpful Context

```typescript
// ✅ Correct: Rich context data
throw new McpError(
  ErrorCode.ResourceNotFound,
  "Configuration file not found",
  {
    path: configPath,
    searched: ['/etc/app.conf', '~/.app.conf', './app.conf'],
    suggestion: "Create a configuration file or set CONFIG_PATH"
  }
);

// ❌ Incorrect: Minimal context
throw new McpError(ErrorCode.ResourceNotFound, "File not found");
```

### 3. Chain Errors Appropriately

```typescript
// ✅ Correct: Preserve original error information
try {
  await externalAPICall();
} catch (originalError) {
  throw new McpError(
    ErrorCode.InternalError,
    "External service unavailable",
    {
      service: "weather-api",
      originalError: originalError.message,
      retryable: true
    }
  );
}
```

### 4. Handle Async Errors

```typescript
// ✅ Correct: Proper async error handling
async function processRequest(request: Request): Promise<Response> {
  try {
    const result = await performOperation(request);
    return { success: true, result };
  } catch (error) {
    if (error instanceof McpError) {
      throw error; // Re-throw MCP errors
    }
    
    // Convert unknown errors
    throw new McpError(
      ErrorCode.InternalError,
      "Operation failed",
      { originalError: error.message }
    );
  }
}
```

## Error Recovery Patterns

### Retry Logic

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: McpError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof McpError) {
        // Only retry certain error types
        if (error.code === ErrorCode.InternalError && attempt < maxRetries) {
          lastError = error;
          await delay(1000 * attempt); // Exponential backoff
          continue;
        }
        throw error; // Non-retryable or max retries reached
      }
      throw error;
    }
  }
  
  throw lastError!;
}
```

### Graceful Degradation

```typescript
async function getDataWithFallback(source: string): Promise<Data> {
  try {
    return await getPrimaryData(source);
  } catch (error) {
    if (error instanceof McpError && error.code === ErrorCode.ResourceNotFound) {
      // Try fallback source
      try {
        return await getFallbackData(source);
      } catch (fallbackError) {
        // Return empty data with error indicator
        throw new McpError(
          ErrorCode.ResourceNotFound,
          "Data unavailable from all sources",
          {
            primaryError: error.message,
            fallbackError: fallbackError.message,
            sources: ['primary', 'fallback']
          }
        );
      }
    }
    throw error;
  }
}
```

This comprehensive reference covers all aspects of the McpError class, from basic usage to advanced error handling patterns in MCP applications.