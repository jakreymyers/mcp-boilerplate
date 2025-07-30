# FastMCP Best Practices and Patterns

## Development Best Practices

### Server Architecture Patterns

#### Modular Design Pattern
```python
# main.py
from fastmcp import FastMCP
from modules.auth_tools import register_auth_tools
from modules.data_tools import register_data_tools
from modules.file_tools import register_file_tools

def create_server() -> FastMCP:
    """Create and configure the main server"""
    mcp = FastMCP(
        name="Modular MCP Server",
        version="1.0.0",
        description="A well-structured MCP server"
    )
    
    # Register tool modules
    register_auth_tools(mcp)
    register_data_tools(mcp)
    register_file_tools(mcp)
    
    return mcp

if __name__ == "__main__":
    server = create_server()
    server.run()
```

```python
# modules/auth_tools.py
from fastmcp import FastMCP
from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    username: str
    password: str
    remember_me: Optional[bool] = False

def register_auth_tools(mcp: FastMCP):
    """Register authentication-related tools"""
    
    @mcp.tool
    def login(request: LoginRequest) -> str:
        """Authenticate user login"""
        # Implementation here
        return f"User {request.username} logged in"
    
    @mcp.tool
    def logout(session_id: str) -> str:
        """Log out user session"""
        # Implementation here
        return f"Session {session_id} logged out"
    
    @mcp.resource("current-user")
    def get_current_user() -> str:
        """Get current authenticated user info"""
        # Implementation here
        return '{"user": "current_user_data"}'
```

#### Configuration Management Pattern
```python
# config.py
from pydantic import BaseSettings
from typing import Optional

class ServerConfig(BaseSettings):
    """Server configuration with environment variable support"""
    
    # Server settings
    server_name: str = "FastMCP Server"
    server_version: str = "1.0.0"
    debug: bool = False
    
    # Transport settings
    transport: str = "stdio"
    host: str = "127.0.0.1"
    port: int = 8000
    
    # Database settings
    database_url: Optional[str] = None
    redis_url: Optional[str] = None
    
    # API keys
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    
    class Config:
        env_file = ".env"

config = ServerConfig()
```

### Error Handling Best Practices

#### Comprehensive Error Classification
```python
from enum import Enum
from typing import Dict, Any
import logging

class ErrorSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ErrorCategory(Enum):
    VALIDATION = "validation"
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    NETWORK = "network"
    DATABASE = "database"
    EXTERNAL_API = "external_api"
    SYSTEM = "system"

class MCPError(Exception):
    """Base MCP error with structured information"""
    
    def __init__(
        self,
        message: str,
        category: ErrorCategory,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        details: Dict[str, Any] = None
    ):
        super().__init__(message)
        self.message = message
        self.category = category
        self.severity = severity
        self.details = details or {}

def handle_mcp_error(func):
    """Decorator for consistent error handling"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except MCPError as e:
            logging.error(f"MCP Error [{e.category.value}]: {e.message}", extra=e.details)
            return f"Error: {e.message}"
        except Exception as e:
            logging.error(f"Unexpected error: {e}")
            return f"System Error: An unexpected error occurred"
    return wrapper

@mcp.tool
@handle_mcp_error
def validate_user_input(data: dict) -> str:
    """Example tool with structured error handling"""
    if not data:
        raise MCPError(
            "Input data is required",
            ErrorCategory.VALIDATION,
            ErrorSeverity.MEDIUM,
            {"provided_data": data}
        )
    
    # Process data...
    return "Data processed successfully"
```

#### Graceful Degradation Pattern
```python
@mcp.tool
def weather_with_fallback(city: str) -> str:
    """Get weather with multiple fallback strategies"""
    
    # Primary API
    try:
        return get_weather_primary_api(city)
    except Exception as e:
        logging.warning(f"Primary weather API failed: {e}")
    
    # Fallback API
    try:
        return get_weather_fallback_api(city)
    except Exception as e:
        logging.warning(f"Fallback weather API failed: {e}")
    
    # Cached data
    try:
        cached_data = get_cached_weather(city)
        if cached_data:
            return f"{cached_data} (cached data - may be outdated)"
    except Exception as e:
        logging.warning(f"Cache retrieval failed: {e}")
    
    # Default response
    return f"Weather data temporarily unavailable for {city}. Please try again later."

def get_weather_primary_api(city: str) -> str:
    # Implementation for primary weather service
    pass

def get_weather_fallback_api(city: str) -> str:
    # Implementation for backup weather service
    pass

def get_cached_weather(city: str) -> str:
    # Implementation for cached weather data
    pass
```

### Performance Optimization Patterns

