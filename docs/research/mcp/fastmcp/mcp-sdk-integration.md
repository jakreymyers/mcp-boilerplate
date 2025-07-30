# FastMCP Integration with MCP SDK

## Understanding the MCP Ecosystem

### Architecture Overview

The Model Context Protocol (MCP) ecosystem consists of three main components:

1. **MCP Hosts**: Applications that consume MCP servers (Claude Desktop, Zed, Sourcegraph Cody)
2. **MCP Servers**: Provide resources, tools, and prompts to hosts
3. **MCP Clients**: Connect to and interact with MCP servers

### FastMCP's Position in the Ecosystem

FastMCP serves as a high-level framework built on top of the official MCP SDK, providing:
- Simplified server creation with decorators
- Automatic schema generation
- Built-in error handling and validation
- Production-ready features (middleware, auth, etc.)

## Official MCP SDK Overview

### Python SDK Integration

#### Installation
```bash
# Official Python MCP SDK
pip install mcp

# FastMCP (includes MCP SDK as dependency)
pip install fastmcp
```

#### Direct SDK Usage vs FastMCP
```python
# Direct MCP SDK usage
from mcp import Server, StdioServerTransport
from mcp.types import Tool, TextContent

server = Server("direct-mcp-server")

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="greet",
            description="Greet someone",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {"type": "string"}
                },
                "required": ["name"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "greet":
        return [TextContent(type="text", text=f"Hello, {arguments['name']}!")]
    raise ValueError(f"Unknown tool: {name}")

# FastMCP equivalent
from fastmcp import FastMCP

mcp = FastMCP("fastmcp-server")

@mcp.tool
def greet(name: str) -> str:
    """Greet someone"""
    return f"Hello, {name}!"
```

### TypeScript SDK Integration

#### Installation
```bash
# Official TypeScript MCP SDK
npm install @modelcontextprotocol/sdk

# Community FastMCP TypeScript
npm install fastmcp
```

#### SDK Comparison
```typescript
// Direct TypeScript MCP SDK
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server({
  name: "direct-mcp-server",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {}
  }
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "greet",
        description: "Greet someone",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" }
          },
          required: ["name"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "greet") {
    return {
      content: [
        {
          type: "text",
          text: `Hello, ${request.params.arguments.name}!`
        }
      ]
    };
  }
  throw new Error("Unknown tool");
});

// FastMCP TypeScript equivalent
import { FastMCP } from "fastmcp";
import { z } from "zod";

const server = new FastMCP({
  name: "fastmcp-server",
  version: "1.0.0"
});

server.addTool({
  name: "greet",
  description: "Greet someone",
  inputSchema: z.object({
    name: z.string()
  }),
  handler: async ({ name }) => ({
    content: [{ type: "text", text: `Hello, ${name}!` }]
  })
});
```

## Advanced SDK Integration Patterns

### Custom Transport Implementation

#### Using SDK Transports with FastMCP
```python
from fastmcp import FastMCP
from mcp.server.stdio import StdioServerTransport
from mcp.server.sse import SseServerTransport
import asyncio

class CustomTransportServer:
    def __init__(self):
        self.mcp = FastMCP("Custom Transport Server")
        self.setup_tools()
    
    def setup_tools(self):
        @self.mcp.tool
        def process_data(data: str) -> str:
            return f"Processed: {data}"
    
    async def run_stdio(self):
        """Run server with STDIO transport"""
        transport = StdioServerTransport()
        await self.mcp.server.connect(transport)
    
    async def run_sse(self, host: str = "localhost", port: int = 8000):
        """Run server with SSE transport"""
        transport = SseServerTransport(host, port)
        await self.mcp.server.connect(transport)
    
    async def run_custom_transport(self, transport_config: dict):
        """Run server with custom transport configuration"""
        # Custom transport implementation
        transport = create_custom_transport(transport_config)
        await self.mcp.server.connect(transport)

def create_custom_transport(config: dict):
    """Factory for custom transport implementations"""
    transport_type = config.get("type")
    
    if transport_type == "websocket":
        return WebSocketTransport(config["url"])
    elif transport_type == "tcp":
        return TcpTransport(config["host"], config["port"])
    else:
        raise ValueError(f"Unknown transport type: {transport_type}")

# Usage
async def main():
    server = CustomTransportServer()
    
    # Choose transport based on configuration
    transport_config = {
        "type": "websocket",
        "url": "ws://localhost:8080/mcp"
    }
    
    await server.run_custom_transport(transport_config)

if __name__ == "__main__":
    asyncio.run(main())
```

