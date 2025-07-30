# FastMCP Deployment Patterns and Production Guide

## Deployment Architecture Overview

### Deployment Options

FastMCP servers can be deployed in various configurations:

1. **Local Development**: STDIO transport for local tools and testing
2. **HTTP Server**: Web-based deployment for remote access
3. **Container Deployment**: Docker/Kubernetes for scalable production
4. **Serverless**: AWS Lambda, Google Cloud Functions, etc.
5. **Edge Deployment**: CDN edge functions, Cloudflare Workers

## Local Development Deployment

### STDIO Transport (Default)
```python
# dev_server.py
from fastmcp import FastMCP

mcp = FastMCP("Development Server")

@mcp.tool
def debug_tool(message: str) -> str:
    """Development debugging tool"""
    return f"Debug: {message}"

if __name__ == "__main__":
    # Default STDIO transport - perfect for Claude Desktop integration
    mcp.run()
```

### CLI Usage for Development
```bash
# Direct execution
python dev_server.py

# Using FastMCP CLI with hot reload
fastmcp run dev_server.py --reload

# Run with specific Python version
fastmcp run dev_server.py --python 3.11

# Run with additional dependencies
fastmcp run dev_server.py --with pandas --with requests

# Run from requirements file
fastmcp run dev_server.py --with-requirements requirements.txt
```

### Development Configuration
```python
# config/development.py
from fastmcp import FastMCP
import os
import logging

def create_dev_server():
    """Create development server with debug features"""
    
    # Enable debug logging
    logging.basicConfig(level=logging.DEBUG)
    
    mcp = FastMCP(
        name="Dev Server",
        version="dev",
        description="Development server with debugging enabled"
    )
    
    # Add development tools
    @mcp.tool
    def inspect_environment() -> str:
        """Inspect current environment variables"""
        env_vars = {k: v for k, v in os.environ.items() if not k.startswith('_')}
        return json.dumps(env_vars, indent=2)
    
    @mcp.resource("dev-config")
    def get_dev_config() -> str:
        """Get development configuration"""
        config = {
            "debug": True,
            "log_level": "DEBUG",
            "environment": "development",
            "hot_reload": True
        }
        return json.dumps(config, indent=2)
    
    return mcp

if __name__ == "__main__":
    server = create_dev_server()
    server.run()
```

## HTTP Server Deployment

### Basic HTTP Deployment
```python
# http_server.py
from fastmcp import FastMCP
import os

mcp = FastMCP("HTTP MCP Server")

@mcp.tool
def web_tool(data: str) -> str:
    """Tool accessible via HTTP"""
    return f"HTTP processed: {data}"

@mcp.custom_route("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "server": mcp.name}

if __name__ == "__main__":
    mcp.run(
        transport="http",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        path="/mcp"
    )
```

