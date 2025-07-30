# FastMCP Error Handling Integration

## Overview

FastMCP provides a higher-level framework built on top of the official MCP SDK with enhanced error handling capabilities. This document covers how FastMCP integrates with and extends standard MCP error handling patterns.

## FastMCP Error Architecture

### Error Handling Philosophy

FastMCP follows a layered error handling approach:

1. **Framework Layer**: Automatic validation, middleware errors, transport issues
2. **Application Layer**: Tool and resource business logic errors
3. **Integration Layer**: External service and dependency errors

### Built-in Error Types

```python
# Python FastMCP Error Types
from fastmcp.exceptions import (
    McpError,           # Base MCP error
    ValidationError,    # Input validation failures
    AuthenticationError,# Authentication issues
    MiddlewareError,    # Middleware execution errors
    TransportError,     # Transport layer issues
    ResourceError,      # Resource access errors
    ToolError          # Tool execution errors
)

# TypeScript FastMCP Error Types
import {
  McpError,
  ValidationError,
  AuthenticationError,
  MiddlewareError,
  TransportError,
  ResourceError,
  ToolError
} from "fastmcp/errors";
```

## Python FastMCP Error Handling

### Basic Tool Error Handling

```python
from fastmcp import FastMCP
from fastmcp.exceptions import McpError, ErrorCode, ValidationError
import asyncio
import logging

logger = logging.getLogger(__name__)
mcp = FastMCP("fastmcp-error-example")

@mcp.tool
def calculate(operation: str, a: float, b: float) -> str:
    """Calculator with comprehensive error handling"""
    
    # Input validation (automatic with type hints)
    valid_operations = ['add', 'subtract', 'multiply', 'divide']
    
    if operation not in valid_operations:
        raise ValidationError(
            f"Invalid operation: {operation}",
            field="operation",
            provided=operation,
            expected=valid_operations
        )
    
    try:
        if operation == 'add':
            result = a + b
        elif operation == 'subtract':
            result = a - b
        elif operation == 'multiply':
            result = a * b
        elif operation == 'divide':
            if b == 0:
                # Return tool-level error, not protocol error
                return "Error: Division by zero is not allowed"
            result = a / b
        
        return f"Result: {a} {operation} {b} = {result}"
        
    except Exception as e:
        logger.error(f"Calculation error: {e}")
        return f"Error: Calculation failed - {str(e)}"

@mcp.tool
async def fetch_data(url: str, timeout: int = 30) -> str:
    """Fetch data with timeout and error handling"""
    
    import aiohttp
    
    # URL validation
    if not url.startswith(('http://', 'https://')):
        raise ValidationError(
            "Invalid URL format",
            field="url",
            provided=url,
            expected="URL starting with http:// or https://"
        )
    
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=timeout)) as session:
            async with session.get(url) as response:
                if response.status == 404:
                    return f"Error: Resource not found at {url}"
                elif response.status >= 400:
                    return f"Error: HTTP {response.status} - {response.reason}"
                
                content = await response.text()
                return f"Successfully fetched {len(content)} characters from {url}"
                
    except asyncio.TimeoutError:
        return f"Error: Request timeout after {timeout} seconds"
    except aiohttp.ClientError as e:
        return f"Error: Network error - {str(e)}"
    except Exception as e:
        logger.exception("Unexpected error in fetch_data")
        return f"Error: An unexpected error occurred - {str(e)}"
```

### Resource Error Handling

```python
@mcp.resource("file://{path}")
async def read_file_resource(path: str) -> str:
    """Read file resource with comprehensive error handling"""
    
    import os
    import aiofiles
    from pathlib import Path
    
    try:
        # Path validation
        file_path = Path(path)
        
        if not file_path.is_absolute():
            raise ValidationError(
                "Path must be absolute",
                field="path",
                provided=path,
                expected="absolute file path"
            )
        
        if not file_path.exists():
            raise ResourceError(
                f"File not found: {path}",
                resource_uri=f"file://{path}",
                resource_type="file",
                exists=False
            )
        
        if not file_path.is_file():
            raise ResourceError(
                f"Path is not a file: {path}",
                resource_uri=f"file://{path}",
                resource_type="directory" if file_path.is_dir() else "unknown"
            )
        
        # Check file size (limit to 1MB for example)
        if file_path.stat().st_size > 1024 * 1024:
            raise ResourceError(
                f"File too large: {path}",
                resource_uri=f"file://{path}",
                size=file_path.stat().st_size,
                limit=1024 * 1024
            )
        
        # Read file content
        async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
            content = await f.read()
            return content
            
    except (PermissionError, OSError) as e:
        raise ResourceError(
            f"Cannot access file: {path}",
            resource_uri=f"file://{path}",
            error=str(e),
            permissions_required="read"
        )
    except UnicodeDecodeError as e:
        raise ResourceError(
            f"Cannot decode file as UTF-8: {path}",
            resource_uri=f"file://{path}",
            encoding="utf-8",
            error=str(e)
        )
```

