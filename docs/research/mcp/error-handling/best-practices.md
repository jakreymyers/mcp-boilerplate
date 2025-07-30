# MCP Error Handling Best Practices

## Overview

This document outlines comprehensive best practices for error handling in Model Context Protocol (MCP) applications, covering both server and client implementations across different frameworks and use cases.

## Core Principles

### 1. Error Categorization
Properly categorize errors into distinct levels:

- **Protocol-Level Errors**: JSON-RPC violations, authentication failures, server unavailability
- **Tool-Level Errors**: Business logic failures, expected error conditions
- **Resource Errors**: Data access issues, file system problems
- **Transport Errors**: Network failures, connection issues

### 2. Fail Fast, Recover Gracefully
- Validate inputs early and fail fast with clear error messages
- Implement graceful degradation for non-critical failures
- Provide fallback mechanisms where appropriate

### 3. Consistent Error Interface
- Use standardized error codes across your application
- Maintain consistent error message formats
- Provide structured error data for programmatic handling

## Server-Side Best Practices

### Error Level Distinction

```typescript
// ✅ CORRECT: Protocol-level error for invalid JSON-RPC
server.setRequestHandler(async (request) => {
  if (!request.method) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "Missing required 'method' field"
    );
  }
  // ... handle request
});

// ✅ CORRECT: Tool-level error within result
server.registerTool("file-reader", async ({ path }) => {
  try {
    const content = await fs.readFile(path, 'utf8');
    return {
      content: [{ type: "text", text: content }]
    };
  } catch (error) {
    // Return error within tool result, not as protocol error
    return {
      content: [{ 
        type: "text", 
        text: `Error reading file: ${error.message}` 
      }],
      isError: true
    };
  }
});

// ❌ INCORRECT: Tool error as protocol error
server.registerTool("bad-example", async ({ path }) => {
  try {
    const content = await fs.readFile(path, 'utf8');
    return { content: [{ type: "text", text: content }] };
  } catch (error) {
    // This prevents the LLM from seeing and handling the error
    throw new McpError(ErrorCode.InternalError, error.message);
  }
});
```

### Rich Error Context

```typescript
// ✅ CORRECT: Comprehensive error context
async function readResource(uri: string): Promise<ResourceContent> {
  try {
    const filePath = uriToPath(uri);
    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    
    return {
      uri,
      content,
      mimeType: getMimeType(filePath),
      size: stats.size,
      lastModified: stats.mtime.toISOString()
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new McpError(
        ErrorCode.ResourceNotFound,
        `File not found: ${uri}`,
        {
          uri,
          path: uriToPath(uri),
          error: error.code,
          suggestion: "Check if the file exists and the path is correct",
          searched: [uriToPath(uri)],
          timestamp: new Date().toISOString()
        }
      );
    }
    
    if (error.code === 'EACCES') {
      throw new McpError(
        ErrorCode.ResourceNotFound, // Or create custom PermissionDenied code
        `Permission denied: ${uri}`,
        {
          uri,
          path: uriToPath(uri),
          error: error.code,
          permissions: "read access required",
          suggestion: "Check file permissions"
        }
      );
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      "Failed to read resource",
      {
        uri,
        originalError: error.message,
        code: error.code
      }
    );
  }
}

// ❌ INCORRECT: Minimal context
async function readResourceBad(uri: string): Promise<ResourceContent> {
  try {
    const content = await fs.readFile(uriToPath(uri), 'utf8');
    return { uri, content };
  } catch (error) {
    throw new McpError(ErrorCode.ResourceNotFound, "File not found");
  }
}
```

### Input Validation

```typescript
// ✅ CORRECT: Comprehensive validation with helpful errors
function validateToolInput(toolName: string, arguments: any, schema: JSONSchema): void {
  if (!arguments || typeof arguments !== 'object') {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Tool arguments must be an object",
      {
        tool: toolName,
        provided: typeof arguments,
        expected: "object",
        schema: schema
      }
    );
  }
  
  const validator = new JSONSchemaValidator(schema);
  const result = validator.validate(arguments);
  
  if (!result.valid) {
    const errors = result.errors.map(err => ({
      field: err.path,
      message: err.message,
      provided: err.data,
      expected: err.schema
    }));
    
    throw new McpError(
      ErrorCode.InvalidParams,
      `Validation failed for tool '${toolName}'`,
      {
        tool: toolName,
        errors,
        schema,
        provided: arguments
      }
    );
  }
}
```

