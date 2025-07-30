# Zod Integration with Model Context Protocol (MCP)

## Introduction

The Model Context Protocol (MCP) TypeScript SDK uses Zod extensively for schema validation of tool parameters, resource definitions, and prompt arguments. This integration provides type safety, runtime validation, and clear error handling for MCP servers and clients.

## MCP Architecture with Zod

### Core Components

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create an MCP server instance
const server = new McpServer({
  name: "example-server",
  version: "1.0.0"
});
```

### Tool Registration with Zod Schemas

```typescript
// Register a tool with Zod validation
server.registerTool("calculator", {
  title: "Calculator Tool",
  description: "Perform basic arithmetic operations",
  inputSchema: {
    operation: z.enum(['add', 'subtract', 'multiply', 'divide'])
      .describe("The arithmetic operation to perform"),
    a: z.number()
      .describe("First operand"),
    b: z.number()
      .describe("Second operand")
      .refine((val) => val !== 0, {
        message: "Division by zero is not allowed"
      })
  }
}, async ({ operation, a, b }) => {
  let result: number;
  
  switch (operation) {
    case 'add':
      result = a + b;
      break;
    case 'subtract':
      result = a - b;
      break;
    case 'multiply':
      result = a * b;
      break;
    case 'divide':
      result = a / b;
      break;
  }
  
  return {
    content: [{
      type: "text",
      text: `${a} ${operation} ${b} = ${result}`
    }]
  };
});
```

## Advanced Tool Schemas

### Complex Input Validation

```typescript
const UserManagementSchema = z.object({
  action: z.enum(['create', 'update', 'delete', 'get'])
    .describe("Action to perform on user"),
    
  userId: z.string()
    .uuid("User ID must be a valid UUID")
    .optional()
    .describe("User ID (required for update, delete, get operations)"),
    
  userData: z.object({
    name: z.string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters")
      .describe("User's full name"),
      
    email: z.string()
      .email("Must be a valid email address")
      .toLowerCase()
      .describe("User's email address"),
      
    role: z.enum(['admin', 'user', 'moderator'])
      .default('user')
      .describe("User's role in the system"),
      
    permissions: z.array(z.string())
      .optional()
      .describe("List of specific permissions"),
      
    metadata: z.record(z.string(), z.any())
      .optional()
      .describe("Additional user metadata")
  }).optional().describe("User data for create/update operations"),
  
  filters: z.object({
    role: z.enum(['admin', 'user', 'moderator']).optional(),
    active: z.boolean().optional(),
    createdAfter: z.string().datetime().optional(),
    limit: z.number().int().positive().max(1000).default(50)
  }).optional().describe("Filters for get operations")
}).refine((data) => {
  // Conditional validation based on action
  if (data.action === 'create') {
    return !!data.userData;
  }
  if (['update', 'delete', 'get'].includes(data.action)) {
    return !!data.userId;
  }
  return true;
}, {
  message: "Invalid combination of action and required fields",
  path: []
});

server.registerTool("user-management", {
  title: "User Management Tool",
  description: "Manage users in the system",
  inputSchema: UserManagementSchema
}, async (params) => {
  // Implementation with full type safety
  // TypeScript infers the correct types from the Zod schema
});
```

### File System Operations with Security

```typescript
const FileOperationSchema = z.object({
  operation: z.enum(['read', 'write', 'list', 'delete'])
    .describe("File system operation to perform"),
    
  path: z.string()
    .min(1, "Path cannot be empty")
    .refine((path) => {
      // Prevent path traversal attacks
      return !path.includes('..') && !path.startsWith('/etc/') && !path.startsWith('/root/');
    }, {
      message: "Invalid or unsafe file path"
    })
    .describe("File or directory path"),
    
  content: z.string()
    .optional()
    .describe("Content to write (required for write operations)"),
    
  encoding: z.enum(['utf8', 'base64', 'binary'])
    .default('utf8')
    .describe("File encoding"),
    
  options: z.object({
    recursive: z.boolean().default(false).describe("Recursive operation for directories"),
    force: z.boolean().default(false).describe("Force operation (overwrite, delete)"),
    backup: z.boolean().default(true).describe("Create backup before destructive operations")
  }).optional().describe("Operation options")
}).refine((data) => {
  if (data.operation === 'write' && !data.content) {
    return false;
  }
  return true;
}, {
  message: "Content is required for write operations",
  path: ['content']
});
```

## Resource Registration with Zod

```typescript
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

