# Boilerplate MCP Server (aashari)

**Repository**: https://github.com/aashari/boilerplate-mcp-server

## Overview
TypeScript Model Context Protocol (MCP) server boilerplate providing IP lookup tools/resources. Includes CLI support and extensible structure for connecting AI systems (LLMs) to external data sources like ip-api.com. Ideal template for creating new MCP integrations via Node.js.

## Tech Stack
- **TypeScript 5.0+** - Modern TypeScript with latest features
- **Node.js (>=18.x)** - Runtime environment
- **Commander.js** - CLI interface and command handling
- **Zod** - Schema validation and type safety
- **Model Context Protocol SDK** - Core MCP functionality

## Project Structure
```
src/
├── cli/                   # CLI Layer - Command line interface
├── tools/                 # Tools Layer - MCP tool implementations
├── controllers/           # Controllers Layer - Request handling
├── services/              # Services Layer - Business logic
├── utils/                 # Utils Layer - Shared utilities
└── types/                 # Type definitions
```

## Key Features
- ✅ **Multiple Transport Support** - STDIO and HTTP transports
- ✅ **IP Lookup Tools** - Integration with ip-api.com
- ✅ **CLI Support** - Command line interface with Commander.js
- ✅ **Extensible Architecture** - Clean layered design
- ✅ **Type Safety** - Comprehensive TypeScript typing with Zod
- ✅ **Error Handling** - Standardized error management
- ✅ **Logging & Debugging** - Built-in logging utilities
- ✅ **Environment Configuration** - Configurable via environment variables

## Architectural Patterns
- **Layered Architecture** - Clear separation of concerns across 5 layers
- **Dependency Injection** - Loose coupling between layers
- **Modular Design** - Each layer has specific responsibilities
- **Service Layer Pattern** - Business logic abstraction
- **Controller Pattern** - Request/response handling

## Layer Responsibilities
- **CLI Layer**: Command line interface and argument parsing
- **Tools Layer**: MCP tool definitions and implementations
- **Controllers Layer**: Request handling and response formatting
- **Services Layer**: Business logic and external API integration
- **Utils Layer**: Shared utilities and helper functions

## Implementation Patterns
- **Schema Validation**: Zod for type-safe input validation
- **Multiple Runtime Modes**: CLI, STDIO, HTTP support
- **External API Integration**: Clean abstraction for external services
- **Interactive Development**: MCP Inspector support
- **Standardized Logging**: Comprehensive logging and debugging

## Unique Approaches
- **AI System Integration**: Designed specifically for connecting LLMs to external data
- **Template Philosophy**: Explicitly designed as foundation for custom MCP servers
- **External API Abstraction**: Clean patterns for integrating third-party APIs
- **Multi-Mode Operation**: Supports various execution modes

## External Integration
- **IP-API.com**: IP geolocation and lookup services
- **Extensible Pattern**: Template for other external API integrations
- **Clean Abstraction**: Service layer handles external API communication

## Recommended Use Cases
- Connecting AI systems to external data sources
- Building custom MCP servers with external API integration
- Projects requiring IP geolocation capabilities
- Template for new MCP server implementations
- Learning layered architecture patterns in MCP development

## Key Philosophy
> "Foundation for developing custom Model Context Protocol (MCP) servers"

## Analysis
This boilerplate excels in demonstrating clean architectural patterns for MCP servers that need to integrate with external APIs. The layered architecture, comprehensive TypeScript typing, and multi-transport support make it an excellent foundation for building robust, production-ready MCP servers. The focus on external API integration patterns makes it particularly valuable for projects requiring third-party service connectivity.