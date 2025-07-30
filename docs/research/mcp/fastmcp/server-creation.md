# FastMCP Server Creation Guide

## Basic Server Structure

### Python Server Creation

#### Minimal Server Example
```python
from fastmcp import FastMCP

# Create server instance
mcp = FastMCP(name="My Server", version="1.0.0")

@mcp.tool
def hello(name: str) -> str:
    """Say hello to someone"""
    return f"Hello, {name}!"

if __name__ == "__main__":
    mcp.run()
```

#### Server with Configuration
```python
from fastmcp import FastMCP
from pydantic import BaseModel
from typing import Optional

# Create server with detailed configuration
mcp = FastMCP(
    name="Advanced Server",
    version="1.0.0",
    description="An advanced MCP server example"
)

# Define data models
class UserInfo(BaseModel):
    name: str
    email: Optional[str] = None
    age: Optional[int] = None

@mcp.tool
def create_user(user: UserInfo) -> str:
    """Create a new user with the provided information"""
    return f"Created user: {user.name} ({user.email})"

@mcp.resource("user-template")
def get_user_template() -> str:
    """Get a template for user creation"""
    return "Template: name (required), email (optional), age (optional)"

@mcp.prompt("user-creation")
def user_creation_prompt(context: str) -> str:
    """Generate a prompt for user creation"""
    return f"Create a user based on this context: {context}"

if __name__ == "__main__":
    mcp.run(transport="http", port=8000)
```

### TypeScript Server Creation

#### Basic TypeScript Server
```typescript
import { FastMCP } from "fastmcp";
import { z } from "zod";

const server = new FastMCP({
  name: "My TypeScript Server",
  version: "1.0.0",
});

// Define input schema
const AddInputSchema = z.object({
  a: z.number().describe("First number"),
  b: z.number().describe("Second number"),
});

server.addTool({
  name: "add",
  description: "Add two numbers together",
  inputSchema: AddInputSchema,
  handler: async ({ a, b }) => {
    return {
      content: [{
        type: "text",
        text: `${a} + ${b} = ${a + b}`
      }]
    };
  }
});

// Start the server
async function main() {
  const transport = server.stdio();
  await server.connect(transport);
}

if (require.main === module) {
  main().catch(console.error);
}
```

#### Advanced TypeScript Server with Resources
```typescript
import { FastMCP } from "fastmcp";
import { z } from "zod";

const server = new FastMCP({
  name: "Advanced TypeScript Server",
  version: "1.0.0",
});

// Add a resource
server.addResource({
  uri: "config://settings",
  name: "Application Settings",
  description: "Current application configuration",
  mimeType: "application/json",
  handler: async () => {
    return {
      contents: [{
        uri: "config://settings",
        mimeType: "application/json",
        text: JSON.stringify({
          theme: "dark",
          language: "en",
          notifications: true
        }, null, 2)
      }]
    };
  }
});

// Add a tool with complex input
const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  preferences: z.object({
    theme: z.enum(["light", "dark"]),
    notifications: z.boolean()
  }).optional()
});

server.addTool({
  name: "create_user",
  description: "Create a new user account",
  inputSchema: UserSchema,
  handler: async (input) => {
    const user = {
      id: Math.random().toString(36).substr(2, 9),
      ...input,
      createdAt: new Date().toISOString()
    };
    
    return {
      content: [{
        type: "text",
        text: `User created successfully: ${JSON.stringify(user, null, 2)}`
      }]
    };
  }
});

export { server };
```

## Server Configuration Options

### Transport Protocols

#### STDIO (Default)
```python
# Default transport - good for local tools
mcp.run()  # Uses STDIO by default

# Explicit STDIO configuration
mcp.run(transport="stdio")
```

#### HTTP Transport
```python
# Basic HTTP server
mcp.run(transport="http")

# HTTP with custom configuration
mcp.run(
    transport="http",
    host="0.0.0.0",
    port=8080,
    path="/mcp"
)
```

#### SSE (Server-Sent Events) - Deprecated
```python
# Not recommended for new projects
mcp.run(transport="sse", port=8080)
```

### Async Server Support

#### Async Server Example
```python
from fastmcp import FastMCP
import asyncio
import httpx

mcp = FastMCP("Async Server")

@mcp.tool
async def fetch_data(url: str) -> str:
    """Fetch data from a URL asynchronously"""
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return f"Status: {response.status_code}, Length: {len(response.text)}"

@mcp.resource("async-status")
async def get_async_status() -> str:
    """Get current async operations status"""
    await asyncio.sleep(0.1)  # Simulate async work
    return "Async operations running normally"

# For async contexts, use run_async()
async def main():
    await mcp.run_async()

if __name__ == "__main__":
    asyncio.run(main())
```

## Advanced Server Patterns

