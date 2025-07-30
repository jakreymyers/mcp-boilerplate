# MCP SDK Overview

## Model Context Protocol (MCP) Overview

The Model Context Protocol (MCP) is an open standard introduced by Anthropic that standardizes how AI applications (chatbots, IDE assistants, or custom agents) connect with external tools, data sources, and systems. It's described as a "USB-C port for AI applications."

## Purpose and Benefits

MCP provides:
- **Pre-built integrations** with common data sources and tools
- **Standardized custom integration methods** for building new connections
- **Open protocol implementation** for maximum flexibility
- **Portability** - change between apps while maintaining context

## Architecture

MCP defines a client-server architecture where:

- **Hosts**: Applications the user interacts with (e.g., Claude Desktop, IDE like Cursor, custom agent)
- **Clients**: Live within the Host application and manage the connection to one specific MCP server
- **Servers**: External programs that expose Tools, Resources and Prompts via standard API to the AI model via the client

## Core Capabilities

MCP enables three primary interaction patterns:

### 1. Resources
- Expose data to LLMs (similar to GET endpoints)
- Load information into the LLM's context
- Can be static or dynamic
- Support context-aware completions
- Return content via URIs

### 2. Tools
- Allow LLMs to perform actions (similar to POST endpoints)
- Execute code or produce side effects
- Can return text or ResourceLinks
- Support input schemas and validation

### 3. Prompts
- Reusable interaction templates for LLM interactions
- Define message structures for common workflows
- Enable context-aware completions

## Protocol Foundation

- Built on **JSON-RPC 2.0** for all communication
- **Stateful protocol** - connections are established and maintained
- Supports multiple transport mechanisms:
  - **stdio** (Standard Input/Output) - for same-machine communication
  - **HTTP via SSE** (Server-Sent Events) - for remote servers

## Key Features

- Standardized LLM interaction protocol
- TypeScript-first design with full type safety
- Flexible resource and tool registration
- Built-in authentication support with OAuth providers
- Schema validation with Zod
- Comprehensive error handling

## Timeline

- **November 2024**: Initial release by Anthropic
- **Early 2025**: Significant momentum acceleration
- **July 2025**: Protocol version 2025-06-18 specification

## Available SDKs

- **TypeScript SDK**: `@modelcontextprotocol/sdk` (primary implementation)
- **Python SDK**: Full MCP specification implementation
- **C# SDK**: Updated to support 2025-06-18 specification
- **Java SDK**: Maintained in collaboration with Spring AI
- **Go SDK**: Maintained in collaboration with Google
- **Kotlin SDK**: Maintained in collaboration with JetBrains
- **Ruby SDK**: Official Ruby implementation

## Official Resources

- **Documentation**: https://modelcontextprotocol.io/introduction
- **Specification**: https://spec.modelcontextprotocol.io
- **GitHub Organization**: https://github.com/modelcontextprotocol
- **TypeScript SDK**: https://github.com/modelcontextprotocol/typescript-sdk