### Middleware Error Handling

```python
from fastmcp.middleware import Middleware
from fastmcp.exceptions import MiddlewareError, AuthenticationError

class AuthenticationMiddleware(Middleware):
    def __init__(self, api_key: str):
        self.api_key = api_key
    
    async def before_request(self, request: dict) -> dict:
        """Validate API key before processing request"""
        
        auth_header = request.get('headers', {}).get('authorization')
        
        if not auth_header:
            raise AuthenticationError(
                "Missing authorization header",
                required_header="authorization",
                format="Bearer <api-key>"
            )
        
        if not auth_header.startswith('Bearer '):
            raise AuthenticationError(
                "Invalid authorization format",
                provided=auth_header,
                expected="Bearer <api-key>"
            )
        
        provided_key = auth_header.replace('Bearer ', '')
        if provided_key != self.api_key:
            raise AuthenticationError(
                "Invalid API key",
                hint="Check your API key configuration"
            )
        
        # Add user context to request
        request['user'] = {'authenticated': True, 'api_key': provided_key}
        return request
    
    async def after_request(self, request: dict, response: dict) -> dict:
        """Process response after tool execution"""
        return response
    
    async def on_error(self, request: dict, error: Exception) -> dict:
        """Handle errors in middleware"""
        
        if isinstance(error, AuthenticationError):
            return {
                "error": {
                    "code": -32001,  # Custom authentication error code
                    "message": error.message,
                    "data": error.data
                }
            }
        
        # Let other errors bubble up
        raise error

# Apply middleware to FastMCP instance
mcp.add_middleware(AuthenticationMiddleware("your-secret-api-key"))
```

### Global Error Handler

```python
@mcp.error_handler
async def global_error_handler(error: Exception, context: dict) -> dict:
    """Global error handler for unhandled exceptions"""
    
    import traceback
    from datetime import datetime
    
    error_id = f"error_{int(datetime.utcnow().timestamp())}"
    
    # Log the error
    logger.error(
        f"Global error handler [{error_id}]: {error}",
        extra={
            "error_id": error_id,
            "error_type": type(error).__name__,
            "context": context,
            "traceback": traceback.format_exc()
        }
    )
    
    # Handle FastMCP specific errors
    if isinstance(error, ValidationError):
        return {
            "code": ErrorCode.INVALID_PARAMS,
            "message": error.message,
            "data": {
                "field": error.field,
                "provided": error.provided,
                "expected": error.expected,
                "error_id": error_id
            }
        }
    
    elif isinstance(error, AuthenticationError):
        return {
            "code": -32001,  # Custom auth error code
            "message": "Authentication failed",
            "data": {
                "reason": error.message,
                "error_id": error_id
            }
        }
    
    elif isinstance(error, ResourceError):
        return {
            "code": ErrorCode.RESOURCE_NOT_FOUND,
            "message": error.message,
            "data": {
                "resource_uri": error.resource_uri,
                "resource_type": error.resource_type,
                "error_id": error_id
            }
        }
    
    elif isinstance(error, MiddlewareError):
        return {
            "code": ErrorCode.INTERNAL_ERROR,
            "message": "Middleware error occurred",
            "data": {
                "middleware": error.middleware_name,
                "error": str(error),
                "error_id": error_id
            }
        }
    
    # Handle standard MCP errors
    elif isinstance(error, McpError):
        return {
            "code": error.code,
            "message": error.message,
            "data": {
                **(error.data or {}),
                "error_id": error_id
            }
        }
    
    # Handle unexpected errors
    else:
        return {
            "code": ErrorCode.INTERNAL_ERROR,
            "message": "An internal server error occurred",
            "data": {
                "error_type": type(error).__name__,
                "error_id": error_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
```

## TypeScript FastMCP Error Handling

### Basic Server Setup