### Context-Aware Server
```python
from fastmcp import FastMCP, Context

mcp = FastMCP("Context-Aware Server")

@mcp.tool
def log_message(message: str, context: Context) -> str:
    """Log a message with context information"""
    # Access the underlying MCP session
    session_id = getattr(context.session, 'id', 'unknown')
    
    # Send log message back to client
    context.log_info(f"Received message: {message}")
    
    return f"Message logged (Session: {session_id})"

@mcp.tool
def access_resource(resource_name: str, context: Context) -> str:
    """Access a resource defined in the same server"""
    # Access server capabilities through context
    resources = context.server.list_resources()
    
    if resource_name in [r.name for r in resources]:
        return f"Resource '{resource_name}' is available"
    else:
        return f"Resource '{resource_name}' not found"
```

### Progress Reporting Server
```python
from fastmcp import FastMCP, Context
import time

mcp = FastMCP("Progress Server")

@mcp.tool
def long_running_task(duration: int, context: Context) -> str:
    """Perform a long-running task with progress updates"""
    steps = 10
    step_duration = duration / steps
    
    for i in range(steps):
        time.sleep(step_duration)
        progress = (i + 1) / steps
        context.send_progress(
            progress_token=f"task_{i}",
            progress=progress,
            total=1.0
        )
    
    return f"Task completed in {duration} seconds"
```

### Server with Custom Routes
```python
from fastmcp import FastMCP
from fastapi import HTTPException

mcp = FastMCP("Custom Routes Server")

@mcp.tool
def greet(name: str) -> str:
    """Greet someone"""
    return f"Hello, {name}!"

@mcp.custom_route("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "server": mcp.name}

@mcp.custom_route("/metrics")
async def get_metrics():
    """Get server metrics"""
    return {
        "tools_count": len(mcp._tools),
        "resources_count": len(mcp._resources),
        "uptime": "unknown"  # Would need to track actual uptime
    }
```

## Server Composition and Proxy Patterns

### Combining Multiple Servers
```python
from fastmcp import FastMCP

# Create multiple servers
auth_server = FastMCP("Auth Server")
data_server = FastMCP("Data Server")

@auth_server.tool
def login(username: str, password: str) -> str:
    return f"User {username} logged in"

@data_server.tool
def get_data(query: str) -> str:
    return f"Data for query: {query}"

# Main server that combines others
main_server = FastMCP("Main Server")

# Mount other servers (conceptual - exact API may vary)
main_server.mount("/auth", auth_server)
main_server.mount("/data", data_server)
```

### Proxy Server Pattern
```python
from fastmcp import FastMCP, Client

proxy_server = FastMCP("Proxy Server")

@proxy_server.tool
async def proxy_tool(target_server: str, tool_name: str, **kwargs) -> str:
    """Proxy tool calls to other servers"""
    async with Client(target_server) as client:
        result = await client.call_tool(tool_name, **kwargs)
        return result
```

## Error Handling and Validation

### Input Validation
```python
from fastmcp import FastMCP
from pydantic import BaseModel, Field, validator
from typing import Optional

mcp = FastMCP("Validation Server")

class TaskInput(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    priority: int = Field(..., ge=1, le=5)
    tags: Optional[list[str]] = None
    
    @validator('tags')
    def validate_tags(cls, v):
        if v and len(v) > 10:
            raise ValueError('Too many tags (max 10)')
        return v

@mcp.tool
def create_task(task: TaskInput) -> str:
    """Create a task with validation"""
    return f"Task created: {task.title} (Priority: {task.priority})"
```

### Error Handling
```python
from fastmcp import FastMCP
import logging

mcp = FastMCP("Error Handling Server")

@mcp.tool
def risky_operation(value: int) -> str:
    """An operation that might fail"""
    try:
        if value < 0:
            raise ValueError("Value must be positive")
        if value > 100:
            raise ValueError("Value too large")
        
        result = 100 / value  # Could raise ZeroDivisionError
        return f"Result: {result}"
        
    except ZeroDivisionError:
        logging.error("Division by zero attempted")
        return "Error: Cannot divide by zero"
    except ValueError as e:
        logging.error(f"Validation error: {e}")
        return f"Error: {e}"
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        return "Error: An unexpected error occurred"
```

## Testing Your Server

### Basic Testing
```python
from fastmcp import FastMCP, Client
import asyncio

async def test_server():
    mcp = FastMCP("Test Server")
    
    @mcp.tool
    def add(a: int, b: int) -> int:
        return a + b
    
    # Test using in-memory client
    async with Client(mcp) as client:
        result = await client.call_tool("add", a=2, b=3)
        assert result == 5
        print("Test passed!")

# Run test
asyncio.run(test_server())
```

This guide covers the fundamental patterns for creating FastMCP servers in both Python and TypeScript, from basic examples to advanced patterns with error handling, validation, and testing.