### Protocol Message Handling

#### Low-Level Message Processing
```python
from fastmcp import FastMCP, Context
from mcp.types import (
    JSONRPCMessage, 
    JSONRPCRequest, 
    JSONRPCResponse,
    ErrorCode
)
import json

class MessageInterceptorServer:
    def __init__(self):
        self.mcp = FastMCP("Message Interceptor Server")
        self.setup_message_handlers()
    
    def setup_message_handlers(self):
        """Setup custom message handling"""
        
        # Intercept incoming messages
        original_handle_message = self.mcp.server.handle_message
        
        async def custom_handle_message(message: JSONRPCMessage):
            # Log all incoming messages
            self.log_message("INCOMING", message)
            
            # Add custom validation
            if self.should_reject_message(message):
                return JSONRPCResponse(
                    jsonrpc="2.0",
                    id=message.id,
                    error={
                        "code": ErrorCode.INVALID_REQUEST,
                        "message": "Message rejected by custom validator"
                    }
                )
            
            # Process message with original handler
            response = await original_handle_message(message)
            
            # Log outgoing response
            self.log_message("OUTGOING", response)
            
            return response
        
        self.mcp.server.handle_message = custom_handle_message
    
    def log_message(self, direction: str, message: JSONRPCMessage):
        """Log protocol messages for debugging"""
        print(f"[{direction}] {json.dumps(message.model_dump(), indent=2)}")
    
    def should_reject_message(self, message: JSONRPCMessage) -> bool:
        """Custom message validation logic"""
        # Example: Reject messages from unauthorized sources
        if isinstance(message, JSONRPCRequest):
            if message.method.startswith("admin/") and not self.is_admin_authenticated():
                return True
        return False
    
    def is_admin_authenticated(self) -> bool:
        """Check admin authentication status"""
        # Implementation depends on your auth system
        return False
```

### Resource and Tool Registration

