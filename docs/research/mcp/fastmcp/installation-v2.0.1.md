# FastMCP Installation Guide (v2.0.1)

## System Requirements

### Python Version
- **Minimum**: Python 3.10+
- **Recommended**: Python 3.11 or 3.12 for best performance

### Node.js Version (for TypeScript)
- **Minimum**: Node.js 18.x+
- **Recommended**: Latest LTS version

## Python Installation

### Using uv (Recommended)
```bash
uv pip install fastmcp
```

### Using pip
```bash
pip install fastmcp
```

### With Optional Dependencies
```bash
# For HTTP transport support
pip install "fastmcp[http]"

# For development dependencies
pip install "fastmcp[dev]"

# For all optional features
pip install "fastmcp[all]"
```

### From Source
```bash
git clone https://github.com/jlowin/fastmcp.git
cd fastmcp
pip install -e .
```

## TypeScript/Node.js Installation

### Official MCP TypeScript SDK
```bash
npm install @modelcontextprotocol/sdk
```

### Community FastMCP TypeScript Implementations

#### punkpeye/fastmcp
```bash
npm install fastmcp
```

#### JeromyJSmith/fastmcp-js
```bash
npm install @jeromyjsmith/fastmcp-js
```

## Development Environment Setup

### Python Development Setup
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install FastMCP with development dependencies
pip install "fastmcp[dev]"

# Install additional common dependencies
pip install pydantic httpx asyncio-mqtt
```

### TypeScript Development Setup
```bash
# Initialize TypeScript project
npm init -y
npm install -D typescript @types/node ts-node

# Install FastMCP and MCP SDK
npm install @modelcontextprotocol/sdk
npm install fastmcp  # or your preferred FastMCP TypeScript implementation

# Create tsconfig.json
npx tsc --init
```

## Verification

### Python Verification
```python
# test_installation.py
from fastmcp import FastMCP

mcp = FastMCP("Test Server")

@mcp.tool
def hello(name: str) -> str:
    """Say hello to someone"""
    return f"Hello, {name}!"

if __name__ == "__main__":
    print("FastMCP installed successfully!")
    print(f"Server name: {mcp.name}")
```

Run the test:
```bash
python test_installation.py
```

### TypeScript Verification
```typescript
// test_installation.ts
import { FastMCP } from "fastmcp";

const server = new FastMCP({
  name: "Test Server",
  version: "1.0.0",
});

console.log("FastMCP TypeScript installed successfully!");
console.log(`Server name: ${server.name}`);
```

Run the test:
```bash
npx ts-node test_installation.ts
```

## CLI Installation

FastMCP provides a CLI tool for running servers:

```bash
# Verify CLI installation
fastmcp --help

# Run a server with CLI
fastmcp run server.py

# Run with specific Python version
fastmcp run server.py --python 3.11

# Run with additional packages
fastmcp run server.py --with pandas --with numpy

# Run with HTTP transport
fastmcp run server.py --transport http --port 8080
```

## Common Installation Issues

### Python Issues

#### Permission Errors
```bash
# Use user installation
pip install --user fastmcp

# Or use virtual environment (recommended)
python -m venv venv
source venv/bin/activate
pip install fastmcp
```

#### Version Conflicts
```bash
# Check Python version
python --version

# Upgrade pip
pip install --upgrade pip

# Clean install
pip uninstall fastmcp
pip install fastmcp
```

### TypeScript Issues

#### Module Resolution
Ensure your `tsconfig.json` has proper module resolution:
```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2020",
    "module": "commonjs"
  }
}
```

#### Dependency Conflicts
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Docker Installation

### Python Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install FastMCP
RUN pip install fastmcp

# Copy your server code
COPY server.py .

# Run server
CMD ["python", "server.py"]
```

### Build and run:
```bash
docker build -t my-fastmcp-server .
docker run -p 8000:8000 my-fastmcp-server
```

## Production Considerations

### Dependencies Management
```bash
# Generate requirements.txt
pip freeze > requirements.txt

# Install from requirements
pip install -r requirements.txt
```

### Environment Variables
```bash
# Set environment variables for production
export FASTMCP_LOG_LEVEL=INFO
export FASTMCP_HOST=0.0.0.0
export FASTMCP_PORT=8000
```

### Health Checks
```python
# Add health check endpoint
@mcp.custom_route("/health")
async def health_check():
    return {"status": "healthy", "version": "2.0.1"}
```

## Next Steps

After installation, proceed to:
1. [Creating Your First Server](./server-creation.md)
2. [Tools and Resources Guide](./tools-creation.md)
3. [Best Practices](./best-practices.md)
4. [Deployment Guide](./deployment.md)