# FastMCP TypeScript/JavaScript Implementation Guide

## TypeScript Ecosystem Overview

### Available Implementations

#### Official MCP TypeScript SDK
- **Repository**: `@modelcontextprotocol/sdk`
- **Purpose**: Low-level, official implementation
- **Use Case**: Maximum control, custom implementations

#### Community FastMCP TypeScript Implementations

1. **punkpeye/fastmcp**
   - **npm**: `fastmcp`
   - **Features**: TypeScript-first framework, built on official SDK
   - **Status**: Active development

2. **JeromyJSmith/fastmcp-js**
   - **Repository**: `@jeromyjsmith/fastmcp-js`
   - **Features**: JavaScript-focused implementation
   - **Status**: Community maintained

3. **Ramtinhoss/fastmcp2**
   - **Features**: Enhanced TypeScript framework
   - **Status**: Community fork

## Installation and Setup

### Prerequisites
```bash
# Node.js 18.x+ required
node --version

# TypeScript development environment
npm install -g typescript ts-node
```

### Installing Official MCP SDK
```bash
npm install @modelcontextprotocol/sdk
```

### Installing FastMCP TypeScript
```bash
# punkpeye implementation
npm install fastmcp

# Alternative implementations
npm install @jeromyjsmith/fastmcp-js
```

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Official MCP TypeScript SDK

### Basic Server Setup
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Create server instance
const server = new Server(
  {
    name: "typescript-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// Define tool schema
const AddNumbersSchema = z.object({
  a: z.number().describe("First number"),
  b: z.number().describe("Second number"),
});

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "add_numbers",
        description: "Add two numbers together",
        inputSchema: AddNumbersSchema,
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === "add_numbers") {
    const { a, b } = AddNumbersSchema.parse(args);
    const result = a + b;
    
    return {
      content: [
        {
          type: "text",
          text: `${a} + ${b} = ${result}`,
        },
      ],
    };
  }
  
  throw new Error(`Unknown tool: ${name}`);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP server running on stdio");
}

if (require.main === module) {
  main().catch(console.error);
}
```

### Resource Implementation
```typescript
import { ListResourcesRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Register resource handlers
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "config://app",
        name: "Application Configuration",
        description: "Current application settings",
        mimeType: "application/json",
      },
      {
        uri: "status://system",
        name: "System Status",
        description: "Current system status and metrics",
        mimeType: "application/json",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  switch (uri) {
    case "config://app":
      const config = {
        name: "TypeScript MCP Server",
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
        features: {
          auth: true,
          logging: true,
          metrics: false,
        },
      };
      
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(config, null, 2),
          },
        ],
      };
      
    case "status://system":
      const status = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
      };
      
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(status, null, 2),
          },
        ],
      };
      
    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
});
```

### Prompt Implementation
```typescript
import { ListPromptsRequestSchema, GetPromptRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const CodeReviewPromptSchema = z.object({
  language: z.string(),
  code: z.string(),
  focus: z.array(z.string()).optional(),
});

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "code_review",
        description: "Generate code review prompts",
        arguments: CodeReviewPromptSchema,
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === "code_review") {
    const { language, code, focus } = CodeReviewPromptSchema.parse(args || {});
    
    const focusAreas = focus || [
      "Code quality and readability",
      "Performance considerations",
      "Security issues",
      "Best practices",
      "Potential bugs"
    ];
    
    const prompt = `Please review the following ${language} code:

\`\`\`${language}
${code}
\`\`\`

Focus on:
${focusAreas.map((area, i) => `${i + 1}. ${area}`).join('\n')}

Provide specific suggestions for improvement.`;

    return {
      description: `Code review for ${language}`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: prompt,
          },
        },
      ],
    };
  }
  
  throw new Error(`Unknown prompt: ${name}`);
});
```

## FastMCP TypeScript Framework

### Basic FastMCP Setup
```typescript
import { FastMCP } from "fastmcp";
import { z } from "zod";

const server = new FastMCP({
  name: "fastmcp-typescript-server",
  version: "1.0.0",
});