```typescript
import { FastMCP, McpError, ErrorCode } from "fastmcp";
import { z } from "zod";

const server = new FastMCP({
  name: "fastmcp-typescript-errors",
  version: "1.0.0"
});

// Tool with validation and error handling
server.addTool({
  name: "process_text",
  description: "Process text with various transformations",
  inputSchema: z.object({
    text: z.string().min(1, "Text cannot be empty"),
    operation: z.enum(["uppercase", "lowercase", "reverse", "wordcount"]),
    options: z.object({
      trim: z.boolean().optional(),
      removeSpaces: z.boolean().optional()
    }).optional()
  }),
  handler: async ({ text, operation, options = {} }) => {
    try {
      let processedText = text;
      
      // Apply options
      if (options.trim) {
        processedText = processedText.trim();
      }
      
      if (options.removeSpaces) {
        processedText = processedText.replace(/\s+/g, '');
      }
      
      // Apply operation
      let result: string;
      switch (operation) {
        case "uppercase":
          result = processedText.toUpperCase();
          break;
        case "lowercase":
          result = processedText.toLowerCase();
          break;
        case "reverse":
          result = processedText.split('').reverse().join('');
          break;
        case "wordcount":
          const wordCount = processedText.split(/\s+/).filter(word => word.length > 0).length;
          result = `Word count: ${wordCount}`;
          break;
        default:
          // This should never happen due to Zod validation
          throw new Error(`Unknown operation: ${operation}`);
      }
      
      return {
        content: [{
          type: "text",
          text: result
        }]
      };
      
    } catch (error) {
      // Return error within tool response
      return {
        content: [{
          type: "text",
          text: `Error processing text: ${error.message}`
        }],
        isError: true
      };
    }
  }
});
```

### Resource Error Handling

```typescript
import { promises as fs } from 'fs';
import { pathToFileURL, fileURLToPath } from 'url';
import path from 'path';

server.addResource({
  uri: "config://{name}",
  name: "Configuration Resource",
  description: "Read configuration files",
  handler: async ({ name }) => {
    try {
      // Validate configuration name
      if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Invalid configuration name",
          {
            parameter: "name",
            provided: name,
            expected: "alphanumeric characters, hyphens, and underscores only"
          }
        );
      }
      
      // Construct safe file path
      const configDir = process.env.CONFIG_DIR || './config';
      const configPath = path.join(configDir, `${name}.json`);
      
      // Security check - ensure path is within config directory
      const resolvedPath = path.resolve(configPath);
      const resolvedConfigDir = path.resolve(configDir);
      
      if (!resolvedPath.startsWith(resolvedConfigDir)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Configuration path outside allowed directory",
          {
            parameter: "name",
            provided: name,
            allowedDirectory: configDir
          }
        );
      }
      
      // Check if file exists
      try {
        await fs.access(configPath, fs.constants.F_OK);
      } catch {
        throw new McpError(
          ErrorCode.ResourceNotFound,
          `Configuration not found: ${name}`,
          {
            uri: `config://${name}`,
            path: configPath,
            suggestion: `Create ${configPath} or check the configuration name`
          }
        );
      }
      
      // Read and parse configuration
      try {
        const content = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(content);
        
        return {
          contents: [{
            uri: `config://${name}`,
            mimeType: "application/json",
            text: JSON.stringify(config, null, 2)
          }]
        };
        
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new McpError(
            ErrorCode.InternalError,
            `Invalid JSON in configuration: ${name}`,
            {
              uri: `config://${name}`,
              path: configPath,
              parseError: error.message
            }
          );
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to read configuration: ${name}`,
          {
            uri: `config://${name}`,
            path: configPath,
            error: error.message
          }
        );
      }
      
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      
      throw new McpError(
        ErrorCode.InternalError,
        `Configuration access failed: ${name}`,
        {
          uri: `config://${name}`,
          originalError: error.message
        }
      );
    }
  }
});
```

### Middleware Integration

```typescript
import { Middleware } from "fastmcp";

class LoggingMiddleware implements Middleware {
  name = "logging";
  
  async beforeRequest(request: any): Promise<any> {
    console.log(`[${new Date().toISOString()}] Request:`, {
      method: request.method,
      params: request.params
    });
    
    // Add request timestamp
    request._timestamp = Date.now();
    return request;
  }
  
  async afterRequest(request: any, response: any): Promise<any> {
    const duration = Date.now() - request._timestamp;
    
    console.log(`[${new Date().toISOString()}] Response (${duration}ms):`, {
      method: request.method,
      success: !response.error,
      duration
    });
    
    return response;
  }
  
  async onError(request: any, error: Error): Promise<any> {
    const duration = Date.now() - request._timestamp;
    
    console.error(`[${new Date().toISOString()}] Error (${duration}ms):`, {
      method: request.method,
      error: error.message,
      duration,
      stack: error.stack
    });
    
    // Don't modify the error, just log it
    throw error;
  }
}