#### Caching Strategy
```python
from functools import lru_cache, wraps
from typing import Dict, Any
import time
import asyncio

class TimedCache:
    """Simple timed cache implementation"""
    
    def __init__(self, ttl_seconds: int = 300):
        self.cache: Dict[str, tuple] = {}
        self.ttl = ttl_seconds
    
    def get(self, key: str) -> Any:
        if key in self.cache:
            value, timestamp = self.cache[key]
            if time.time() - timestamp < self.ttl:
                return value
            else:
                del self.cache[key]
        return None
    
    def set(self, key: str, value: Any):
        self.cache[key] = (value, time.time())

# Global cache instance
cache = TimedCache(ttl_seconds=300)

def cached_resource(cache_key_func=None):
    """Decorator for caching resource results"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            if cache_key_func:
                cache_key = cache_key_func(*args, **kwargs)
            else:
                cache_key = f"{func.__name__}:{hash(str(args) + str(kwargs))}"
            
            # Try cache first
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key, result)
            return result
        return wrapper
    return decorator

@mcp.resource("expensive-computation")
@cached_resource()
def expensive_computation(param: str) -> str:
    """Resource with expensive computation that gets cached"""
    time.sleep(2)  # Simulate expensive operation
    result = f"Computed result for {param}: {hash(param)}"
    return result
```

#### Async Performance Pattern
```python
import asyncio
import aiohttp
from typing import List

@mcp.tool
async def batch_api_calls(urls: List[str]) -> str:
    """Make multiple API calls concurrently"""
    
    async def fetch_url(session: aiohttp.ClientSession, url: str) -> Dict[str, Any]:
        try:
            async with session.get(url, timeout=10) as response:
                return {
                    "url": url,
                    "status": response.status,
                    "data": await response.text() if response.status == 200 else None,
                    "error": None
                }
        except Exception as e:
            return {
                "url": url,
                "status": None,
                "data": None,
                "error": str(e)
            }
    
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_url(session, url) for url in urls]
        results = await asyncio.gather(*tasks)
    
    return json.dumps(results, indent=2)
```

### Security Best Practices

#### Input Sanitization and Validation
```python
from pydantic import BaseModel, Field, validator
import re
import html

class SecureInput(BaseModel):
    """Base class for secure input validation"""
    
    @validator('*', pre=True)
    def sanitize_strings(cls, v):
        if isinstance(v, str):
            # Basic HTML escape
            v = html.escape(v)
            # Remove potential script tags
            v = re.sub(r'<script[^>]*>.*?</script>', '', v, flags=re.IGNORECASE | re.DOTALL)
        return v

class UserMessage(SecureInput):
    message: str = Field(..., min_length=1, max_length=1000)
    recipient: str = Field(..., regex=r'^[a-zA-Z0-9_.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    
    @validator('message')
    def validate_message_content(cls, v):
        # Check for suspicious patterns
        suspicious_patterns = [
            r'<script',
            r'javascript:',
            r'data:text/html',
            r'vbscript:',
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, v, re.IGNORECASE):
                raise ValueError('Message contains potentially dangerous content')
        
        return v

@mcp.tool
def secure_send_message(message_data: UserMessage) -> str:
    """Send message with comprehensive security validation"""
    # Additional security checks can be added here
    return f"Message sent securely to {message_data.recipient}"
```

#### Rate Limiting Pattern
```python
from collections import defaultdict
import time
from typing import Dict

class RateLimiter:
    """Simple rate limiter implementation"""
    
    def __init__(self, max_requests: int = 100, time_window: int = 60):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests: Dict[str, List[float]] = defaultdict(list)
    
    def is_allowed(self, identifier: str) -> bool:
        now = time.time()
        window_start = now - self.time_window
        
        # Clean old requests
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier] 
            if req_time > window_start
        ]
        
        # Check if under limit
        if len(self.requests[identifier]) < self.max_requests:
            self.requests[identifier].append(now)
            return True
        
        return False

# Global rate limiter
rate_limiter = RateLimiter(max_requests=10, time_window=60)

def rate_limited(identifier_func=None):
    """Decorator for rate limiting tools"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Determine identifier (could be IP, user, etc.)
            identifier = "default"
            if identifier_func:
                identifier = identifier_func(*args, **kwargs)
            
            if not rate_limiter.is_allowed(identifier):
                return "Error: Rate limit exceeded. Please try again later."
            
            return func(*args, **kwargs)
        return wrapper
    return decorator

@mcp.tool
@rate_limited()
def rate_limited_api_call(query: str) -> str:
    """API call with rate limiting"""
    # Implementation here
    return f"API response for: {query}"
```