// Define schema for resource parameters
const DatabaseResourceSchema = z.object({
  table: z.string()
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid table name")
    .describe("Database table name"),
    
  id: z.string()
    .uuid("ID must be a valid UUID")
    .optional()
    .describe("Record ID (optional for listing)")
});

server.registerResource(
  "database",
  new ResourceTemplate("database://{table}/{id?}", {
    list: { table: z.string() }
  }),
  {
    title: "Database Resource",
    description: "Access database records"
  },
  async (uri, params) => {
    // Validate parameters using the schema
    const validatedParams = DatabaseResourceSchema.parse(params);
    
    // Implementation with type-safe parameters
    return {
      contents: [{
        uri: uri.href,
        text: `Database record from ${validatedParams.table}`
      }]
    };
  }
);
```

## Prompt Registration with Zod

```typescript
const PromptSchema = z.object({
  topic: z.string()
    .min(3, "Topic must be at least 3 characters")
    .describe("The topic to generate content about"),
    
  style: z.enum(['formal', 'casual', 'technical', 'creative'])
    .default('formal')
    .describe("Writing style for the content"),
    
  length: z.enum(['short', 'medium', 'long'])
    .default('medium')
    .describe("Desired length of the content"),
    
  audience: z.string()
    .optional()
    .describe("Target audience for the content"),
    
  constraints: z.array(z.string())
    .optional()
    .describe("Specific constraints or requirements")
});

server.registerPrompt(
  "content-generator",
  {
    title: "Content Generator",
    description: "Generate content based on topic and style preferences",
    argsSchema: PromptSchema
  },
  (args) => {
    const { topic, style, length, audience, constraints } = args;
    
    let prompt = `Generate ${length} ${style} content about "${topic}"`;
    
    if (audience) {
      prompt += ` for ${audience}`;
    }
    
    if (constraints && constraints.length > 0) {
      prompt += `\n\nConstraints:\n${constraints.map(c => `- ${c}`).join('\n')}`;
    }
    
    return {
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: prompt
        }
      }]
    };
  }
);
```

## Error Handling and Validation

### Custom Error Handling

```typescript
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

