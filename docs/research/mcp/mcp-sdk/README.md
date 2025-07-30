# MCP SDK Research Documentation

This directory contains comprehensive research on the Model Context Protocol (MCP) TypeScript SDK, covering the latest features, implementation patterns, and best practices.

## Contents

### [Overview](./overview.md)
- Core concepts and architecture
- Purpose and benefits of MCP
- Available SDKs and official resources
- Protocol foundation and timeline

### [Latest SDK Version](./sdk-version-latest.md)
- Current version: `@modelcontextprotocol/sdk` v1.17.0
- Protocol version 2025-06-18 features
- Installation requirements and dependencies
- Download statistics and adoption metrics

### [Tools API](./tools-api.md)
- Tool definition and registration
- Schema validation with Zod
- Response formats and error handling
- Advanced tool features and best practices

### [Error Handling](./error-handling.md)
- McpError class and error codes
- Protocol-level vs application-level errors
- Tool error handling patterns
- Retry logic and recovery strategies

### [TypeScript Types](./typescript-types.md)
- Core type definitions and interfaces
- Content types (text, image, resource)
- Request/response schemas
- Zod integration and type inference

### [Server Creation](./server-creation.md)
- Basic and advanced server setup
- Transport configuration (stdio, HTTP)
- Resource, tool, and prompt registration
- Complete server implementation examples

### [Client Integration](./client-integration.md)
- Client setup and connection management
- Working with resources, tools, and prompts
- Advanced features (retry logic, event handling)
- Complete client application examples

### [Protocol Specification 2025](./protocol-specification-2025.md)
- 2025-06-18 specification features
- Enhanced authentication protocol
- Elicitation support for user interaction
- Structured tool output and resource links

## Quick Start

### Installation

```bash
npm install @modelcontextprotocol/sdk
```

**Requirements**: Node.js v18.x or higher

### Basic Server

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "my-server",
  version: "1.0.0"
});

server.registerTool("echo", {
  title: "Echo Tool",
  description: "Echo back the input",
  inputSchema: {
    message: z.string().describe("Message to echo")
  }
}, async ({ message }) => ({
  content: [{ type: "text", text: `Echo: ${message}` }]
}));

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Basic Client

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({
  name: "my-client",
  version: "1.0.0"
});

const transport = new StdioClientTransport({
  command: "node",
  args: ["server.js"]
});

await client.connect(transport);

const result = await client.request({
  method: "tools/call",
  params: {
    name: "echo",
    arguments: { message: "Hello, MCP!" }
  }
}, CallToolRequestSchema);
```

## Key Features

### Core Capabilities
- **Tools**: Execute functions with type-safe parameters
- **Resources**: Access data sources with URI-based addressing
- **Prompts**: Reusable interaction templates for LLMs

### Protocol Features
- **JSON-RPC 2.0**: Standardized message format
- **Stateful**: Persistent connections with session management
- **Type Safety**: Full TypeScript support with Zod validation
- **Transport Agnostic**: stdio, HTTP, and custom transport support

### 2025-06-18 Enhancements
- **Enhanced Authentication**: OAuth 2.0 integration
- **Elicitation**: Interactive user input during tool execution
- **Structured Output**: Defined schemas for tool responses
- **Resource Links**: Enhanced resource referencing in responses

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│      Host       │    │     Client      │    │     Server      │
│   (Claude,      │    │   (In Host)     │    │   (External)    │
│    IDE, etc.)   │◄──►│                 │◄──►│                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                         │
                              │                         │
                         ┌─────────┐              ┌─────────┐
                         │Transport│              │Resources│
                         │(stdio/  │              │Tools    │
                         │ HTTP)   │              │Prompts  │
                         └─────────┘              └─────────┘
```

## Best Practices

### Error Handling
- Use McpError for protocol-level errors
- Return errors within tool responses for business logic issues
- Implement proper timeout and retry mechanisms

### Type Safety
- Leverage Zod schemas for runtime validation
- Use TypeScript's type inference for parameter safety
- Define clear interfaces for complex data structures

### Performance
- Implement connection pooling for multiple servers
- Use pagination for large resource lists
- Cache frequently accessed resources and tool lists

### Security
- Validate all user inputs with appropriate schemas
- Implement proper authentication for sensitive operations
- Use secure transports (HTTPS) for remote connections
- Sanitize resource URIs and metadata

## Official Resources

- **Documentation**: https://modelcontextprotocol.io
- **Specification**: https://spec.modelcontextprotocol.io
- **GitHub**: https://github.com/modelcontextprotocol/typescript-sdk
- **npm Package**: https://www.npmjs.com/package/@modelcontextprotocol/sdk

---

*Research conducted on July 30, 2025*  
*SDK Version: 1.17.0*  
*Protocol Version: 2025-06-18*