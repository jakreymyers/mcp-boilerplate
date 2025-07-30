# Tool Error Handling in MCP

## Overview

Tool error handling in MCP requires special consideration because tool errors should be reported within the tool result rather than as protocol-level errors. This allows AI models to see and respond to tool failures appropriately.

## Core Principle: Tool vs Protocol Errors

### Protocol-Level Errors (Use McpError)
- Invalid tool names
- Malformed parameters
- Authentication failures
- Server unavailability

### Tool-Level Errors (Use `isError` flag)
- Business logic failures
- External service errors
- Data processing errors
- Expected failure conditions

## Basic Tool Error Patterns

### TypeScript Tool Error Handling

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const server = new Server({
  name: "tool-error-example",
  version: "1.0.0"
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case "file_reader":
      return await handleFileReader(args);
    case "calculator":
      return await handleCalculator(args);
    case "weather_api":
      return await handleWeatherAPI(args);
    default:
      // This IS a protocol error - unknown tool
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${name}`,
        { availableTools: ["file_reader", "calculator", "weather_api"] }
      );
  }
});

// ✅ CORRECT: Tool-level error handling
async function handleFileReader(args: any): Promise<CallToolResult> {
  try {
    const { path } = args;
    
    if (!path) {
      // Parameter validation error - return in tool result
      return {
        content: [{
          type: "text",
          text: "Error: 'path' parameter is required"
        }],
        isError: true
      };
    }
    
    const content = await fs.readFile(path, 'utf8');
    
    return {
      content: [{
        type: "text",
        text: content
      }]
    };
    
  } catch (error) {
    // File system errors - return in tool result
    if (error.code === 'ENOENT') {
      return {
        content: [{
          type: "text",
          text: `Error: File not found - ${args.path}`
        }],
        isError: true
      };
    }
    
    if (error.code === 'EACCES') {
      return {
        content: [{
          type: "text",
          text: `Error: Permission denied - ${args.path}`
        }],
        isError: true
      };
    }
    
    return {
      content: [{
        type: "text",
        text: `Error: Failed to read file - ${error.message}`
      }],
      isError: true
    };
  }
}

// ❌ INCORRECT: Tool error as protocol error
async function handleFileReaderWrong(args: any): Promise<CallToolResult> {
  try {
    const content = await fs.readFile(args.path, 'utf8');
    return {
      content: [{ type: "text", text: content }]
    };
  } catch (error) {
    // This prevents the AI from seeing the error!
    throw new McpError(ErrorCode.InternalError, error.message);
  }
}
```

### Python Tool Error Handling

```python
import mcp.types as types
from mcp.server import Server

app = Server("tool-error-example")

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    if name == "text_processor":
        return await handle_text_processor(arguments)
    elif name == "data_analyzer":
        return await handle_data_analyzer(arguments)
    elif name == "api_client":
        return await handle_api_client(arguments)
    else:
        # Protocol error for unknown tool
        raise ValueError(f"Unknown tool: {name}")

# ✅ CORRECT: Tool-level error handling
async def handle_text_processor(args: dict) -> list[types.TextContent]:
    try:
        text = args.get("text")
        operation = args.get("operation", "uppercase")
        
        if not text:
            # Return error within tool response
            return [types.TextContent(
                type="text",
                text="Error: 'text' parameter is required"
            )]
        
        if operation not in ["uppercase", "lowercase", "reverse"]:
            return [types.TextContent(
                type="text",
                text=f"Error: Unsupported operation '{operation}'. "
                     f"Supported: uppercase, lowercase, reverse"
            )]
        
        # Process text
        if operation == "uppercase":
            result = text.upper()
        elif operation == "lowercase":
            result = text.lower()
        elif operation == "reverse":
            result = text[::-1]
        
        return [types.TextContent(
            type="text",
            text=f"Processed text: {result}"
        )]
        
    except Exception as e:
        # Return error within tool response
        return [types.TextContent(
            type="text",
            text=f"Error: Text processing failed - {str(e)}"
        )]

async def handle_data_analyzer(args: dict) -> list[types.TextContent]:
    try:
        data = args.get("data")
        analysis_type = args.get("type", "summary")
        
        if not data:
            return [types.TextContent(
                type="text",
                text="Error: No data provided for analysis"
            )]
        
        if not isinstance(data, (list, dict)):
            return [types.TextContent(
                type="text",
                text="Error: Data must be a list or dictionary"
            )]
        
        # Perform analysis
        if analysis_type == "summary":
            if isinstance(data, list):
                result = f"List contains {len(data)} items"
            else:
                result = f"Dictionary contains {len(data)} keys"
        elif analysis_type == "details":
            result = f"Data structure: {type(data).__name__}, Content: {str(data)[:100]}..."
        else:
            return [types.TextContent(
                type="text",
                text=f"Error: Unknown analysis type '{analysis_type}'"
            )]
        
        return [types.TextContent(
            type="text",
            text=f"Analysis result: {result}"
        )]
        
    except Exception as e:
        return [types.TextContent(
            type="text",
            text=f"Error: Data analysis failed - {str(e)}"
        )]
```

## Advanced Tool Error Patterns

### Structured Error Response

```typescript
interface ToolErrorInfo {
  error: string;
  code?: string;
  details?: any;
  suggestions?: string[];
  retryable?: boolean;
}

function createToolError(errorInfo: ToolErrorInfo): CallToolResult {
  const errorMessage = [
    `Error: ${errorInfo.error}`,
    errorInfo.code ? `Code: ${errorInfo.code}` : null,
    errorInfo.details ? `Details: ${JSON.stringify(errorInfo.details)}` : null,
    errorInfo.suggestions ? `Suggestions: ${errorInfo.suggestions.join(', ')}` : null,
    errorInfo.retryable !== undefined ? `Retryable: ${errorInfo.retryable}` : null
  ].filter(Boolean).join('\n');
  
  return {
    content: [{
      type: "text",
      text: errorMessage
    }],
    isError: true
  };
}

async function handleAPIClient(args: any): Promise<CallToolResult> {
  try {
    const { url, method = 'GET', headers = {}, body } = args;
    
    // Validate URL
    try {
      new URL(url);
    } catch {
      return createToolError({
        error: "Invalid URL format",
        code: "INVALID_URL",
        details: { provided: url },
        suggestions: ["Provide a valid HTTP/HTTPS URL"],
        retryable: false
      });
    }
    
    // Make API request
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    
    if (!response.ok) {
      return createToolError({
        error: `HTTP request failed`,
        code: `HTTP_${response.status}`,
        details: {
          status: response.status,
          statusText: response.statusText,
          url
        },
        suggestions: response.status >= 500 ? ["Retry the request"] : ["Check the URL and parameters"],
        retryable: response.status >= 500
      });
    }
    
    const data = await response.text();
    
    return {
      content: [{
        type: "text",
        text: `API Response (${response.status}): ${data}`
      }]
    };
    
  } catch (error) {
    return createToolError({
      error: "Network request failed",
      code: "NETWORK_ERROR",
      details: { message: error.message },
      suggestions: ["Check network connectivity", "Verify the URL is accessible"],
      retryable: true
    });
  }
}
```

### Error Recovery and Fallbacks

```typescript
async function handleDatabaseQuery(args: any): Promise<CallToolResult> {
  const { query, params = [] } = args;
  const errors: string[] = [];
  
  // Try primary database
  try {
    const result = await primaryDB.query(query, params);
    return {
      content: [{
        type: "text",
        text: `Query executed successfully. Found ${result.rowCount} rows.\n${JSON.stringify(result.rows, null, 2)}`
      }]
    };
  } catch (error) {
    errors.push(`Primary DB: ${error.message}`);
    
    // Try read replica
    try {
      const result = await readReplicaDB.query(query, params);
      return {
        content: [{
          type: "text",
          text: `Query executed on read replica. Found ${result.rowCount} rows.\n${JSON.stringify(result.rows, null, 2)}\n\nNote: Primary database is unavailable.`
        }]
      };
    } catch (replicaError) {
      errors.push(`Read Replica: ${replicaError.message}`);
      
      // Try cached results for SELECT queries
      if (query.trim().toLowerCase().startsWith('select')) {
        try {
          const cachedResult = await getCachedQueryResult(query, params);
          if (cachedResult) {
            return {
              content: [{
                type: "text",
                text: `Cached query result (may be stale):\n${JSON.stringify(cachedResult, null, 2)}\n\nNote: All databases are unavailable, showing cached data.`
              }]
            };
          }
        } catch (cacheError) {
          errors.push(`Cache: ${cacheError.message}`);
        }
      }
      
      // All options exhausted
      return {
        content: [{
          type: "text",
          text: `Error: Database query failed on all sources.\n\nErrors encountered:\n${errors.join('\n')}\n\nSuggestions:\n- Check database connectivity\n- Verify query syntax\n- Try again later`
        }],
        isError: true
      };
    }
  }
}
```

### Tool Error Context and Debugging

```python
import traceback
import uuid
from datetime import datetime
from typing import Dict, Any, Optional

class ToolErrorHandler:
    def __init__(self, tool_name: str):
        self.tool_name = tool_name
        self.error_history: Dict[str, Any] = {}
    
    def create_error_response(
        self,
        error_message: str,
        error_type: str = "TOOL_ERROR",
        details: Optional[Dict[str, Any]] = None,
        include_debug: bool = False
    ) -> list[types.TextContent]:
        
        error_id = str(uuid.uuid4())[:8]
        timestamp = datetime.utcnow().isoformat()
        
        # Store error for debugging
        self.error_history[error_id] = {
            "message": error_message,
            "type": error_type,
            "details": details,
            "timestamp": timestamp,
            "tool": self.tool_name
        }
        
        # Build error response
        error_text = f"Error [{error_id}]: {error_message}"
        
        if details:
            error_text += f"\nDetails: {details}"
        
        if include_debug:
            error_text += f"\nError ID: {error_id}"
            error_text += f"\nTimestamp: {timestamp}"
            error_text += f"\nTool: {self.tool_name}"
        
        return [types.TextContent(
            type="text",
            text=error_text
        )]
    
    def handle_exception(
        self,
        exception: Exception,
        context: Optional[Dict[str, Any]] = None,
        include_traceback: bool = False
    ) -> list[types.TextContent]:
        
        error_details = {
            "exception_type": type(exception).__name__,
            "context": context or {}
        }
        
        if include_traceback:
            error_details["traceback"] = traceback.format_exc()
        
        return self.create_error_response(
            str(exception),
            "EXCEPTION",
            error_details,
            include_debug=True
        )

# Usage in tools
text_processor_errors = ToolErrorHandler("text_processor")

async def handle_text_processor_with_debugging(args: dict) -> list[types.TextContent]:
    try:
        text = args.get("text")
        operation = args.get("operation")
        
        # Validate inputs
        if not text:
            return text_processor_errors.create_error_response(
                "Missing required parameter 'text'",
                "VALIDATION_ERROR",
                {"provided_args": list(args.keys())}
            )
        
        if operation not in ["encode", "decode", "hash"]:
            return text_processor_errors.create_error_response(
                f"Unsupported operation '{operation}'",
                "VALIDATION_ERROR",
                {
                    "provided": operation,
                    "supported": ["encode", "decode", "hash"]
                }
            )
        
        # Process text
        if operation == "encode":
            import base64
            result = base64.b64encode(text.encode()).decode()
        elif operation == "decode":
            import base64
            try:
                result = base64.b64decode(text.encode()).decode()
            except Exception as e:
                return text_processor_errors.create_error_response(
                    "Invalid base64 input for decode operation",
                    "DECODE_ERROR",
                    {"input_length": len(text), "error": str(e)}
                )
        elif operation == "hash":
            import hashlib
            result = hashlib.sha256(text.encode()).hexdigest()
        
        return [types.TextContent(
            type="text",
            text=f"Operation '{operation}' completed successfully: {result}"
        )]
        
    except Exception as e:
        return text_processor_errors.handle_exception(
            e,
            context={"args": args},
            include_traceback=True
        )
```

## Tool Error Testing

### Unit Testing Tool Errors

```typescript
import { describe, it, expect } from '@jest/globals';

describe('Tool Error Handling', () => {
  it('should return error in tool result for invalid parameters', async () => {
    const result = await handleFileReader({ path: null });
    
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Error:");
    expect(result.content[0].text).toContain("path");
  });
  
  it('should handle file not found gracefully', async () => {
    const result = await handleFileReader({ path: "/nonexistent/file.txt" });
    
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("File not found");
  });
  
  it('should provide helpful error messages', async () => {
    const result = await handleCalculator({ 
      operation: "divide", 
      a: 10, 
      b: 0 
    });
    
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("division by zero");
  });
  
  it('should handle network errors with retry suggestions', async () => {
    // Mock network failure
    jest.spyOn(global, 'fetch').mockRejectedValue(
      new Error('Network error')
    );
    
    const result = await handleAPIClient({ 
      url: "https://api.example.com/data" 
    });
    
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Network request failed");
    expect(result.content[0].text).toContain("retryable: true");
  });
});
```

### Integration Testing

```python
import pytest
from unittest.mock import patch, MagicMock

@pytest.mark.asyncio
async def test_database_tool_with_fallbacks():
    """Test database tool falls back to replica and cache"""
    
    # Mock primary database failure
    with patch('primaryDB.query') as mock_primary:
        mock_primary.side_effect = Exception("Connection failed")
        
        # Mock replica success
        with patch('readReplicaDB.query') as mock_replica:
            mock_replica.return_value = MagicMock(
                rowCount=1,
                rows=[{"id": 1, "name": "test"}]
            )
            
            result = await handle_database_query({
                "query": "SELECT * FROM users",
                "params": []
            })
            
            # Should succeed with replica
            assert not result.get("isError", False)
            assert "read replica" in result["content"][0]["text"]
            assert "Primary database is unavailable" in result["content"][0]["text"]

@pytest.mark.asyncio
async def test_database_tool_all_sources_failed():
    """Test database tool when all sources fail"""
    
    error_msg = "All connections failed"
    
    with patch('primaryDB.query') as mock_primary, \
         patch('readReplicaDB.query') as mock_replica, \
         patch('getCachedQueryResult') as mock_cache:
        
        mock_primary.side_effect = Exception("Primary failed")
        mock_replica.side_effect = Exception("Replica failed")
        mock_cache.return_value = None
        
        result = await handle_database_query({
            "query": "SELECT * FROM users",
            "params": []
        })
        
        # Should return error
        assert result.get("isError", False) == True
        assert "failed on all sources" in result["content"][0]["text"]
        assert "Primary: Primary failed" in result["content"][0]["text"]
        assert "Read Replica: Replica failed" in result["content"][0]["text"]
```

## Error Monitoring and Analytics

### Error Tracking

```typescript
interface ToolErrorMetrics {
  toolName: string;
  errorType: string;
  errorCount: number;
  lastOccurrence: string;
  errorRate: number; // errors per hour
}

class ToolErrorTracker {
  private errors = new Map<string, ToolErrorMetrics>();
  
  recordError(toolName: string, errorType: string): void {
    const key = `${toolName}:${errorType}`;
    const existing = this.errors.get(key);
    
    if (existing) {
      existing.errorCount++;
      existing.lastOccurrence = new Date().toISOString();
      existing.errorRate = this.calculateErrorRate(existing);
    } else {
      this.errors.set(key, {
        toolName,
        errorType,
        errorCount: 1,
        lastOccurrence: new Date().toISOString(),
        errorRate: 1
      });
    }
    
    // Alert if error rate is high
    const metrics = this.errors.get(key)!;
    if (metrics.errorRate > 10) { // More than 10 errors per hour
      this.sendAlert(metrics);
    }
  }
  
  private calculateErrorRate(metrics: ToolErrorMetrics): number {
    // Simplified rate calculation
    return metrics.errorCount; // In a real implementation, calculate per time window
  }
  
  private sendAlert(metrics: ToolErrorMetrics): void {
    console.warn(`High error rate detected:`, metrics);
    // Send to monitoring service
  }
  
  getErrorSummary(): ToolErrorMetrics[] {
    return Array.from(this.errors.values())
      .sort((a, b) => b.errorRate - a.errorRate);
  }
}

const errorTracker = new ToolErrorTracker();

// Use in tool handlers
async function handleToolWithTracking(name: string, args: any): Promise<CallToolResult> {
  try {
    const result = await handleTool(name, args);
    
    if (result.isError) {
      // Extract error type from result
      const errorType = extractErrorType(result.content[0].text);
      errorTracker.recordError(name, errorType);
    }
    
    return result;
  } catch (error) {
    errorTracker.recordError(name, 'PROTOCOL_ERROR');
    throw error;
  }
}
```

## Best Practices Summary

### DO ✅
- Return errors within tool results using `isError: true`
- Provide clear, actionable error messages
- Include context and suggestions for fixing errors
- Implement fallback mechanisms where appropriate
- Log errors for monitoring and debugging
- Test error conditions thoroughly

### DON'T ❌
- Throw protocol-level errors for business logic failures
- Return generic error messages without context
- Ignore error conditions or fail silently
- Mix tool errors with protocol errors
- Expose sensitive information in error messages
- Forget to handle edge cases and validation

### Error Message Guidelines
- Start with "Error:" for clarity
- Include specific details about what went wrong
- Provide suggestions for resolution when possible
- Use structured error information for debugging
- Consider the AI model's ability to interpret and act on errors

This comprehensive guide ensures robust and user-friendly tool error handling in MCP applications.