# MCP Example (iddv)

**Repository**: https://github.com/iddv/mcp-example

## Overview
A reference implementation of the Model Context Protocol (MCP) enabling seamless tool calling between LLMs and applications. Features client/server architecture with HTTP APIs, local CLI execution, and AWS Bedrock integration in a production-ready, extensible framework. Powered by FastMCP 2.0 with sophisticated examples including a living Minesweeper game.

## Tech Stack
- **Python 3.10+** - Modern Python features
- **FastMCP 2.0** - Enterprise-grade MCP framework
- **Poetry** - Dependency management and packaging
- **pytest** - Testing framework
- **black, isort, ruff, mypy** - Code quality tools
- **AWS Bedrock** - Cloud AI integration

## Project Structure
```
examples/
├── servers/               # Multiple server implementations
├── clients/               # Client integration examples
├── configs/               # Configuration examples
├── tests/                 # Comprehensive testing suite
└── docs/                  # Documentation and guides
template_server.py         # Clean starting canvas with boilerplate
```

## Key Features
- ✅ **FastMCP 2.0 Powered** - Enterprise-grade framework
- ✅ **Multiple Transport Protocols** - stdio, HTTP, WebSocket support
- ✅ **OAuth 2.0 Authentication** - Production-ready security
- ✅ **Real-Time Data Streaming** - Live data integration
- ✅ **Session Management** - Stateful client connections
- ✅ **AWS Bedrock Integration** - Cloud AI platform support
- ✅ **Minesweeper Game Example** - AI logical reasoning demonstration
- ✅ **AI Agent-Friendly Templates** - Optimized for AI development

## FastMCP 2.0 Enterprise Features
- **Multi-Protocol Transport**: stdio, HTTP, WebSocket protocols
- **Authentication System**: OAuth 2.0 integration
- **Session Management**: Persistent client state
- **Real-Time Streaming**: Live data and event streaming
- **Resource & Tool Definitions**: Flexible API patterns
- **Production Security**: Enterprise-grade authentication

## Minesweeper Implementation
- **AI-Powered Gameplay**: Strategic AI reasoning demonstration
- **Probabilistic Analysis**: Advanced board analysis algorithms
- **Multiple Difficulty Levels**: Beginner, intermediate, expert modes
- **Interactive Hints**: Strategy guidance and hints system
- **Living Game Example**: Real-time AI logical reasoning showcase

## Implementation Patterns
- **Decorator-Based Definitions**: Clean tool and resource registration
- **Async Programming**: Modern Python async/await patterns
- **Modular Design**: Extensible server architecture
- **Comprehensive Error Handling**: Production-ready error management
- **Type Safety**: Full mypy type checking

## Production-Ready Features
- **Comprehensive Testing**: pytest-based test infrastructure
- **Code Quality**: black, isort, ruff, mypy integration
- **Documentation**: Extensive guides and examples
- **Template System**: `template_server.py` for quick starts
- **AI Agent Optimization**: Templates designed for AI development

## AWS Integration
- **Bedrock Integration**: Direct AWS AI platform connectivity
- **Cloud Deployment**: Production cloud deployment patterns
- **Scalable Architecture**: Enterprise-grade scalability

## Unique Approaches
- **Living Game Example**: Interactive Minesweeper demonstrating AI reasoning
- **AI Agent Friendly**: Optimized templates for AI development workflows
- **Comprehensive Examples**: Multiple server implementations for learning
- **Enterprise Focus**: Production-ready patterns and practices

## Template Philosophy
> "This repository is optimized for AI agents to build MCP servers! template_server.py - Clean starting canvas with all boilerplate"

## Recommended Use Cases
- Enterprise MCP server development
- AI-powered interactive applications
- Learning advanced MCP patterns
- Production deployments requiring authentication
- Complex, stateful AI integrations
- AWS Bedrock-based AI applications

## Analysis
This repository represents the most comprehensive and enterprise-ready approach to MCP development. The FastMCP 2.0 integration, OAuth authentication, real-time streaming, and AWS Bedrock connectivity make it ideal for production applications. The Minesweeper example brilliantly demonstrates AI logical reasoning capabilities, while the AI agent-optimized templates show forward-thinking approach to AI development workflows. The extensive testing, documentation, and code quality tools make it suitable for large-scale, mission-critical applications.