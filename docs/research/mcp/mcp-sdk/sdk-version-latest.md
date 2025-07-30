# MCP SDK Latest Version Information

## Current Version: 1.17.0
**Published**: 5 days ago (as of July 30, 2025)  
**Package**: `@modelcontextprotocol/sdk`

## Installation

```bash
npm install @modelcontextprotocol/sdk
```

**Requirements**: Node.js v18.x or higher

## Recent Version History

- **1.17.0** - Latest (Published 5 days ago)
- **1.16.0** - Recent stable release
- **1.15.1** - Bug fix release
- **1.15.0** - Feature release

## Download Statistics

- **Weekly Downloads**: 4,150,293
- **Peak Downloads**: 6,554,464 (May 7-13, 2025)
- Shows strong adoption and active usage

## Protocol Version: 2025-06-18

The latest MCP specification version includes significant enhancements:

### Enhanced Authentication Protocol
- New authentication protocol for improved security and flexibility
- Separates authentication server and resource server roles
- Easier integration with existing OAuth 2.0 and OpenID Connect providers

### Elicitation Support
- Allows servers to request additional information from users during interactions
- Enables more dynamic and interactive AI experiences
- Facilitates gathering necessary context before task execution

### Structured Tool Output
- Support for explicitly defined structured content return
- Better understanding and processing by AI models
- Improved tool response handling

### Resource Links in Tool Responses
- Enhanced tool responses with resource link support
- Better context management and data flow

## Dependencies

The SDK includes 12 dependencies:
- **zod** - Schema validation
- **express** - HTTP server capabilities
- **cors** - Cross-origin resource sharing
- **cross-spawn** - Cross-platform process spawning
- Additional utility and protocol libraries

## SDK Features (v1.17.0)

### Core Components
- **McpServer**: Central interface for MCP protocol
- **Transport Support**: stdio and HTTP transports
- **Authentication**: Built-in OAuth and authentication routing
- **Error Handling**: Comprehensive McpError system
- **Type Safety**: Full TypeScript support

### API Capabilities
- Resource registration and management
- Tool definition and execution
- Prompt template management
- Schema validation with Zod
- Connection lifecycle management

## Compatibility

The TypeScript SDK implements the full MCP specification and maintains backward compatibility with previous protocol versions while supporting the latest 2025-06-18 enhancements.

## Official Links

- **npm Package**: https://www.npmjs.com/package/@modelcontextprotocol/sdk
- **GitHub Repository**: https://github.com/modelcontextprotocol/typescript-sdk
- **Release Notes**: https://github.com/modelcontextprotocol/typescript-sdk/releases