### Error Recovery and Fallbacks

```typescript
// ✅ CORRECT: Graceful degradation with fallbacks
async function searchWithFallback(query: string): Promise<SearchResult[]> {
  const errors: any[] = [];
  
  // Try primary search service
  try {
    return await primarySearchService.search(query);
  } catch (error) {
    errors.push({ service: 'primary', error: error.message });
    
    // Try secondary search service
    try {
      const results = await secondarySearchService.search(query);
      return results.map(r => ({ ...r, source: 'fallback' }));
    } catch (fallbackError) {
      errors.push({ service: 'secondary', error: fallbackError.message });
      
      // Return cached results if available
      const cached = await getCachedResults(query);
      if (cached.length > 0) {
        return cached.map(r => ({ ...r, source: 'cache', stale: true }));
      }
      
      // Final fallback with error information
      throw new McpError(
        ErrorCode.InternalError,
        "All search services unavailable",
        {
          query,
          errors,
          services: ['primary', 'secondary', 'cache'],
          suggestion: "Try again later or use a different query"
        }
      );
    }
  }
}
```

### Timeout Handling

```typescript
// ✅ CORRECT: Proper timeout with cleanup
async function operationWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 30000,
  operationName: string = 'operation'
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new McpError(
        ErrorCode.InternalError,
        `Operation timed out after ${timeoutMs}ms`,
        {
          operation: operationName,
          timeout: timeoutMs,
          timestamp: new Date().toISOString()
        }
      ));
    }, timeoutMs);
  });
  
  try {
    const result = await Promise.race([operation(), timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      `${operationName} failed: ${error.message}`,
      {
        operation: operationName,
        originalError: error.message
      }
    );
  }
}
```

## Client-Side Best Practices

### Comprehensive Error Handling

```typescript
class MCPErrorHandler {
  async callTool(toolName: string, args: any): Promise<ToolResult> {
    try {
      const result = await this.client.request({
        method: "tools/call",
        params: { name: toolName, arguments: args }
      });
      
      // Check for tool-level errors
      if (result.isError) {
        return {
          success: false,
          error: result.content[0]?.text || "Tool execution failed",
          retryable: this.isRetryableToolError(result)
        };
      }
      
      return { success: true, data: result.content };
      
    } catch (error) {
      if (error instanceof McpError) {
        return this.handleMcpError(error, toolName, args);
      }
      
      // Network or other transport errors
      return {
        success: false,
        error: "Connection error",
        retryable: true,
        details: error.message
      };
    }
  }
  
  private handleMcpError(error: McpError, toolName: string, args: any): ToolResult {
    switch (error.code) {
      case ErrorCode.MethodNotFound:
        return {
          success: false,
          error: `Tool '${toolName}' is not available`,
          retryable: false,
          suggestion: "Check if the tool is supported by this server"
        };
        
      case ErrorCode.InvalidParams:
        return {
          success: false,
          error: "Invalid parameters provided",
          retryable: false,
          details: error.data,
          suggestion: "Check the tool's parameter requirements"
        };
        
      case ErrorCode.InternalError:
        return {
          success: false,
          error: "Server error occurred",
          retryable: true,
          details: error.data
        };
        
      case ErrorCode.ResourceNotFound:
        return {
          success: false,
          error: "Required resource not found",
          retryable: false,
          details: error.data
        };
        
      default:
        return {
          success: false,
          error: `Unknown error (${error.code}): ${error.message}`,
          retryable: false,
          details: error.data
        };
    }
  }
  
  private isRetryableToolError(result: any): boolean {
    const errorText = result.content[0]?.text?.toLowerCase() || '';
    const retryableKeywords = [
      'timeout', 'unavailable', 'busy', 'rate limit', 'temporarily'
    ];
    return retryableKeywords.some(keyword => errorText.includes(keyword));
  }
}
```

### Retry Logic with Exponential Backoff