### Testing Best Practices

#### Unit Testing Pattern
```python
import pytest
import asyncio
from fastmcp import FastMCP, Client

@pytest.fixture
def test_server():
    """Create test server instance"""
    mcp = FastMCP("Test Server")
    
    @mcp.tool
    def add_numbers(a: int, b: int) -> int:
        return a + b
    
    @mcp.tool
    def divide_numbers(a: int, b: int) -> float:
        if b == 0:
            raise ValueError("Division by zero")
        return a / b
    
    @mcp.resource("test-config")
    def get_test_config() -> str:
        return '{"test": true, "env": "testing"}'
    
    return mcp

@pytest.mark.asyncio
async def test_tool_functionality(test_server):
    """Test tool functionality"""
    async with Client(test_server) as client:
        # Test successful operation
        result = await client.call_tool("add_numbers", a=2, b=3)
        assert result == 5
        
        # Test error handling
        with pytest.raises(ValueError):
            await client.call_tool("divide_numbers", a=10, b=0)

@pytest.mark.asyncio
async def test_resource_access(test_server):
    """Test resource functionality"""
    async with Client(test_server) as client:
        resources = await client.list_resources()
        assert any(r.uri == "test-config" for r in resources)
        
        content = await client.read_resource("test-config")
        assert "test" in content
```

#### Integration Testing Pattern
```python
import httpx
import pytest

@pytest.mark.integration
async def test_server_http_endpoint():
    """Test server running on HTTP transport"""
    # Start server in background
    server_process = start_test_server_http()
    
    try:
        # Test server health
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:8000/health")
            assert response.status_code == 200
            
            # Test MCP endpoint
            mcp_response = await client.post(
                "http://localhost:8000/mcp",
                json={
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "tools/list"
                }
            )
            assert mcp_response.status_code == 200
            
    finally:
        # Cleanup
        server_process.terminate()

def start_test_server_http():
    """Helper to start server for integration tests"""
    # Implementation to start server process
    pass
```

### Deployment Best Practices

#### Docker Configuration
```dockerfile
# Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash mcp
RUN chown -R mcp:mcp /app
USER mcp

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Default command
CMD ["python", "main.py"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  fastmcp-server:
    build: .
    ports:
      - "8000:8000"
    environment:
      - TRANSPORT=http
      - HOST=0.0.0.0
      - PORT=8000
      - LOG_LEVEL=INFO
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - ./redis-data:/data
    restart: unless-stopped

networks:
  default:
    name: fastmcp-network
```

#### Production Configuration
```python
# production.py
import logging
import os
from fastmcp import FastMCP

def setup_production_logging():
    """Configure production logging"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('/var/log/fastmcp/server.log'),
            logging.StreamHandler()
        ]
    )

def create_production_server():
    """Create production-ready server"""
    setup_production_logging()
    
    mcp = FastMCP(
        name=os.getenv("SERVER_NAME", "Production MCP Server"),
        version=os.getenv("SERVER_VERSION", "1.0.0")
    )
    
    # Add health check endpoint
    @mcp.custom_route("/health")
    async def health_check():
        return {
            "status": "healthy",
            "timestamp": time.time(),
            "version": mcp.version
        }
    
    # Add metrics endpoint
    @mcp.custom_route("/metrics")
    async def metrics():
        return {
            "tools_count": len(mcp._tools),
            "resources_count": len(mcp._resources),
            "uptime": time.time() - start_time
        }
    
    return mcp

if __name__ == "__main__":
    server = create_production_server()
    server.run(
        transport="http",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000))
    )
```

### Monitoring and Observability

#### Structured Logging Pattern
```python
import structlog
import time

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

def log_tool_execution(func):
    """Decorator to log tool execution metrics"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        tool_name = func.__name__
        
        try:
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            
            logger.info(
                "tool_executed",
                tool_name=tool_name,
                execution_time_ms=execution_time * 1000,
                status="success",
                args_count=len(args),
                kwargs_count=len(kwargs)
            )
            
            return result
            
        except Exception as e:
            execution_time = time.time() - start_time
            
            logger.error(
                "tool_execution_failed",
                tool_name=tool_name,
                execution_time_ms=execution_time * 1000,
                status="error",
                error_type=type(e).__name__,
                error_message=str(e)
            )
            
            raise
    
    return wrapper

@mcp.tool
@log_tool_execution
def monitored_tool(data: str) -> str:
    """Tool with comprehensive monitoring"""
    # Implementation here
    return f"Processed: {data}"
```

These best practices provide a comprehensive framework for building robust, secure, and maintainable FastMCP servers in production environments.