#### Dynamic Registration with SDK
```python
from fastmcp import FastMCP
from mcp.types import Resource, Tool, Prompt
from typing import Dict, Any, List
import inspect

class DynamicRegistrationServer:
    def __init__(self):
        self.mcp = FastMCP("Dynamic Registration Server")
        self.dynamic_tools: Dict[str, Any] = {}
        self.dynamic_resources: Dict[str, Any] = {}
        
    def register_tool_from_function(self, func, metadata: Dict[str, Any] = None):
        """Dynamically register a tool from a Python function"""
        tool_name = metadata.get("name", func.__name__)
        
        # Generate schema from function signature
        sig = inspect.signature(func)
        schema = self.generate_schema_from_signature(sig)
        
        # Register with FastMCP
        @self.mcp.tool
        def dynamic_tool(**kwargs):
            return func(**kwargs)
        
        # Update tool metadata
        dynamic_tool.__name__ = tool_name
        dynamic_tool.__doc__ = metadata.get("description", func.__doc__)
        
        self.dynamic_tools[tool_name] = func
    
    def register_resource_from_data(self, uri: str, data: Any, metadata: Dict[str, Any] = None):
        """Dynamically register a resource from data"""
        
        @self.mcp.resource(uri)
        def dynamic_resource():
            if callable(data):
                return data()
            else:
                return json.dumps(data) if not isinstance(data, str) else data
        
        # Update resource metadata
        if metadata:
            dynamic_resource.__doc__ = metadata.get("description")
        
        self.dynamic_resources[uri] = data
    
    def generate_schema_from_signature(self, signature: inspect.Signature) -> Dict[str, Any]:
        """Generate JSON schema from function signature"""
        properties = {}
        required = []
        
        for param_name, param in signature.parameters.items():
            if param.annotation != inspect.Parameter.empty:
                param_type = self.python_type_to_json_type(param.annotation)
                properties[param_name] = {"type": param_type}
                
                if param.default == inspect.Parameter.empty:
                    required.append(param_name)
        
        return {
            "type": "object",
            "properties": properties,
            "required": required
        }
    
    def python_type_to_json_type(self, python_type) -> str:
        """Convert Python type annotations to JSON schema types"""
        type_mapping = {
            str: "string",
            int: "integer",
            float: "number",
            bool: "boolean",
            list: "array",
            dict: "object"
        }
        return type_mapping.get(python_type, "string")

# Usage example
def custom_calculation(x: int, y: int, operation: str) -> str:
    """Perform custom calculation"""
    operations = {
        "add": lambda a, b: a + b,
        "multiply": lambda a, b: a * b,
        "power": lambda a, b: a ** b
    }
    
    if operation not in operations:
        return f"Unknown operation: {operation}"
    
    result = operations[operation](x, y)
    return f"{x} {operation} {y} = {result}"

# Register dynamically
server = DynamicRegistrationServer()
server.register_tool_from_function(
    custom_calculation,
    metadata={
        "name": "custom_calc",
        "description": "Perform various mathematical operations"
    }
)

# Register dynamic resource
server.register_resource_from_data(
    "dynamic://config",
    {"version": "1.0", "features": ["calc", "data"]},
    metadata={"description": "Dynamic configuration data"}
)
```

### Client-Server Communication

#### Building MCP Clients with SDK
```python
from mcp.client.stdio import StdioClientTransport
from mcp.client.session import ClientSession
from mcp.types import CallToolRequest, ListToolsRequest
import asyncio

class MCPClient:
    def __init__(self, server_command: List[str]):
        self.server_command = server_command
        self.session = None
        self.transport = None
    
    async def connect(self):
        """Connect to MCP server"""
        self.transport = StdioClientTransport(self.server_command)
        self.session = ClientSession(self.transport)
        await self.session.initialize()
    
    async def disconnect(self):
        """Disconnect from MCP server"""
        if self.session:
            await self.session.close()
    
    async def list_available_tools(self) -> List[str]:
        """Get list of available tools from server"""
        request = ListToolsRequest(
            method="tools/list",
            params={}
        )
        
        response = await self.session.send_request(request)
        return [tool.name for tool in response.tools]
    
    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Call a tool on the connected server"""
        request = CallToolRequest(
            method="tools/call",
            params={
                "name": tool_name,
                "arguments": arguments
            }
        )
        
        response = await self.session.send_request(request)
        return response.content
    
    async def __aenter__(self):
        await self.connect()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.disconnect()

# Usage example
async def test_mcp_integration():
    """Test MCP client-server integration"""
    
    # Connect to FastMCP server
    async with MCPClient(["python", "fastmcp_server.py"]) as client:
        # List available tools
        tools = await client.list_available_tools()
        print(f"Available tools: {tools}")
        
        # Call a tool
        if "greet" in tools:
            result = await client.call_tool("greet", {"name": "Alice"})
            print(f"Tool result: {result}")

if __name__ == "__main__":
    asyncio.run(test_mcp_integration())
```

### Error Handling and Protocol Compliance