### Production HTTP Configuration
```python
# production_http.py
from fastmcp import FastMCP
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import logging
import time

class ProductionHTTPServer:
    def __init__(self):
        self.mcp = FastMCP(
            name="Production HTTP Server",
            version="1.0.0"
        )
        self.setup_middleware()
        self.setup_tools()
        self.setup_monitoring()
    
    def setup_middleware(self):
        """Configure production middleware"""
        
        # Add CORS middleware
        self.mcp.app.add_middleware(
            CORSMiddleware,
            allow_origins=["https://claude.ai", "https://desktop.claude.ai"],
            allow_credentials=True,
            allow_methods=["GET", "POST"],
            allow_headers=["*"],
        )
        
        # Add compression
        self.mcp.app.add_middleware(GZipMiddleware, minimum_size=1000)
        
        # Add request logging
        @self.mcp.app.middleware("http")
        async def log_requests(request, call_next):
            start_time = time.time()
            response = await call_next(request)
            process_time = time.time() - start_time
            
            logging.info(
                f"{request.method} {request.url.path} - "
                f"{response.status_code} - {process_time:.3f}s"
            )
            
            return response
    
    def setup_tools(self):
        """Setup production tools"""
        
        @self.mcp.tool
        def production_tool(input_data: dict) -> str:
            """Production-ready tool with validation"""
            try:
                # Validate input
                if not isinstance(input_data, dict):
                    raise ValueError("Input must be a dictionary")
                
                # Process data
                result = self.process_production_data(input_data)
                return f"Success: {result}"
                
            except Exception as e:
                logging.error(f"Production tool error: {e}")
                return f"Error: {str(e)}"
    
    def setup_monitoring(self):
        """Setup monitoring endpoints"""
        
        @self.mcp.custom_route("/health")
        async def health_check():
            return {
                "status": "healthy",
                "timestamp": time.time(),
                "version": self.mcp.version
            }
        
        @self.mcp.custom_route("/metrics")
        async def metrics():
            return {
                "tools_count": len(self.mcp._tools),
                "resources_count": len(self.mcp._resources),
                "uptime": time.time() - self.start_time
            }
    
    def process_production_data(self, data: dict) -> str:
        """Process data in production environment"""
        return f"Processed {len(data)} fields"
    
    def run(self):
        """Run production server"""
        self.start_time = time.time()
        
        # Configure logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        # Run server
        self.mcp.run(
            transport="http",
            host="0.0.0.0",
            port=8000,
            log_level="info"
        )

if __name__ == "__main__":
    server = ProductionHTTPServer()
    server.run()
```

## Container Deployment

### Docker Configuration

#### Dockerfile
```dockerfile
# Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash mcp && \
    chown -R mcp:mcp /app
USER mcp

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Default command
CMD ["python", "production_http.py"]
```

#### Multi-stage Dockerfile for Production
```dockerfile
# Multi-stage Dockerfile
FROM python:3.11 AS builder

WORKDIR /app

# Install build dependencies
RUN pip install --user pipenv

# Copy Pipfile
COPY Pipfile Pipfile.lock ./

# Install dependencies to user directory
RUN python -m pipenv install --deploy --ignore-pipfile --user

# Production stage
FROM python:3.11-slim AS production

# Copy installed dependencies from builder
COPY --from=builder /root/.local /root/.local

# Update PATH
ENV PATH=/root/.local/bin:$PATH

WORKDIR /app

# Copy application code
COPY . .

# Security: Create non-root user
RUN useradd --create-home --shell /bin/bash mcp && \
    chown -R mcp:mcp /app
USER mcp

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

CMD ["python", "production_http.py"]
```

### Docker Compose for Development
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  fastmcp-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=development
      - DEBUG=true
      - LOG_LEVEL=DEBUG
    volumes:
      - .:/app
      - /app/node_modules
    command: ["fastmcp", "run", "server.py", "--reload", "--transport", "http"]
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### Docker Compose for Production
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  fastmcp-server:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=INFO
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - fastmcp-server
    restart: unless-stopped

volumes:
  redis_data:

networks:
  default:
    name: fastmcp-network
```

## Kubernetes Deployment

### Kubernetes Manifests

#### Deployment
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fastmcp-server
  labels:
    app: fastmcp-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fastmcp-server
  template:
    metadata:
      labels:
        app: fastmcp-server
    spec:
      containers:
      - name: fastmcp-server
        image: your-registry/fastmcp-server:latest
        ports:
        - containerPort: 8000
        env:
        - name: NODE_ENV
          value: "production"
        - name: LOG_LEVEL
          value: "INFO"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: fastmcp-secrets
              key: redis-url
        resources:
          limits:
            cpu: 500m
            memory: 512Mi
          requests:
            cpu: 250m
            memory: 256Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: fastmcp-service
spec:
  selector:
    app: fastmcp-server
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8000
  type: ClusterIP
```

#### Ingress
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: fastmcp-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: fastmcp-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /mcp
        pathType: Prefix
        backend:
          service:
            name: fastmcp-service
            port:
              number: 80
```

#### ConfigMap and Secrets
```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fastmcp-config
data:
  server.conf: |
    server_name=FastMCP Production Server
    log_level=INFO
    max_connections=1000
    timeout=30

