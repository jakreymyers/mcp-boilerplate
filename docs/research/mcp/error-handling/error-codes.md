# MCP Error Codes Reference

## Overview

Model Context Protocol (MCP) uses standardized error codes based on the JSON-RPC 2.0 specification. This document provides a comprehensive reference of all standard error codes, their meanings, usage scenarios, and examples.

## Standard JSON-RPC Error Codes

### Core Protocol Errors (-32700 to -32600)

#### -32700: Parse Error
- **Description**: Invalid JSON was received by the server
- **When to Use**: JSON parsing failures, malformed requests
- **Typical Causes**: 
  - Malformed JSON syntax
  - Invalid character encoding
  - Truncated requests

```json
{
  "jsonrpc": "2.0",
  "id": null,
  "error": {
    "code": -32700,
    "message": "Parse error",
    "data": {
      "position": 42,
      "received": "{\"method\": \"tools/list\", \"params\": {incomplete",
      "error": "Unexpected end of JSON input"
    }
  }
}
```

```typescript
// TypeScript usage
throw new McpError(
  ErrorCode.ParseError,
  "Invalid JSON received",
  { 
    position: jsonError.position,
    received: rawInput.substring(0, 100) 
  }
);
```

#### -32600: Invalid Request
- **Description**: The JSON sent is not a valid Request object
- **When to Use**: Request structure violations, missing required fields
- **Typical Causes**:
  - Missing `jsonrpc` field
  - Invalid `jsonrpc` version
  - Missing or invalid `method` field

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32600,
    "message": "Invalid Request",
    "data": {
      "issue": "Missing required field 'method'",
      "received": {
        "jsonrpc": "2.0",
        "id": 1,
        "params": {}
      }
    }
  }
}
```

#### -32601: Method Not Found
- **Description**: The method does not exist or is not available
- **When to Use**: Unknown methods, capability mismatches
- **Typical Causes**:
  - Calling unsupported methods
  - Version compatibility issues
  - Server capability limitations

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "error": {
    "code": -32601,
    "message": "Method not found",
    "data": {
      "method": "prompts/create",
      "availableMethods": ["prompts/list", "prompts/get"],
      "serverCapabilities": {
        "prompts": { "listChanged": true }
      }
    }
  }
}
```

```typescript
// Server capability check
if (!server.capabilities.tools) {
  throw new McpError(
    ErrorCode.MethodNotFound,
    "Tools capability not supported",
    { 
      method: request.method,
      supportedCapabilities: Object.keys(server.capabilities)
    }
  );
}
```

#### -32602: Invalid Params
- **Description**: Invalid method parameter(s)
- **When to Use**: Parameter validation failures, type mismatches
- **Typical Causes**:
  - Missing required parameters
  - Wrong parameter types
  - Schema validation failures

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "parameter": "uri",
      "issue": "Must be a valid URI string",
      "provided": 123,
      "expected": "string",
      "schema": {
        "type": "string",
        "format": "uri"
      }
    }
  }
}
```

```typescript
// Parameter validation
function validateUri(uri: unknown): string {
  if (typeof uri !== 'string') {
    throw new McpError(
      ErrorCode.InvalidParams,
      "URI must be a string",
      {
        parameter: 'uri',
        provided: typeof uri,
        expected: 'string'
      }
    );
  }
  
  try {
    new URL(uri);
    return uri;
  } catch {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Invalid URI format",
      { 
        parameter: 'uri',
        provided: uri,
        expected: 'valid URI string'
      }
    );
  }
}
```

#### -32603: Internal Error
- **Description**: Internal JSON-RPC error
- **When to Use**: Server-side processing errors, unexpected failures
- **Typical Causes**:
  - Unhandled exceptions
  - System resource failures
  - Configuration errors

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": {
      "error": "Database connection failed",
      "component": "resource-provider",
      "retryable": true,
      "timestamp": "2024-01-15T10:30:00Z"
    }
  }
}
```

## MCP-Specific Error Codes