class RateLimitMiddleware implements Middleware {
  name = "rateLimit";
  private requests = new Map<string, number[]>();
  
  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  async beforeRequest(request: any): Promise<any> {
    const clientId = this.getClientId(request);
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get or create request history for client
    let clientRequests = this.requests.get(clientId) || [];
    
    // Remove old requests outside the time window
    clientRequests = clientRequests.filter(time => time > windowStart);
    
    // Check rate limit
    if (clientRequests.length >= this.maxRequests) {
      throw new McpError(
        -32003, // Custom rate limit error code
        "Rate limit exceeded",
        {
          clientId,
          limit: this.maxRequests,
          windowMs: this.windowMs,
          retryAfter: Math.ceil((clientRequests[0] + this.windowMs - now) / 1000)
        }
      );
    }
    
    // Add current request
    clientRequests.push(now);
    this.requests.set(clientId, clientRequests);
    
    return request;
  }
  
  async afterRequest(request: any, response: any): Promise<any> {
    return response;
  }
  
  async onError(request: any, error: Error): Promise<any> {
    throw error;
  }
  
  private getClientId(request: any): string {
    // Simple client identification - in production, use proper client identification
    return request.clientInfo?.name || 'unknown';
  }
}

// Apply middleware
server.use(new LoggingMiddleware());
server.use(new RateLimitMiddleware(50, 60000)); // 50 requests per minute
```

## Error Recovery Patterns

### Circuit Breaker Pattern

```python
import time
from enum import Enum
from typing import Callable, Any, Optional

class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered

class CircuitBreaker:
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        
        self.failure_count = 0
        self.last_failure_time: Optional[float] = None
        self.state = CircuitState.CLOSED
    
    async def call(self, func: Callable, *args, **kwargs) -> Any:
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
            else:
                raise McpError(
                    ErrorCode.INTERNAL_ERROR,
                    "Service temporarily unavailable (circuit breaker open)",
                    {
                        "circuit_breaker": {
                            "state": self.state.value,
                            "failure_count": self.failure_count,
                            "retry_after": self._time_until_retry()
                        }
                    }
                )
        
        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except self.expected_exception as e:
            self._on_failure()
            raise
    
    def _should_attempt_reset(self) -> bool:
        return (
            self.last_failure_time is not None and
            time.time() - self.last_failure_time >= self.recovery_timeout
        )
    
    def _time_until_retry(self) -> int:
        if self.last_failure_time is None:
            return 0
        return max(0, int(self.recovery_timeout - (time.time() - self.last_failure_time)))
    
    def _on_success(self):
        self.failure_count = 0
        self.state = CircuitState.CLOSED
    
    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN

# Usage in FastMCP tool
weather_api_breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=30)

@mcp.tool
async def get_weather(city: str) -> str:
    """Get weather with circuit breaker protection"""
    
    async def fetch_weather():
        # Simulate external API call
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get(f"https://api.weather.com/v1/current?q={city}") as response:
                if response.status != 200:
                    raise Exception(f"Weather API returned {response.status}")
                return await response.json()
    
    try:
        weather_data = await weather_api_breaker.call(fetch_weather)
        return f"Weather in {city}: {weather_data.get('description', 'Unknown')}"
    except McpError:
        # Circuit breaker error, return cached data or friendly message
        return f"Weather service temporarily unavailable. Please try again later."
    except Exception as e:
        return f"Unable to fetch weather for {city}: {str(e)}"
```

### Bulkhead Pattern

```typescript
class ResourcePool<T> {
  private available: T[] = [];
  private inUse: Set<T> = new Set();
  private waiting: Array<{
    resolve: (resource: T) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];
  
  constructor(
    private resources: T[],
    private maxWaitTime: number = 5000
  ) {
    this.available = [...resources];
  }
  
  async acquire(): Promise<T> {
    // Check if resource is immediately available
    if (this.available.length > 0) {
      const resource = this.available.pop()!;
      this.inUse.add(resource);
      return resource;
    }
    
    // Wait for resource to become available
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waiting.findIndex(w => w.resolve === resolve);
        if (index !== -1) {
          this.waiting.splice(index, 1);
        }
        reject(new McpError(
          ErrorCode.InternalError,
          "Resource acquisition timeout",
          {
            poolSize: this.resources.length,
            inUse: this.inUse.size,
            waiting: this.waiting.length
          }
        ));
      }, this.maxWaitTime);
      
      this.waiting.push({ resolve, reject, timeout });
    });
  }
  
  release(resource: T): void {
    if (!this.inUse.has(resource)) {
      throw new Error("Resource not in use");
    }
    
    this.inUse.delete(resource);
    
    // Serve waiting requests
    if (this.waiting.length > 0) {
      const waiter = this.waiting.shift()!;
      clearTimeout(waiter.timeout);
      this.inUse.add(resource);
      waiter.resolve(resource);
    } else {
      this.available.push(resource);
    }
  }
  
  async withResource<R>(fn: (resource: T) => Promise<R>): Promise<R> {
    const resource = await this.acquire();
    try {
      return await fn(resource);
    } finally {
      this.release(resource);
    }
  }
}

