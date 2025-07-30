# FastMCP Overview

## What is FastMCP?

FastMCP is a Python and TypeScript framework that simplifies building Model Context Protocol (MCP) servers and clients. It provides a Pythonic and TypeScript-first approach to creating AI tools that can be consumed by LLM applications like Claude, providing "the fast, Pythonic way to build MCP servers and clients."

## Current Version
- **Latest Version**: 2.0.1 (Python)
- **Python Requirements**: 3.10+
- **Node.js Requirements**: 18.x+ (for TypeScript version)

## Key Features

### Core Capabilities
- **Decorator-based API**: Transform regular functions into MCP-compatible tools, resources, and prompts
- **Automatic Schema Generation**: Uses type hints and docstrings to generate MCP schemas
- **Multiple Transport Protocols**: STDIO, HTTP, SSE (Server-Sent Events)
- **Authentication & Security**: Built-in support for OAuth and authentication systems
- **Server Composition**: Create proxy servers and combine multiple servers
- **OpenAPI Integration**: Generate servers from OpenAPI and FastAPI specifications

### Advanced Features
- **Context Injection**: Access underlying MCP session and server capabilities
- **Progress Reporting**: Send progress updates for long-running operations
- **Middleware Support**: Add cross-cutting functionality like logging
- **Async Support**: Built-in support for both sync and async function handlers
- **Pydantic Integration**: Leverage Pydantic models for complex inputs/outputs
- **Transport Abstraction**: Work with various protocols without changing code

## Model Context Protocol Concepts

### Resources
- Similar to GET endpoints
- Provide data without significant computation
- Can be static or dynamic
- Support context-aware completions
- Used to load information into LLM context

### Tools
- Like POST endpoints
- Perform actions and have side effects
- Can return text or resource links
- Support parameter validation
- Used to execute code or produce effects

### Prompts
- Reusable templates for LLM interactions
- Can include context-aware completions
- Define interaction patterns

## Architecture Benefits

### Why Choose FastMCP over Official SDK?
- **Simplified Development**: Abstracts low-level implementation details
- **Rapid Prototyping**: Get servers running quickly with minimal boilerplate
- **Production Ready**: Includes deployment tools and infrastructure patterns
- **Rich Ecosystem**: Client libraries, testing frameworks, integrations

### When to Use Official SDK Instead
- Maximum control needed
- Specific architectural requirements
- Custom protocol implementations
- Low-level optimizations required

## Supported Languages

### Python Implementation
- Primary implementation by jlowin/fastmcp
- Comprehensive feature set
- Extensive documentation and examples

### TypeScript/JavaScript Implementation
- Multiple community implementations:
  - punkpeye/fastmcp
  - JeromyJSmith/fastmcp-js
  - Ramtinhoss/fastmcp2
- Built on official MCP TypeScript SDK
- Full type safety and modern JavaScript features

## Integration Ecosystem

### AI Assistant Hosts
- **Claude Desktop**: Primary consumer of MCP servers
- **Zed**: Development environment integration
- **Sourcegraph Cody**: Code assistant integration

### Real-World Examples
- **apinetwork/piapi-mcp-server**: Media generation using Midjourney/Flux/Kling
- **domdomegg/computer-use-mcp**: Computer control interface
- **Meeting-Baas/meeting-mcp**: Meeting bots and transcript management
- **drumnation/unsplash-smart-mcp-server**: Professional stock photo search

## Development Philosophy

FastMCP aims to be "the simplest path to production" for AI tool and server development, abstracting away protocol complexities while maintaining full compatibility with the MCP ecosystem. It follows the principle of convention over configuration, using sensible defaults while allowing customization when needed.

## Getting Started

The basic FastMCP server can be created in just a few lines:

```python
from fastmcp import FastMCP

mcp = FastMCP("Demo 🚀")

@mcp.tool
def add(a: int, b: int) -> int:
    """Add two numbers"""
    return a + b

if __name__ == "__main__":
    mcp.run()
```

This simplicity, combined with powerful features for production deployment, makes FastMCP an excellent choice for both beginners and experienced developers building MCP servers.