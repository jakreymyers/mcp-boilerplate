# MCP Protocol Specification 2025-06-18

## Overview

The Model Context Protocol specification version 2025-06-18 represents a significant update to the MCP standard, introducing enhanced authentication, elicitation support, structured tool output, and improved resource handling.

## Protocol Foundation

### JSON-RPC 2.0 Base

MCP builds on the JSON-RPC 2.0 specification for all communication:

```json
{
  "jsonrpc": "2.0",
  "method": "method_name",
  "params": { ... },
  "id": "request_id"
}
```

### Stateful Protocol

Unlike HTTP, MCP maintains persistent connections between clients and servers:
- Connection establishment with capability negotiation
- Maintained session state throughout interaction
- Proper connection lifecycle management

## New Features in 2025-06-18

### 1. Enhanced Authentication Protocol

The 2025-06-18 specification introduces a new authentication system that separates authentication servers from resource servers.

#### Authentication Flow

```typescript
interface AuthenticationRequest {
  method: "auth/initialize";
  params: {
    provider: string;          // OAuth provider (e.g., "google", "github")
    clientId: string;          // Application client ID
    scopes?: string[];         // Requested permissions
    redirectUri?: string;      // OAuth redirect URI
  };
}

interface AuthenticationResponse {
  authUrl: string;             // URL for user authentication
  state: string;               // OAuth state parameter
  codeVerifier?: string;       // PKCE code verifier
}

interface AuthenticationComplete {
  method: "auth/complete";
  params: {
    code: string;              // Authorization code
    state: string;             // OAuth state parameter
  };
}

interface AuthenticationResult {
  accessToken: string;         // Bearer token
  refreshToken?: string;       // Refresh token
  expiresIn: number;          // Token lifetime in seconds
  tokenType: "Bearer";        // Token type
}
```

#### Integration with Existing OAuth Providers

```typescript
// Example: GitHub OAuth integration
const authRequest = {
  method: "auth/initialize",
  params: {
    provider: "github",
    clientId: "your-github-client-id",
    scopes: ["read:user", "repo"],
    redirectUri: "https://your-app.com/callback"
  }
};

// Server responds with GitHub OAuth URL
const authResponse = await client.request(authRequest, AuthSchema);
// User visits authResponse.authUrl and authorizes

// Complete authentication with callback code
const completeRequest = {
  method: "auth/complete",
  params: {
    code: "github-authorization-code",
    state: authResponse.state
  }
};

const tokens = await client.request(completeRequest, AuthCompleteSchema);
// Use tokens.accessToken for subsequent requests
```

### 2. Elicitation Support

Elicitation allows servers to request additional information from users during tool execution.

#### Elicitation Request

```typescript
interface ElicitationRequest {
  method: "elicitation/request";
  params: {
    prompt: string;            // Question to ask the user
    inputType: "text" | "choice" | "file" | "confirmation";
    choices?: string[];        // For choice type
    required: boolean;         // Whether response is required
    context?: any;            // Additional context
  };
}

interface ElicitationResponse {
  value: string | boolean | File; // User's response
  cancelled?: boolean;        // Whether user cancelled
}
```

#### Tool Implementation with Elicitation

```typescript
server.registerTool("smart-file-processor", {
  title: "Smart File Processor",
  description: "Process files with user guidance",
  inputSchema: {
    filePath: z.string().describe("Path to file to process")
  }
}, async ({ filePath }) => {
  // Read file first
  const content = await fs.readFile(filePath, 'utf-8');
  
  // Ask user about processing options
  const processingChoice = await client.request({
    method: "elicitation/request",
    params: {
      prompt: `File contains ${content.length} characters. How should it be processed?`,
      inputType: "choice",
      choices: ["summarize", "analyze", "format", "translate"],
      required: true
    }
  }, ElicitationResponseSchema);
  
  if (processingChoice.cancelled) {
    return {
      content: [{ type: "text", text: "Processing cancelled by user" }],
      isError: true
    };
  }
  
  // Process based on user choice
  switch (processingChoice.value) {
    case "summarize":
      return { content: [{ type: "text", text: `Summary: ${content.slice(0, 100)}...` }] };
    case "analyze":
      return { content: [{ type: "text", text: `Analysis: ${content.split('\n').length} lines` }] };
    // ... other cases
  }
});
```