---
apiVersion: v1
kind: Secret
metadata:
  name: fastmcp-secrets
type: Opaque
data:
  redis-url: cmVkaXM6Ly9yZWRpcy5kZWZhdWx0LnN2Yy5jbHVzdGVyLmxvY2FsOjYzNzk=
  api-key: eW91ci1zZWNyZXQtYXBpLWtleQ==
```

## Serverless Deployment

### AWS Lambda Deployment

#### Lambda Handler
```python
# lambda_handler.py
from fastmcp import FastMCP
import json
import base64

# Initialize server outside handler for reuse
mcp = FastMCP("Lambda MCP Server")

@mcp.tool
def lambda_tool(data: str) -> str:
    """Tool running in AWS Lambda"""
    return f"Lambda processed: {data}"

@mcp.resource("lambda-info")
def get_lambda_info() -> str:
    """Get Lambda environment information"""
    import os
    return json.dumps({
        "function_name": os.environ.get("AWS_LAMBDA_FUNCTION_NAME"),
        "runtime": os.environ.get("AWS_EXECUTION_ENV"),
        "region": os.environ.get("AWS_REGION")
    })

def lambda_handler(event, context):
    """AWS Lambda handler for MCP server"""
    try:
        # Parse the incoming request
        if 'body' in event:
            # API Gateway format
            body = event['body']
            if event.get('isBase64Encoded'):
                body = base64.b64decode(body).decode('utf-8')
            request_data = json.loads(body)
        else:
            # Direct invocation format
            request_data = event
        
        # Process MCP request
        response = process_mcp_request(request_data)
        
        # Return response in API Gateway format
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(response)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)})
        }

def process_mcp_request(request_data):
    """Process MCP request in Lambda context"""
    method = request_data.get('method')
    
    if method == 'tools/list':
        return {
            'tools': [
                {
                    'name': 'lambda_tool',
                    'description': 'Tool running in AWS Lambda',
                    'inputSchema': {
                        'type': 'object',
                        'properties': {
                            'data': {'type': 'string'}
                        },
                        'required': ['data']
                    }
                }
            ]
        }
    elif method == 'tools/call':
        tool_name = request_data['params']['name']
        arguments = request_data['params']['arguments']
        
        if tool_name == 'lambda_tool':
            result = lambda_tool(arguments['data'])
            return {
                'content': [
                    {'type': 'text', 'text': result}
                ]
            }
    
    raise ValueError(f"Unknown method: {method}")
```

#### SAM Template
```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Timeout: 30
    Runtime: python3.11
    Environment:
      Variables:
        LOG_LEVEL: INFO

Resources:
  FastMCPFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: lambda_handler.lambda_handler
      MemorySize: 512
      Events:
        Api:
          Type: Api
          Properties:
            Path: /mcp
            Method: post
            Cors:
              AllowMethods: "'POST, OPTIONS'"
              AllowHeaders: "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'"
              AllowOrigin: "'*'"
      Environment:
        Variables:
          NODE_ENV: production

  ApiGatewayApi:
    Type: AWS::Serverless::Api
    Properties:
      StageName: prod
      Cors:
        AllowMethods: "'POST, OPTIONS'"
        AllowHeaders: "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'"
        AllowOrigin: "'*'"

Outputs:
  FastMCPApi:
    Description: "API Gateway endpoint URL"
    Value: !Sub "https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/mcp"
```

### Google Cloud Functions Deployment

#### Cloud Function Implementation
```python
# main.py (Google Cloud Functions)
from fastmcp import FastMCP
import functions_framework
import json

# Initialize server
mcp = FastMCP("Cloud Function MCP Server")

@mcp.tool
def cloud_tool(message: str) -> str:
    """Tool running in Google Cloud Functions"""
    return f"Cloud processed: {message}"

@functions_framework.http
def mcp_handler(request):
    """Google Cloud Functions HTTP handler"""
    # Set CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    }
    
    if request.method == 'OPTIONS':
        return ('', 204, headers)
    
    try:
        request_json = request.get_json()
        
        # Process MCP request
        response = process_cloud_request(request_json)
        
        return (json.dumps(response), 200, headers)
        
    except Exception as e:
        error_response = {'error': str(e)}
        return (json.dumps(error_response), 500, headers)