```typescript
class RetryableClient {
  async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      retryCondition = this.defaultRetryCondition
    } = options;
    
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries || !retryCondition(error, attempt)) {
          throw error;
        }
        
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt),
          maxDelay
        );
        
        console.warn(
          `Attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
          error.message
        );
        
        await this.delay(delay);
      }
    }
    
    throw lastError;
  }
  
  private defaultRetryCondition(error: any, attempt: number): boolean {
    if (error instanceof McpError) {
      const retryableCodes = [
        ErrorCode.InternalError,
        // Add custom codes that are retryable
      ];
      return retryableCodes.includes(error.code);
    }
    
    // Network errors are typically retryable
    return error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT' ||
           error.code === 'ENOTFOUND';
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Framework-Specific Patterns

### FastMCP (Python)

```python
from fastmcp import FastMCP
from fastmcp.exceptions import McpError, ErrorCode
import logging

logger = logging.getLogger(__name__)

mcp = FastMCP("best-practices-server")

@mcp.tool
def process_document(content: str, format: str = "text") -> str:
    """Process document with comprehensive error handling"""
    
    # Input validation
    if not content or not content.strip():
        raise McpError(
            ErrorCode.INVALID_PARAMS,
            "Document content cannot be empty",
            {
                "parameter": "content",
                "provided": f"'{content}'" if content else "None",
                "expected": "non-empty string"
            }
        )
    
    if format not in ["text", "markdown", "html"]:
        raise McpError(
            ErrorCode.INVALID_PARAMS,
            f"Unsupported format: {format}",
            {
                "parameter": "format",
                "provided": format,
                "supported": ["text", "markdown", "html"]
            }
        )
    
    try:
        # Process the document
        result = complex_document_processing(content, format)
        
        if not result:
            # Return error within tool response
            return "Error: Document processing returned empty result"
        
        return result
        
    except ProcessingTimeout as e:
        logger.warning(f"Document processing timeout: {e}")
        return f"Error: Processing timeout - document too large or complex"
        
    except ProcessingError as e:
        logger.error(f"Document processing failed: {e}")
        return f"Error: {str(e)}"
        
    except Exception as e:
        # Log unexpected errors
        logger.exception("Unexpected error in document processing")
        return f"Error: An unexpected error occurred during processing"

@mcp.error_handler
async def global_error_handler(error: Exception) -> dict:
    """Global error handler for unhandled exceptions"""
    if isinstance(error, McpError):
        return {
            "code": error.code,
            "message": error.message,
            "data": error.data
        }
    
    # Log unexpected errors
    logger.exception("Unhandled error in MCP server")
    
    return {
        "code": ErrorCode.INTERNAL_ERROR,
        "message": "An internal server error occurred",
        "data": {
            "type": type(error).__name__,
            "timestamp": datetime.utcnow().isoformat()
        }
    }
```

### MCP SDK (TypeScript)

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

class BestPracticesServer {
  private server: Server;
  
  constructor() {
    this.server = new Server({
      name: "best-practices-server",
      version: "1.0.0"
    });
    
    this.setupErrorHandling();
    this.setupRequestHandlers();
  }
  
  private setupErrorHandling(): void {
    // Global error handler
    this.server.onerror = (error) => {
      console.error("MCP Server Error:", {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      // Optionally send to monitoring service
      this.reportError(error);
    };
    
    // Process error handler
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      // Application specific logging, throwing an error, or other logic here
    });
    
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      // Graceful shutdown
      this.gracefulShutdown();
    });
  }
  
  private setupRequestHandlers(): void {
    // Tool handler with comprehensive error handling
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        // Validate tool exists
        if (!this.tools.has(name)) {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`,
            {
              tool: name,
              availableTools: Array.from(this.tools.keys())
            }
          );
        }
        
        const tool = this.tools.get(name)!;
        
        // Validate arguments
        this.validateArguments(args, tool.inputSchema, name);
        
        // Execute tool with timeout
        const result = await this.executeWithTimeout(
          () => tool.handler(args),
          30000,
          `Tool execution: ${name}`
        );
        
        return result;
        
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        
        // Convert unexpected errors
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${name}`,
          {
            tool: name,
            error: error.message,
            timestamp: new Date().toISOString()
          }
        );
      }
    });
  }
  
  private validateArguments(args: any, schema: any, toolName: string): void {
    // Implementation of argument validation
    const validator = new Ajv();
    const validate = validator.compile(schema);
    
    if (!validate(args)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid arguments for tool '${toolName}'`,
        {
          tool: toolName,
          errors: validate.errors,
          provided: args,
          schema
        }
      );
    }
  }
  
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    operationName: string
  ): Promise<T> {
    return operationWithTimeout(fn, timeoutMs, operationName);
  }
  
  private reportError(error: Error): void {
    // Send to monitoring service (DataDog, Sentry, etc.)
    // Implementation depends on your monitoring solution
  }
  
  private gracefulShutdown(): void {
    console.log('Starting graceful shutdown...');
    // Close database connections, clean up resources, etc.
    process.exit(1);
  }
}
```

## Logging and Monitoring

### Structured Logging

```typescript
interface ErrorLogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  errorCode?: number;
  errorData?: any;
  context: {
    method?: string;
    tool?: string;
    resource?: string;
    user?: string;
    session?: string;
  };
  stack?: string;
}

class ErrorLogger {
  log(entry: ErrorLogEntry): void {
    const logEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString()
    };
    
    console.log(JSON.stringify(logEntry));
    
    // Send to logging service
    this.sendToLoggingService(logEntry);
  }
  
  logMcpError(error: McpError, context: any = {}): void {
    this.log({
      level: 'error',
      message: error.message,
      errorCode: error.code,
      errorData: error.data,
      context,
      stack: error.stack
    });
  }
  
  private sendToLoggingService(entry: ErrorLogEntry): void {
    // Implementation for external logging service
  }
}
```

### Error Metrics

```typescript
class ErrorMetrics {
  private static instance: ErrorMetrics;
  private counters = new Map<string, number>();
  
  static getInstance(): ErrorMetrics {
    if (!ErrorMetrics.instance) {
      ErrorMetrics.instance = new ErrorMetrics();
    }
    return ErrorMetrics.instance;
  }
  
  incrementErrorCounter(errorCode: number, context: string = 'general'): void {
    const key = `error_${errorCode}_${context}`;
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + 1);
    
    // Send to metrics service
    this.sendMetric(key, current + 1);
  }
  
  private sendMetric(key: string, value: number): void {
    // Send to metrics service (Prometheus, CloudWatch, etc.)
  }
  
  getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.counters);
  }
}
```

## Testing Error Conditions

### Unit Tests for Error Handling

```typescript
describe('Error Handling', () => {
  it('should throw InvalidParams for missing required parameters', async () => {
    await expect(
      server.callTool('test-tool', {})
    ).rejects.toThrow(
      expect.objectContaining({
        code: ErrorCode.InvalidParams,
        message: expect.stringContaining('required parameter')
      })
    );
  });
  
  it('should handle timeout gracefully', async () => {
    const slowOperation = () => new Promise(resolve => 
      setTimeout(resolve, 5000)
    );
    
    await expect(
      operationWithTimeout(slowOperation, 1000, 'slow-test')
    ).rejects.toThrow(
      expect.objectContaining({
        code: ErrorCode.InternalError,
        message: expect.stringContaining('timed out')
      })
    );
  });
  
  it('should provide fallback results when primary service fails', async () => {
    // Mock primary service to fail
    jest.spyOn(primaryService, 'getData').mockRejectedValue(
      new Error('Service unavailable')
    );
    
    // Mock fallback service to succeed
    jest.spyOn(fallbackService, 'getData').mockResolvedValue(
      { data: 'fallback-data', source: 'fallback' }
    );
    
    const result = await dataService.getDataWithFallback('test-query');
    
    expect(result.source).toBe('fallback');
    expect(result.data).toBe('fallback-data');
  });
});
```

## Summary Checklist

### Server Implementation
- [ ] Use appropriate error levels (protocol vs. tool)
- [ ] Provide rich error context with structured data
- [ ] Implement proper input validation
- [ ] Handle timeouts gracefully
- [ ] Implement fallback mechanisms where appropriate
- [ ] Log errors with structured data
- [ ] Set up error monitoring and alerts

### Client Implementation
- [ ] Handle all MCP error codes appropriately
- [ ] Implement retry logic for transient failures
- [ ] Provide user-friendly error messages
- [ ] Parse error context for programmatic handling
- [ ] Implement circuit breaker patterns for unreliable services

### General
- [ ] Document custom error codes
- [ ] Test error conditions thoroughly
- [ ] Monitor error rates and patterns
- [ ] Implement graceful degradation
- [ ] Follow consistent error message formats

These best practices ensure robust, maintainable, and user-friendly error handling in MCP applications.