### -32002: Resource Not Found
- **Description**: Requested resource doesn't exist or cannot be accessed
- **When to Use**: Resource access failures, file not found scenarios
- **Common Usage**: File systems, databases, external APIs

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "error": {
    "code": -32002,
    "message": "Resource not found",
    "data": {
      "uri": "file:///nonexistent.txt",
      "type": "file",
      "searched": ["/home/user/nonexistent.txt"],
      "exists": false,
      "accessible": false
    }
  }
}
```

```typescript
// File system resource handler
async function readResource(uri: string): Promise<ResourceContent> {
  try {
    const content = await fs.readFile(uriToPath(uri), 'utf8');
    return { uri, content, mimeType: 'text/plain' };
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new McpError(
        ErrorCode.ResourceNotFound,
        `File not found: ${uri}`,
        {
          uri,
          path: uriToPath(uri),
          error: error.code
        }
      );
    }
    throw new McpError(ErrorCode.InternalError, "File read failed");
  }
}
```

## Custom Error Code Ranges

### Application-Specific Errors (-31999 to -31000)
Reserved for application-specific errors that don't fit standard categories.

```typescript
enum CustomErrorCode {
  // Authentication & Authorization
  AuthenticationRequired = -31999,
  InvalidCredentials = -31998,
  InsufficientPermissions = -31997,
  TokenExpired = -31996,
  
  // Rate Limiting & Quotas
  RateLimitExceeded = -31995,
  QuotaExceeded = -31994,
  ConcurrencyLimitExceeded = -31993,
  
  // External Service Errors
  ExternalServiceUnavailable = -31992,
  ExternalServiceTimeout = -31991,
  ExternalServiceError = -31990,
  
  // Data Validation
  SchemaValidationFailed = -31989,
  DataIntegrityError = -31988,
  ConflictingData = -31987,
  
  // Resource Management
  ResourceLocked = -31986,
  ResourceBusy = -31985,
  ResourceCorrupted = -31984,
}
```

### Domain-Specific Errors (-30999 to -30000)
For specific domain implementations (file systems, databases, etc.).

```typescript
enum FileSystemErrorCode {
  PermissionDenied = -30999,
  DiskSpaceFull = -30998,
  FileSystemReadOnly = -30997,
  PathTooLong = -30996,
  InvalidFileName = -30995,
  DirectoryNotEmpty = -30994,
}

enum DatabaseErrorCode {
  ConnectionFailed = -30899,
  QueryTimeout = -30898,
  TransactionFailed = -30897,
  ConstraintViolation = -30896,
  DeadlockDetected = -30895,
}
```

## Error Code Usage Patterns

### Client-Side Error Handling

```typescript
async function handleToolCall(toolName: string, args: any): Promise<any> {
  try {
    const result = await client.request({
      method: "tools/call",
      params: { name: toolName, arguments: args }
    });
    return result;
  } catch (error) {
    if (error instanceof McpError) {
      switch (error.code) {
        case ErrorCode.MethodNotFound:
          console.warn(`Tool '${toolName}' not available`);
          return { error: "Tool not available", retryable: false };
          
        case ErrorCode.InvalidParams:
          console.error(`Invalid parameters for tool '${toolName}':`, error.data);
          return { error: "Invalid parameters", retryable: false };
          
        case ErrorCode.InternalError:
          console.error(`Server error calling tool '${toolName}'`);
          return { error: "Server error", retryable: true };
          
        case ErrorCode.ResourceNotFound:
          console.warn(`Resource not found for tool '${toolName}'`);
          return { error: "Resource unavailable", retryable: false };
          
        default:
          console.error(`Unknown MCP error ${error.code}: ${error.message}`);
          return { error: "Unknown error", retryable: false };
      }
    }
    
    // Non-MCP errors
    console.error("Unexpected error:", error);
    return { error: "Unexpected error", retryable: false };
  }
}
```

### Server-Side Error Classification

```typescript
class ErrorClassifier {
  static isRetryable(errorCode: number): boolean {
    const retryableErrors = [
      ErrorCode.InternalError,
      CustomErrorCode.ExternalServiceTimeout,
      CustomErrorCode.ExternalServiceUnavailable,
      CustomErrorCode.ResourceBusy,
    ];
    return retryableErrors.includes(errorCode);
  }
  
  static isClientError(errorCode: number): boolean {
    const clientErrors = [
      ErrorCode.ParseError,
      ErrorCode.InvalidRequest,
      ErrorCode.InvalidParams,
      ErrorCode.MethodNotFound,
      ErrorCode.ResourceNotFound,
    ];
    return clientErrors.includes(errorCode);
  }
  