### 3. Structured Tool Output

Tools can now return explicitly structured content with enhanced metadata.

#### Structured Content Types

```typescript
interface StructuredContent extends BaseContent {
  structure: {
    type: "table" | "list" | "tree" | "chart" | "form";
    schema: JSONSchema;      // Structure definition
    metadata?: {
      title?: string;
      description?: string;
      version?: string;
      lastUpdated?: string;
    };
  };
  data: any;                // Structured data matching schema
}

// Example: Table structure
interface TableStructure {
  type: "table";
  schema: {
    columns: Array<{
      name: string;
      type: "string" | "number" | "boolean" | "date";
      description?: string;
    }>;
  };
  data: {
    rows: Array<Record<string, any>>;
    totalCount?: number;
    hasMore?: boolean;
  };
}
```

#### Tool with Structured Output

```typescript
server.registerTool("database-query", {
  title: "Database Query",
  description: "Query database and return structured results",
  inputSchema: {
    query: z.string().describe("SQL query to execute"),
    format: z.enum(["table", "json", "csv"]).describe("Output format")
  }
}, async ({ query, format }) => {
  const results = await db.query(query);
  
  if (format === "table") {
    return {
      content: [{
        type: "structured",
        structure: {
          type: "table",
          schema: {
            columns: [
              { name: "id", type: "number", description: "Record ID" },
              { name: "name", type: "string", description: "Record name" },
              { name: "created", type: "date", description: "Creation date" }
            ]
          },
          metadata: {
            title: "Query Results",
            description: `Results for: ${query}`,
            lastUpdated: new Date().toISOString()
          }
        },
        data: {
          rows: results,
          totalCount: results.length,
          hasMore: false
        }
      }]
    };
  }
  
  // Handle other formats...
});
```

### 4. Resource Links in Tool Responses

Tools can now return references to resources for enhanced context management.

#### Resource Link Definition

```typescript
interface ResourceLink {
  uri: string;                // Resource URI
  name?: string;              // Display name
  description?: string;       // Resource description
  mimeType?: string;          // Expected content type
  size?: number;              // Resource size in bytes
  lastModified?: string;      // Last modification timestamp
  metadata?: Record<string, any>; // Additional metadata
}

interface ResourceContent extends BaseContent {
  type: "resource";
  resource: ResourceLink;
}
```

#### Tool Returning Resource Links

```typescript
server.registerTool("generate-report", {
  title: "Generate Report",
  description: "Generate a detailed report file",
  inputSchema: {
    data: z.object({}).describe("Data to include in report"),
    format: z.enum(["pdf", "html", "markdown"]).describe("Report format")
  }
}, async ({ data, format }) => {
  // Generate report file
  const reportPath = await generateReport(data, format);
  const stats = await fs.stat(reportPath);
  
  return {
    content: [
      {
        type: "text",
        text: `Report generated successfully in ${format} format`
      },
      {
        type: "resource",
        resource: {
          uri: `file://${reportPath}`,
          name: `Report.${format}`,
          description: "Generated analysis report",
          mimeType: format === "pdf" ? "application/pdf" : 
                   format === "html" ? "text/html" : "text/markdown",
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
          metadata: {
            generator: "generate-report tool",
            version: "1.0.0",
            dataPoints: Object.keys(data).length
          }
        }
      }
    ]
  };
});
```

## Protocol Messages

### Capability Negotiation

Enhanced capability negotiation in 2025-06-18:

```typescript
interface ServerCapabilities {
  experimental?: Record<string, any>;
  tools?: {
    listChanged?: boolean;     // Supports tool list notifications
    structured?: boolean;      // Supports structured output
  };
  resources?: {
    subscribe?: boolean;       // Supports resource subscriptions
    listChanged?: boolean;     // Supports resource list notifications
    links?: boolean;           // Supports resource links
  };
  prompts?: {
    listChanged?: boolean;     // Supports prompt list notifications
  };
  authentication?: {
    providers?: string[];      // Supported OAuth providers
    flows?: ("authorization_code" | "client_credentials")[];
  };
  elicitation?: {
    types?: ("text" | "choice" | "file" | "confirmation")[];
  };
}
```

### Notification Messages

New notification types in 2025-06-18:

```typescript
// Authentication status updates
interface AuthStatusNotification {
  method: "notifications/auth/status_changed";
  params: {
    status: "authenticated" | "expired" | "revoked";
    provider?: string;
    expiresIn?: number;
  };
}