def process_cloud_request(request_data):
    """Process MCP request in Cloud Functions context"""
    # Similar to Lambda implementation
    method = request_data.get('method')
    
    if method == 'tools/call':
        tool_name = request_data['params']['name']
        arguments = request_data['params']['arguments']
        
        if tool_name == 'cloud_tool':
            result = cloud_tool(arguments['message'])
            return {
                'content': [{'type': 'text', 'text': result}]
            }
    
    raise ValueError(f"Unknown method: {method}")
```

#### Cloud Function Configuration
```yaml
# cloudbuild.yaml
steps:
- name: 'gcr.io/cloud-builders/gcloud'
  args: ['functions', 'deploy', 'fastmcp-server',
         '--runtime', 'python311',
         '--trigger-http',
         '--entry-point', 'mcp_handler',
         '--memory', '512MB',
         '--timeout', '60s',
         '--allow-unauthenticated',
         '--set-env-vars', 'LOG_LEVEL=INFO']
```

## Edge Deployment (Cloudflare Workers)

### Cloudflare Worker Implementation
```javascript
// worker.js
import { FastMCP } from 'fastmcp';

// Initialize MCP server for edge deployment
const mcp = new FastMCP({
  name: 'Edge MCP Server',
  version: '1.0.0'
});

// Add edge-optimized tool
mcp.addTool({
  name: 'edge_tool',
  description: 'Tool running on Cloudflare Edge',
  inputSchema: {
    type: 'object',
    properties: {
      data: { type: 'string' }
    },
    required: ['data']
  },
  handler: async ({ data }) => {
    // Edge processing logic
    const processed = `Edge processed: ${data} at ${new Date().toISOString()}`;
    
    return {
      content: [{ type: 'text', text: processed }]
    };
  }
});

// Cloudflare Worker fetch handler
export default {
  async fetch(request, env, ctx) {
    // Handle CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }
    
    try {
      const requestData = await request.json();
      
      // Process MCP request
      const response = await processMCPRequest(requestData);
      
      return new Response(JSON.stringify(response), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
      
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};

async function processMCPRequest(requestData) {
  // Implement MCP protocol handling for edge environment
  const method = requestData.method;
  
  if (method === 'tools/call') {
    const { name, arguments: args } = requestData.params;
    
    if (name === 'edge_tool') {
      const result = await edgeTool(args.data);
      return {
        content: [{ type: 'text', text: result }]
      };
    }
  }
  
  throw new Error(`Unknown method: ${method}`);
}

async function edgeTool(data) {
  return `Edge processed: ${data} at ${new Date().toISOString()}`;
}
```

### wrangler.toml Configuration
```toml
# wrangler.toml
name = "fastmcp-edge-server"
compatibility_date = "2024-01-01"
main = "worker.js"

[env.production]
name = "fastmcp-edge-server-prod"
routes = [
  { pattern = "api.yourdomain.com/mcp", zone_name = "yourdomain.com" }
]

[env.staging]
name = "fastmcp-edge-server-staging"

# Environment variables
[vars]
LOG_LEVEL = "INFO"
```

## Load Balancing and Scaling

### Nginx Load Balancer Configuration
```nginx
# nginx.conf
upstream fastmcp_servers {
    least_conn;
    server fastmcp-1:8000 weight=1 max_fails=3 fail_timeout=30s;
    server fastmcp-2:8000 weight=1 max_fails=3 fail_timeout=30s;
    server fastmcp-3:8000 weight=1 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    location /mcp {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://fastmcp_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 10s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    location /health {
        proxy_pass http://fastmcp_servers/health;
        access_log off;
    }
}
```

This comprehensive deployment guide covers all major deployment patterns for FastMCP servers, from local development to production-scale cloud deployments, providing the flexibility to choose the right deployment strategy for your use case.