  static isServerError(errorCode: number): boolean {
    return errorCode === ErrorCode.InternalError || errorCode < -31000;
  }
}
```

## Error Context Patterns

### Validation Error Context

```typescript
interface ValidationErrorData {
  field: string;
  provided: any;
  expected: string;
  schema?: object;
  suggestions?: string[];
}

function createValidationError(field: string, provided: any, expected: string): McpError {
  return new McpError(
    ErrorCode.InvalidParams,
    `Validation failed for field '${field}'`,
    {
      field,
      provided,
      expected,
      type: typeof provided,
      suggestions: getSuggestions(field, provided)
    } as ValidationErrorData
  );
}
```

### Resource Error Context

```typescript
interface ResourceErrorData {
  uri: string;
  type: 'file' | 'directory' | 'url' | 'database' | 'other';
  exists?: boolean;
  accessible?: boolean;
  permissions?: string[];
  lastModified?: string;
  size?: number;
}

function createResourceNotFoundError(uri: string, type: string): McpError {
  return new McpError(
    ErrorCode.ResourceNotFound,
    `${type} resource not found: ${uri}`,
    {
      uri,
      type,
      exists: false,
      timestamp: new Date().toISOString()
    } as ResourceErrorData
  );
}
```

### Service Error Context

```typescript
interface ServiceErrorData {
  service: string;
  endpoint?: string;
  status?: number;
  statusText?: string;
  retryAfter?: number;
  retryable: boolean;
}

function createServiceError(service: string, message: string, retryable: boolean): McpError {
  return new McpError(
    CustomErrorCode.ExternalServiceError,
    `${service} service error: ${message}`,
    {
      service,
      retryable,
      timestamp: new Date().toISOString()
    } as ServiceErrorData
  );
}
```

## Framework-Specific Error Codes

### FastMCP Error Extensions

```python
# Python FastMCP custom errors
from enum import Enum

class FastMCPErrorCode(Enum):
    TOOL_EXECUTION_FAILED = -29999
    RESOURCE_LOAD_FAILED = -29998
    VALIDATION_SCHEMA_ERROR = -29997
    MIDDLEWARE_ERROR = -29996
    AUTHENTICATION_MIDDLEWARE_ERROR = -29995

# Usage in FastMCP
from fastmcp import FastMCP, McpError

mcp = FastMCP("example-server")

@mcp.tool
def process_data(data: str) -> str:
    if not data:
        raise McpError(
            ErrorCode.INVALID_PARAMS,
            "Data parameter cannot be empty",
            {"parameter": "data", "provided": data, "expected": "non-empty string"}
        )
    
    try:
        return complex_processing(data)
    except ProcessingError as e:
        raise McpError(
            FastMCPErrorCode.TOOL_EXECUTION_FAILED.value,
            f"Processing failed: {str(e)}",
            {"tool": "process_data", "originalError": str(e)}
        )
```

## HTTP Status Code Mapping

When using HTTP transport, MCP error codes can be mapped to appropriate HTTP status codes:

```typescript
function mapMcpErrorToHttpStatus(mcpError: McpError): number {
  switch (mcpError.code) {
    case ErrorCode.ParseError:
    case ErrorCode.InvalidRequest:
    case ErrorCode.InvalidParams:
      return 400; // Bad Request
      
    case ErrorCode.MethodNotFound:
    case ErrorCode.ResourceNotFound:
      return 404; // Not Found
      
    case CustomErrorCode.AuthenticationRequired:
      return 401; // Unauthorized
      
    case CustomErrorCode.InsufficientPermissions:
      return 403; // Forbidden
      
    case CustomErrorCode.RateLimitExceeded:
      return 429; // Too Many Requests
      
    case ErrorCode.InternalError:
    default:
      return 500; // Internal Server Error
  }
}
```

## Best Practices Summary

### 1. Use Appropriate Error Codes
- Use standard JSON-RPC codes for protocol-level issues
- Use MCP-specific codes for resource-related problems
- Create custom codes for application-specific errors

### 2. Provide Rich Context
- Include relevant data in the `data` field
- Add debugging information for development
- Include retry hints for transient errors

### 3. Maintain Consistency
- Use consistent error messages for similar issues
- Follow established patterns for error data structures
- Document custom error codes clearly

### 4. Handle Gracefully
- Implement proper error recovery mechanisms
- Provide user-friendly error messages
- Log errors appropriately for debugging

This comprehensive reference ensures consistent and effective error handling across MCP implementations.