#### SDK Error Integration
```python
from fastmcp import FastMCP
from mcp.types import ErrorCode, McpError
from mcp.server.models import InitializationOptions

class ProtocolCompliantServer:
    def __init__(self):
        self.mcp = FastMCP("Protocol Compliant Server")
        self.setup_error_handling()
    
    def setup_error_handling(self):
        """Setup SDK-compliant error handling"""
        
        @self.mcp.tool
        def validated_operation(data: dict) -> str:
            """Operation with proper MCP error handling"""
            try:
                # Validate input according to MCP standards
                if not isinstance(data, dict):
                    raise McpError(
                        ErrorCode.INVALID_PARAMS,
                        "Input must be a dictionary"
                    )
                
                if "required_field" not in data:
                    raise McpError(
                        ErrorCode.INVALID_PARAMS,
                        "Missing required field: required_field"
                    )
                
                # Process data
                result = self.process_data(data)
                return f"Processed successfully: {result}"
                
            except McpError:
                # Re-raise MCP errors as-is
                raise
            except Exception as e:
                # Convert other exceptions to MCP errors
                raise McpError(
                    ErrorCode.INTERNAL_ERROR,
                    f"Internal processing error: {str(e)}"
                )
    
    def process_data(self, data: dict) -> str:
        """Simulate data processing that might fail"""
        if data.get("should_fail"):
            raise ValueError("Simulated processing failure")
        return f"data_processed_{len(data)}_fields"
    
    async def handle_initialization(self, options: InitializationOptions):
        """Handle MCP initialization with custom options"""
        # Custom initialization logic
        self.server_capabilities = {
            "tools": {"listChanged": True},
            "resources": {"subscribe": True, "listChanged": True},
            "prompts": {"listChanged": True}
        }
        
        return self.server_capabilities

# Integration with MCP protocol lifecycle
async def run_protocol_compliant_server():
    server = ProtocolCompliantServer()
    
    # Add protocol lifecycle handlers
    @server.mcp.server.request_handler("initialize")
    async def handle_initialize(request):
        capabilities = await server.handle_initialization(request.params)
        return {
            "protocolVersion": "2024-11-05",
            "capabilities": capabilities,
            "serverInfo": {
                "name": server.mcp.name,
                "version": server.mcp.version
            }
        }
    
    # Start server
    await server.mcp.run_async()

if __name__ == "__main__":
    asyncio.run(run_protocol_compliant_server())
```

## SDK Extension Patterns

### Custom Capability Extensions
```python
from fastmcp import FastMCP
from mcp.types import ServerCapabilities
from typing import Dict, Any

class ExtendedCapabilitiesServer:
    def __init__(self):
        self.mcp = FastMCP("Extended Capabilities Server")
        self.custom_capabilities = {
            "streaming": True,
            "batch_operations": True,
            "file_upload": True,
            "websocket_support": True
        }
    
    def get_extended_capabilities(self) -> Dict[str, Any]:
        """Return extended server capabilities"""
        base_capabilities = {
            "tools": {"listChanged": True},
            "resources": {"subscribe": True, "listChanged": True},
            "prompts": {"listChanged": True}
        }
        
        # Merge with custom capabilities
        return {
            **base_capabilities,
            "experimental": self.custom_capabilities
        }
    
    def setup_extended_handlers(self):
        """Setup handlers for extended capabilities"""
        
        if self.custom_capabilities.get("streaming"):
            @self.mcp.tool
            async def streaming_tool(data: str) -> str:
                """Tool that supports streaming responses"""
                # Implementation for streaming
                return f"Streaming response for: {data}"
        
        if self.custom_capabilities.get("batch_operations"):
            @self.mcp.tool
            async def batch_tool(operations: list) -> str:
                """Tool that supports batch operations"""
                results = []
                for op in operations:
                    result = await self.process_single_operation(op)
                    results.append(result)
                return f"Batch completed: {len(results)} operations"
    
    async def process_single_operation(self, operation: dict) -> str:
        """Process a single operation in a batch"""
        return f"Processed: {operation.get('type', 'unknown')}"

# Usage
server = ExtendedCapabilitiesServer()
server.setup_extended_handlers()
```

This comprehensive guide demonstrates how FastMCP integrates with and extends the official MCP SDK, providing both simplified high-level APIs and access to low-level protocol features when needed.