// Database connection pool example
const dbPool = new ResourcePool([
  // Mock database connections
  { id: 1, connected: true },
  { id: 2, connected: true },
  { id: 3, connected: true }
], 10000);

server.addTool({
  name: "query_database",
  description: "Query database with connection pooling",
  inputSchema: z.object({
    query: z.string(),
    params: z.array(z.any()).optional()
  }),
  handler: async ({ query, params = [] }) => {
    try {
      const result = await dbPool.withResource(async (connection) => {
        // Simulate database query
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          rows: [{ id: 1, name: "Example" }],
          count: 1
        };
      });
      
      return {
        content: [{
          type: "text",
          text: `Query executed successfully. Found ${result.count} rows.`
        }]
      };
      
    } catch (error) {
      if (error instanceof McpError) {
        return {
          content: [{
            type: "text",
            text: `Database error: ${error.message}`
          }],
          isError: true
        };
      }
      
      return {
        content: [{
          type: "text",
          text: `Unexpected database error: ${error.message}`
        }],
        isError: true
      };
    }
  }
});
```

## Testing Error Conditions

### Python Testing

```python
import pytest
from fastmcp import FastMCP
from fastmcp.exceptions import McpError, ValidationError, ErrorCode

@pytest.fixture
def mcp_server():
    return FastMCP("test-server")

@pytest.mark.asyncio
async def test_validation_error(mcp_server):
    @mcp_server.tool
    def test_tool(value: str) -> str:
        if not value:
            raise ValidationError(
                "Value cannot be empty",
                field="value",
                provided=value,
                expected="non-empty string"
            )
        return f"Processed: {value}"
    
    # Test with invalid input
    with pytest.raises(ValidationError) as exc_info:
        await mcp_server.call_tool("test_tool", {"value": ""})
    
    error = exc_info.value
    assert error.field == "value"
    assert error.provided == ""
    assert "non-empty string" in error.expected

@pytest.mark.asyncio
async def test_resource_error(mcp_server):
    @mcp_server.resource("test://{id}")
    async def test_resource(id: str) -> str:
        if id == "404":
            raise ResourceError(
                "Resource not found",
                resource_uri=f"test://{id}",
                resource_type="test"
            )
        return f"Resource {id} content"
    
    # Test with non-existent resource
    with pytest.raises(ResourceError) as exc_info:
        await mcp_server.read_resource("test://404")
    
    error = exc_info.value
    assert error.resource_uri == "test://404"
    assert error.resource_type == "test"
```

### TypeScript Testing

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { FastMCP, McpError, ErrorCode } from 'fastmcp';
import { z } from 'zod';

describe('FastMCP Error Handling', () => {
  let server: FastMCP;
  
  beforeEach(() => {
    server = new FastMCP({
      name: "test-server",
      version: "1.0.0"
    });
  });
  
  it('should handle validation errors', async () => {
    server.addTool({
      name: "test_validation",
      description: "Test validation",
      inputSchema: z.object({
        value: z.string().min(1, "Value cannot be empty")
      }),
      handler: async ({ value }) => ({
        content: [{ type: "text", text: `Value: ${value}` }]
      })
    });
    
    await expect(
      server.handleRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "test_validation",
          arguments: { value: "" }
        }
      })
    ).rejects.toThrow(
      expect.objectContaining({
        code: ErrorCode.InvalidParams
      })
    );
  });
  
  it('should handle tool errors gracefully', async () => {
    server.addTool({
      name: "test_error",
      description: "Test error handling",
      inputSchema: z.object({
        shouldFail: z.boolean()
      }),
      handler: async ({ shouldFail }) => {
        if (shouldFail) {
          return {
            content: [{ type: "text", text: "Operation failed as requested" }],
            isError: true
          };
        }
        return {
          content: [{ type: "text", text: "Operation succeeded" }]
        };
      }
    });
    
    const response = await server.handleRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "test_error",
        arguments: { shouldFail: true }
      }
    });
    
    expect(response.result.isError).toBe(true);
    expect(response.result.content[0].text).toContain("failed");
  });
});
```

This comprehensive guide covers all aspects of FastMCP error handling integration, from basic patterns to advanced resilience strategies.