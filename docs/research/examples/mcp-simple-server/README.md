# MCP Simple Server (oleksandrsirenko)

**Repository**: https://github.com/oleksandrsirenko/mcp-simple-server

## Overview
Minimal MCP server with streamable HTTP transport. Built with FastMCP following the official Anthropic MCP specification 2025-06-18. Serves as an educational reference for building MCP servers with focus on simplicity and protocol adherence.

## Tech Stack
- **Python** - Core language
- **FastMCP** - Anthropic's MCP implementation
- **Streamable HTTP with SSE** - Server-Sent Events for real-time communication
- **JSON-RPC 2.0** - Protocol for message exchange
- **Docker** - Containerization support

## Project Structure
```
main.py                    # Main server implementation (~25 lines)
tests/                     # Automated testing suite
Dockerfile                 # Docker containerization
railway.toml              # Railway deployment config
render.yaml               # Render deployment config
requirements.txt          # Python dependencies
```

## Key Features
- ✅ Minimal implementation (~25 lines main server)
- ✅ Streamable HTTP transport with SSE
- ✅ JSON-RPC 2.0 protocol support
- ✅ Two basic math tools: `add()` and `multiply()`
- ✅ Automated testing suite
- ✅ Multiple deployment options (Railway, Heroku, Render, Docker)
- ✅ MCP 2025-06-18 specification compliance

## Implementation Patterns
- **Decorator-Based Tools**: `@mcp.tool()` for clean tool registration
- **Stateful Sessions**: Session management for client connections
- **Event Streaming**: Real-time communication via SSE
- **Minimal Core**: Focus on essential MCP functionality only
- **Test-Driven**: Comprehensive test coverage

## Streamable HTTP Transport
- **Server-Sent Events (SSE)**: Real-time, event-driven communication
- **JSON-RPC 2.0**: Standardized message exchange format
- **Dynamic Tool Invocation**: Runtime tool calling and response streaming
- **Event Flow**: Clear protocol flow documentation

## Minimal Design Philosophy
- **Compact Implementation**: Main server logic in ~25 lines
- **Clear Documentation**: Well-documented protocol flow
- **Simple Tool Definition**: Straightforward examples with `add()` and `multiply()`
- **Easy Extension**: Simple pattern for adding new tools
- **Reference Quality**: Educational focus on core concepts

## Deployment Options
- **Railway**: railway.toml configuration
- **Heroku**: Heroku-ready setup
- **Render**: render.yaml configuration
- **Docker**: Containerized deployment
- **Local Development**: Simple Python setup

## Recommended Use Cases
- Learning MCP server fundamentals
- Understanding streamable HTTP transport
- Reference implementation for new projects
- Testing MCP client integrations
- Quick prototyping and experimentation

## Analysis
This repository excels in demonstrating MCP core concepts through minimal, focused implementation. The emphasis on simplicity, comprehensive testing, and multiple deployment options makes it an excellent reference for understanding MCP server development fundamentals. The streamable HTTP transport implementation provides clear examples of real-time MCP communication patterns.