// Simple tool
const GreetSchema = z.object({
  name: z.string().describe("Name to greet"),
  language: z.enum(["en", "es", "fr"]).optional().describe("Language for greeting"),
});

server.addTool({
  name: "greet",
  description: "Greet someone in different languages",
  inputSchema: GreetSchema,
  handler: async ({ name, language = "en" }) => {
    const greetings = {
      en: `Hello, ${name}!`,
      es: `¡Hola, ${name}!`,
      fr: `Bonjour, ${name}!`,
    };
    
    return {
      content: [{
        type: "text",
        text: greetings[language]
      }]
    };
  }
});

// Export server for CLI usage
export { server };

// Direct execution
if (require.main === module) {
  server.run();
}
```

### Advanced Tool with Validation
```typescript
import { z } from "zod";
import { FastMCP } from "fastmcp";
import axios from "axios";

const server = new FastMCP({
  name: "advanced-typescript-server",
  version: "1.0.0",
});

// Complex data validation
const UserSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().int().min(13).max(120),
  profile: z.object({
    bio: z.string().optional(),
    interests: z.array(z.string()).max(10),
    preferences: z.object({
      theme: z.enum(["light", "dark", "auto"]),
      notifications: z.boolean(),
      language: z.string().default("en"),
    }),
  }),
});

server.addTool({
  name: "create_user",
  description: "Create a user with comprehensive validation",
  inputSchema: UserSchema,
  handler: async (userData) => {
    try {
      // Validate data (automatically done by schema)
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Simulate database operation
      const user = {
        id: userId,
        ...userData,
        createdAt: new Date().toISOString(),
        status: "active",
      };
      
      // Simulate async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            message: "User created successfully",
            user: user
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error.message
          }, null, 2)
        }],
        isError: true
      };
    }
  }
});

// API integration tool
const ApiCallSchema = z.object({
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET"),
  headers: z.record(z.string()).optional(),
  data: z.any().optional(),
});

server.addTool({
  name: "api_call",
  description: "Make HTTP API calls with validation",
  inputSchema: ApiCallSchema,
  handler: async ({ url, method, headers, data }) => {
    try {
      const response = await axios({
        url,
        method,
        headers,
        data,
        timeout: 10000,
      });
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            data: response.data
          }, null, 2)
        }]
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: "HTTP Error",
              status: error.response?.status,
              statusText: error.response?.statusText,
              message: error.message
            }, null, 2)
          }],
          isError: true
        };
      }
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: "Request Error",
            message: error.message
          }, null, 2)
        }],
        isError: true
      };
    }
  }
});
```

### Resource Implementation in FastMCP
```typescript
// Static resource
server.addResource({
  uri: "config://database",
  name: "Database Configuration",
  description: "Database connection and settings",
  mimeType: "application/json",
  handler: async () => {
    const config = {
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "myapp",
      ssl: process.env.NODE_ENV === "production",
      poolSize: 10,
      timeout: 30000,
    };
    
    return {
      contents: [{
        uri: "config://database",
        mimeType: "application/json",
        text: JSON.stringify(config, null, 2)
      }]
    };
  }
});

// Dynamic resource with parameters
server.addResource({
  uri: "logs://recent",
  name: "Recent Logs",
  description: "Recent application logs",
  mimeType: "text/plain",
  handler: async (uri, params) => {
    // Parse query parameters from URI
    const url = new URL(uri);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const level = url.searchParams.get('level') || 'info';
    
    // Simulate log retrieval
    const logs = Array.from({ length: Math.min(limit, 50) }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      level: ['info', 'warn', 'error'][Math.floor(Math.random() * 3)],
      message: `Log message ${i + 1}`,
      module: ['auth', 'api', 'database'][Math.floor(Math.random() * 3)]
    }))
    .filter(log => level === 'all' || log.level === level)
    .map(log => `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message} (${log.module})`)
    .join('\n');
    
    return {
      contents: [{
        uri,
        mimeType: "text/plain",
        text: logs
      }]
    };
  }
});
```

### Async Operations and Error Handling
```typescript
import fs from 'fs/promises';
import path from 'path';

// File operations tool
const FileOpSchema = z.object({
  operation: z.enum(["read", "write", "list", "delete"]),
  path: z.string(),
  content: z.string().optional(),
});