server.registerTool("validated-tool", {
  title: "Tool with Custom Validation",
  description: "Demonstrates custom error handling",
  inputSchema: {
    data: z.string().min(1).describe("Input data")
  }
}, async (params) => {
  try {
    // Additional custom validation
    if (params.data.includes('<script>')) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "Input contains potentially malicious content"
      );
    }
    
    // Process the validated data
    return {
      content: [{
        type: "text",
        text: `Processed: ${params.data}`
      }]
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Validation failed: ${error.errors.map(e => e.message).join(', ')}`
      );
    }
    throw error;
  }
});
```

### Input Sanitization

```typescript
const SanitizedInputSchema = z.object({
  userInput: z.string()
    .transform((val) => val.trim())
    .transform((val) => val.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''))
    .refine((val) => val.length > 0, "Input cannot be empty after sanitization")
    .describe("User-provided input that will be sanitized"),
    
  htmlContent: z.string()
    .transform((val) => {
      // Basic HTML sanitization
      return val
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    })
    .describe("HTML content that will be escaped")
});
```

## Type Inference and Safety

### Extracting Types from Schemas

```typescript
// Define schema
const ApiRequestSchema = z.object({
  endpoint: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
  headers: z.record(z.string()).optional(),
  body: z.any().optional()
});

// Extract TypeScript type
type ApiRequest = z.infer<typeof ApiRequestSchema>;

// Use in tool implementation
server.registerTool("api-call", {
  title: "API Call Tool",
  description: "Make HTTP API calls",
  inputSchema: ApiRequestSchema
}, async (params: ApiRequest) => {
  // params is fully typed based on the Zod schema
  const response = await fetch(params.endpoint, {
    method: params.method,
    headers: params.headers,
    body: params.body ? JSON.stringify(params.body) : undefined
  });
  
  return {
    content: [{
      type: "text",
      text: `API call to ${params.endpoint} completed with status ${response.status}`
    }]
  };
});
```

## Best Practices for MCP + Zod

### 1. Always Include Descriptions

```typescript
// ❌ Bad: No descriptions
const BadSchema = z.object({
  name: z.string(),
  age: z.number()
});

// ✅ Good: Descriptive schemas
const GoodSchema = z.object({
  name: z.string()
    .describe("User's full name"),
  age: z.number()
    .int()
    .positive()
    .describe("User's age in years")
});
```

### 2. Use Refinements for Complex Validation

```typescript
const ComplexValidationSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  duration: z.number().positive().optional()
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end > start;
}, {
  message: "End date must be after start date",
  path: ['endDate']
}).refine((data) => {
  if (data.duration) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const actualDuration = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return Math.abs(actualDuration - data.duration) < 1;
  }
  return true;
}, {
  message: "Duration does not match the date range",
  path: ['duration']
});
```

### 3. Security-First Validation

```typescript
const SecureFileSchema = z.object({
  filename: z.string()
    .regex(/^[a-zA-Z0-9._-]+$/, "Filename contains invalid characters")
    .refine((name) => !name.startsWith('.'), "Hidden files not allowed")
    .refine((name) => name.length <= 255, "Filename too long"),
    
  path: z.string()
    .refine((path) => {
      const resolved = require('path').resolve(path);
      const allowed = require('path').resolve('./allowed-directory');
      return resolved.startsWith(allowed);
    }, "Path is outside allowed directory")
});
```

### 4. Environment-Aware Schemas

```typescript
const ConfigSchema = z.object({
  apiKey: z.string()
    .min(1, "API key is required")
    .refine((key) => {
      if (process.env.NODE_ENV === 'production') {
        return key.length >= 32; // Enforce strong keys in production
      }
      return true;
    }, "API key too short for production environment"),
    
  debug: z.boolean()
    .default(process.env.NODE_ENV !== 'production')
    .describe("Enable debug mode")
});
```

### 5. Composable Schema Design

```typescript
// Base schemas
const BaseUserSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1)
});

const TimestampSchema = z.object({
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().optional()
});

// Composed schemas
const CreateUserSchema = BaseUserSchema.omit({ userId: true });
const UpdateUserSchema = BaseUserSchema.partial().extend({
  userId: z.string().uuid() // userId required for updates
});
const UserWithTimestamps = BaseUserSchema.extend(TimestampSchema.shape);
```

## Debugging and Development

### Schema Testing

```typescript
// Test schemas during development
const testSchema = (schema: z.ZodSchema, testCases: any[]) => {
  testCases.forEach((testCase, index) => {
    try {
      const result = schema.parse(testCase);
      console.log(`Test ${index + 1} passed:`, result);
    } catch (error) {
      console.error(`Test ${index + 1} failed:`, error.errors);
    }
  });
};

// Usage
testSchema(ApiRequestSchema, [
  { endpoint: "https://api.example.com", method: "GET" },
  { endpoint: "invalid-url", method: "GET" }, // Should fail
  { endpoint: "https://api.example.com", method: "INVALID" } // Should fail
]);
```

### Development vs Production Schemas

```typescript
const createUserSchema = (isDevelopment: boolean = false) => {
  const baseSchema = z.object({
    name: z.string().min(1),
    email: z.string().email()
  });
  
  if (isDevelopment) {
    // More lenient validation in development
    return baseSchema.extend({
      password: z.string().min(1) // Minimal password requirement
    });
  }
  
  // Strict validation in production
  return baseSchema.extend({
    password: z.string()
      .min(12, "Password must be at least 12 characters")
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
             "Password must contain uppercase, lowercase, number, and special character")
  });
};
```

This comprehensive guide shows how Zod integrates seamlessly with MCP to provide robust validation, type safety, and clear error handling for MCP servers and tools.