// Elicitation timeout
interface ElicitationTimeoutNotification {
  method: "notifications/elicitation/timeout";
  params: {
    requestId: string;
    timeoutSeconds: number;
  };
}

// Resource link updates
interface ResourceLinkNotification {
  method: "notifications/resources/link_updated";
  params: {
    uri: string;
    change: "created" | "modified" | "deleted";
    metadata?: Record<string, any>;
  };
}
```

## Migration from Previous Versions

### Breaking Changes

1. **Authentication Flow**: Servers implementing custom authentication must migrate to the new OAuth-based system
2. **Tool Output**: Tools returning complex data should migrate to structured output format
3. **Resource References**: Resource links replace simple URI references in tool responses

### Backward Compatibility

The 2025-06-18 specification maintains backward compatibility for:
- Basic tool definitions and calls
- Simple resource access
- Text-based content responses
- Core JSON-RPC 2.0 message structure

### Migration Example

```typescript
// Before (pre-2025-06-18)
server.registerTool("old-style", {
  title: "Old Style Tool",
  inputSchema: { query: z.string() }
}, async ({ query }) => {
  const results = await search(query);
  return {
    content: [{ type: "text", text: JSON.stringify(results) }]
  };
});

// After (2025-06-18)
server.registerTool("new-style", {
  title: "New Style Tool",
  inputSchema: { query: z.string() }
}, async ({ query }) => {
  const results = await search(query);
  
  return {
    content: [{
      type: "structured",
      structure: {
        type: "list",
        schema: {
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              url: { type: "string" },
              score: { type: "number" }
            }
          }
        },
        metadata: {
          title: "Search Results",
          description: `Results for: ${query}`
        }
      },
      data: { items: results }
    }]
  };
});
```

## Security Considerations

### OAuth Security

- Use PKCE (Proof Key for Code Exchange) for public clients
- Implement proper token storage and rotation
- Validate redirect URIs against registered patterns
- Use secure token transmission (HTTPS only)

### Elicitation Security

- Validate user input against expected schemas
- Implement timeout mechanisms for user responses
- Sanitize user input before processing
- Provide clear context about why information is requested

### Resource Link Security

- Validate resource URIs before serving content
- Implement proper access controls for linked resources
- Use secure protocols (HTTPS/file with proper permissions)
- Sanitize metadata to prevent injection attacks

## Implementation Guidelines

### Server Implementation

```typescript
class MCP2025Server {
  private server: McpServer;
  
  constructor() {
    this.server = new McpServer({
      name: "mcp-2025-server",
      version: "2.0.0",
      capabilities: {
        tools: { 
          listChanged: true,
          structured: true 
        },
        resources: { 
          subscribe: true,
          listChanged: true,
          links: true 
        },
        authentication: {
          providers: ["google", "github"],
          flows: ["authorization_code"]
        },
        elicitation: {
          types: ["text", "choice", "confirmation"]
        }
      }
    });
  }
  
  // Implementation methods...
}
```

### Client Implementation

```typescript
class MCP2025Client {
  private client: Client;
  
  async connectWithAuth(provider: string, credentials: any) {
    // Implement OAuth flow
    const authResult = await this.authenticateWithProvider(provider, credentials);
    
    // Set authorization header for subsequent requests
    this.client.setHeader("Authorization", `Bearer ${authResult.accessToken}`);
    
    return authResult;
  }
  
  async handleElicitation(request: ElicitationRequest) {
    // Present elicitation prompt to user
    // Return user response
  }
}
```

The 2025-06-18 specification significantly enhances MCP's capabilities while maintaining backward compatibility, enabling more sophisticated AI applications with better security, user interaction, and data handling.