server.addTool({
  name: "file_operations",
  description: "Perform file system operations",
  inputSchema: FileOpSchema,
  handler: async ({ operation, path: filePath, content }) => {
    try {
      // Security check - prevent path traversal
      const resolvedPath = path.resolve(filePath);
      const allowedDir = path.resolve('./data');
      
      if (!resolvedPath.startsWith(allowedDir)) {
        throw new Error("Access denied: Path outside allowed directory");
      }
      
      switch (operation) {
        case "read":
          try {
            const data = await fs.readFile(resolvedPath, 'utf-8');
            return {
              content: [{
                type: "text",
                text: `File content (${data.length} characters):\n\n${data}`
              }]
            };
          } catch (error) {
            if (error.code === 'ENOENT') {
              throw new Error(`File not found: ${filePath}`);
            }
            throw error;
          }
          
        case "write":
          if (!content) {
            throw new Error("Content is required for write operation");
          }
          
          // Ensure directory exists
          const dir = path.dirname(resolvedPath);
          await fs.mkdir(dir, { recursive: true });
          
          await fs.writeFile(resolvedPath, content, 'utf-8');
          return {
            content: [{
              type: "text",
              text: `File written successfully: ${filePath} (${content.length} characters)`
            }]
          };
          
        case "list":
          const stats = await fs.stat(resolvedPath);
          if (stats.isDirectory()) {
            const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
            const listing = entries.map(entry => ({
              name: entry.name,
              type: entry.isDirectory() ? 'directory' : 'file',
              path: path.join(filePath, entry.name)
            }));
            
            return {
              content: [{
                type: "text",
                text: JSON.stringify(listing, null, 2)
              }]
            };
          } else {
            return {
              content: [{
                type: "text",
                text: `${filePath} is a file (${stats.size} bytes)`
              }]
            };
          }
          
        case "delete":
          await fs.unlink(resolvedPath);
          return {
            content: [{
              type: "text",
              text: `File deleted successfully: ${filePath}`
            }]
          };
          
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error.message}`
        }],
        isError: true
      };
    }
  }
});
```

### OAuth Integration (FastMCP 2.0)
```typescript
import { FastMCP } from "fastmcp";

const server = new FastMCP({
  name: "oauth-enabled-server",
  version: "1.0.0",
  oauth: {
    authorizationEndpoint: "https://api.example.com/oauth/authorize",
    tokenEndpoint: "https://api.example.com/oauth/token",
    clientId: process.env.OAUTH_CLIENT_ID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    scopes: ["read", "write"]
  }
});

// Authenticated tool
server.addTool({
  name: "protected_operation",
  description: "Perform an operation that requires authentication",
  inputSchema: z.object({
    data: z.string()
  }),
  handler: async ({ data }, context) => {
    // Access token is automatically available in context
    const { accessToken } = context.auth;
    
    if (!accessToken) {
      throw new Error("Authentication required");
    }
    
    // Use token for API calls
    const response = await fetch('https://api.example.com/protected', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify({ data })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const result = await response.json();
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2)
      }]
    };
  }
});
```

## Package.json Configuration

### Complete package.json Example
```json
{
  "name": "my-fastmcp-typescript-server",
  "version": "1.0.0",
  "description": "FastMCP TypeScript server implementation",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "fastmcp": "^1.0.0",
    "zod": "^3.22.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  },
  "keywords": ["mcp", "fastmcp", "typescript", "ai", "llm"],
  "author": "Your Name",
  "license": "MIT"
}
```

## Deployment and Distribution

### Building for Production
```bash
# Build TypeScript
npm run build

# Create distributable package
npm pack

# Publish to npm
npm publish
```

### Running in Different Environments
```bash
# Development with hot reload
npm run dev

# Production build
npm run build && npm start

# Using ts-node directly
npx ts-node src/index.ts

# With FastMCP CLI (if available)
fastmcp run src/index.ts --transport http --port 8000
```

This comprehensive guide covers TypeScript/JavaScript implementation of FastMCP servers, from basic setup to advanced features like OAuth integration, file operations, and production deployment.