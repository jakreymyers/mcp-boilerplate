# MCP Error Handling Research

This directory contains comprehensive documentation on error handling patterns for Model Context Protocol (MCP) servers, covering both the official MCP SDK and FastMCP frameworks.

## Documentation Overview

### Core Documentation
- **[McpError Class](./mcp-error-class.md)** - Deep dive into the McpError class definition, usage, and patterns
- **[Error Codes](./error-codes.md)** - Complete reference of standard MCP error codes and their meanings
- **[Error Response Patterns](./error-response-patterns.md)** - Standard error response formats and structures

### Framework-Specific Documentation
- **[MCP SDK Error Handling](./mcp-sdk-patterns.md)** - Error handling patterns using the official MCP SDK
- **[FastMCP Integration](./fastmcp-integration.md)** - Error handling with FastMCP framework
- **[Transport Layer Errors](./transport-errors.md)** - Transport-specific error handling patterns

### Advanced Topics
- **[Custom Error Types](./custom-error-types.md)** - Creating and implementing custom error types
- **[Error Propagation](./error-propagation.md)** - Error propagation mechanisms and best practices
- **[Client Error Handling](./client-error-handling.md)** - Error handling from the client perspective

### Best Practices
- **[Error Handling Best Practices](./best-practices.md)** - Comprehensive guide to error handling best practices
- **[Tool Error Handling](./tool-error-handling.md)** - Specific patterns for handling errors in MCP tools
- **[Resource Error Handling](./resource-error-handling.md)** - Error handling for MCP resources

## Key Concepts

### Error Types
1. **Protocol-Level Errors** - JSON-RPC protocol violations, authentication failures
2. **Tool-Level Errors** - Business logic errors within tool execution
3. **Resource Errors** - Resource access and availability issues
4. **Transport Errors** - Communication layer failures

### Error Codes (JSON-RPC Standard)
- `-32700` - Parse Error (Invalid JSON)
- `-32600` - Invalid Request (Invalid JSON-RPC object)
- `-32601` - Method Not Found (Method doesn't exist)
- `-32602` - Invalid Params (Invalid method parameters)
- `-32603` - Internal Error (Internal JSON-RPC error)
- `-32002` - Resource Not Found (MCP-specific)

### Framework Integration
- **MCP SDK**: Direct use of McpError class with proper error codes
- **FastMCP**: Higher-level error handling with automatic validation
- **Transport Layer**: Connection and message transmission error handling

## Usage Guidelines

### For Server Developers
1. Use appropriate error levels (protocol vs. tool)
2. Provide meaningful error messages with context
3. Implement proper error recovery mechanisms
4. Follow standard error code conventions

### For Client Developers
1. Handle both protocol and tool-level errors
2. Implement retry logic for transient failures
3. Parse error responses properly
4. Provide user-friendly error messages

## Quick Reference

### Basic Error Response Structure
```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "details": "Additional context"
    }
  }
}
```

### Tool Error Response
```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "result": {
    "content": [{
      "type": "text",
      "text": "Error: Operation failed"
    }],
    "isError": true
  }
}
```

This documentation provides comprehensive coverage of MCP error handling patterns, from basic concepts to advanced implementation strategies.