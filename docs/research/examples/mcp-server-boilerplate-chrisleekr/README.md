# MCP Server Boilerplate (chrisleekr)

**Repository**: https://github.com/chrisleekr/mcp-server-boilerplate

## Overview
A comprehensive Model Context Protocol (MCP) server boilerplate built with TypeScript and Streamable HTTP transport with an OAuth Proxy for 3rd party authorization servers like Auth0. This is an enterprise-ready solution with sophisticated authentication and deployment capabilities.

## Tech Stack
- **TypeScript (89.8%)** - Primary language
- **Model Context Protocol SDK** - @modelcontextprotocol/sdk
- **HTTP-based Streamable Transport** - Real-time communication
- **OAuth 2.0** - Third-party authorization integration
- **Docker & Kubernetes** - Container deployment
- **Helm Charts** - Kubernetes deployment management

## Project Structure
```
/src/                          # TypeScript source code
/helm/                         # Kubernetes Helm charts
/docker/                       # Docker configurations
/auth/                         # OAuth proxy implementation
/tools/                        # Sample MCP tools
Dockerfile                     # Container definition
docker-compose.yml             # Local development setup
```

## Key Features
- ✅ **OAuth Proxy for 3rd Party Authorization** - Dynamic Application Registration
- ✅ **Comprehensive OAuth Flow** - Metadata discovery, client registration, token management
- ✅ **Enterprise Deployment Ready** - Helm Chart + Docker support
- ✅ **HTTP-Based Streamable Transport** - Session management and tool execution
- ✅ **Built-in Sample Tools** - echo, system-time, project tools for demonstration
- ✅ **TypeScript Implementation** - Type-safe development
- ✅ **Cursor IDE Integration** - Development environment support

## Implementation Patterns
- **OAuth 2.0 Specification Compliance** - Full OAuth implementation
- **Dynamic Client Registration** - Scalable authorization approach
- **Modular Tool Architecture** - Extensible tool system
- **Session Management** - Stateful client connections
- **Enterprise Configuration** - Extensive configuration options

## OAuth Integration Features
- **Metadata Discovery** - Automatic OAuth server discovery
- **Client Registration** - Dynamic application registration
- **Authorization Request Handling** - Complete OAuth flow
- **Token Management** - Secure token handling
- **Multi-Authorization Support** - Multiple authorization scenarios

## Enterprise-Ready Capabilities
- **Kubernetes Deployment** - Helm chart for production deployment
- **Docker Support** - Containerized development and deployment
- **Configuration Management** - Extensive environment configuration
- **Security Focus** - OAuth-based authentication
- **Scalability** - Designed for enterprise-scale deployments

## Unique Approaches
- **OAuth Proxy Solution** - Solves MCP client registration scalability challenges
- **Dynamic Application Registration** - Enables flexible client onboarding
- **Authorization Server Integration** - Direct integration with Auth0 and similar services
- **Enterprise Architecture** - Production-ready deployment patterns

## Known Limitations
- Current streaming implementation returns final result instead of true streaming data
- Complex setup due to comprehensive OAuth integration

## Deployment Options
- **Local Development** - Docker Compose setup
- **Kubernetes** - Production Helm chart deployment
- **Docker** - Containerized deployment
- **Cursor IDE** - Integrated development environment

## Recommended Use Cases
- Enterprise MCP server deployments
- Applications requiring OAuth integration
- Multi-tenant MCP implementations
- Production systems needing scalable authentication
- Projects requiring third-party authorization server integration

## Key Differentiator
> "Provides a way to enable Dynamic Application Registration for MCP server by using OAuth Proxy"

## Analysis
This boilerplate represents the most sophisticated approach to MCP server development with enterprise-grade authentication and deployment capabilities. The OAuth proxy solution addresses real-world scalability challenges in client registration, making it ideal for production deployments requiring third-party authentication integration. The comprehensive TypeScript implementation and Kubernetes-ready deployment make it suitable for large-scale, multi-tenant applications.