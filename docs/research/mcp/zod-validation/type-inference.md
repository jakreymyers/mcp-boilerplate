# Zod Type Inference for MCP Tools

Type inference is one of Zod's most powerful features, allowing you to derive TypeScript types automatically from your validation schemas. This eliminates code duplication and ensures your types stay in sync with your validation logic.

## Basic Type Inference

### Using `z.infer<>`

```typescript
import { z } from "zod";

// Define a schema
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().positive(),
  isActive: z.boolean().default(true)
});

// Extract the TypeScript type
type User = z.infer<typeof UserSchema>;
// Equivalent to:
// type User = {
//   id: string;
//   name: string;
//   email: string;
//   age: number;
//   isActive: boolean;
// }

// Use the inferred type
const createUser = (userData: User): User => {
  // TypeScript knows the exact shape of userData
  return {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    age: userData.age,
    isActive: userData.isActive
  };
};
```

### Input vs Output Types

When schemas include transformations, input and output types can differ:

```typescript
const TransformSchema = z.object({
  email: z.string().email().toLowerCase(), // Transform to lowercase
  age: z.string().transform((val) => parseInt(val, 10)), // Transform string to number
  tags: z.string().transform((val) => val.split(',')), // Transform string to array
  timestamp: z.string().transform((val) => new Date(val)) // Transform string to Date
});

// Input type (before transformations)
type SchemaInput = z.input<typeof TransformSchema>;
// type SchemaInput = {
//   email: string;
//   age: string;
//   tags: string;
//   timestamp: string;
// }

// Output type (after transformations)
type SchemaOutput = z.output<typeof TransformSchema>;
// Equivalent to z.infer<typeof TransformSchema>
// type SchemaOutput = {
//   email: string;
//   age: number;
//   tags: string[];
//   timestamp: Date;
// }
```

## MCP Tool Type Inference

### Tool Parameter Types

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const DatabaseQuerySchema = z.object({
  table: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  columns: z.array(z.string()).optional(),
  where: z.record(z.string(), z.any()).optional(),
  limit: z.number().int().positive().max(1000).default(100),
  offset: z.number().int().nonnegative().default(0)
});

// Extract type for use in implementation
type DatabaseQueryParams = z.infer<typeof DatabaseQuerySchema>;

const server = new McpServer({ name: "db-server", version: "1.0.0" });

server.registerTool("query-database", {
  title: "Database Query Tool",
  description: "Execute database queries",
  inputSchema: DatabaseQuerySchema
}, async (params: DatabaseQueryParams) => {
  // TypeScript provides full intellisense and type checking
  console.log(`Querying table: ${params.table}`);
  console.log(`Columns: ${params.columns?.join(', ') || 'all'}`);
  console.log(`Limit: ${params.limit}, Offset: ${params.offset}`);
  
  // Implementation is type-safe
  const query = buildQuery({
    table: params.table,
    columns: params.columns,
    where: params.where,
    limit: params.limit,
    offset: params.offset
  });
  
  return {
    content: [{ type: "text", text: await executeQuery(query) }]
  };
});
```

### Complex Nested Type Inference

```typescript
const ApiConfigSchema = z.object({
  endpoint: z.object({
    baseUrl: z.string().url(),
    version: z.enum(['v1', 'v2', 'v3']).default('v2'),
    timeout: z.number().int().positive().default(30000)
  }),
  
  authentication: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('apiKey'),
      key: z.string().min(16),
      header: z.string().default('X-API-Key')
    }),
    z.object({
      type: z.literal('bearer'),
      token: z.string().min(20)
    }),
    z.object({
      type: z.literal('oauth'),
      clientId: z.string(),
      clientSecret: z.string(),
      scope: z.array(z.string()).optional()
    })
  ]),
  
  retryPolicy: z.object({
    maxAttempts: z.number().int().positive().max(10).default(3),
    backoff: z.enum(['linear', 'exponential']).default('exponential'),
    delayMs: z.number().int().positive().default(1000)
  }).optional(),
  
  features: z.object({
    caching: z.boolean().default(true),
    compression: z.boolean().default(false),
    logging: z.enum(['none', 'basic', 'detailed']).default('basic')
  }).optional()
});

// Complex nested type is automatically inferred
type ApiConfig = z.infer<typeof ApiConfigSchema>;

// TypeScript knows the discriminated union structure
const handleAuth = (config: ApiConfig) => {
  switch (config.authentication.type) {
    case 'apiKey':
      // TypeScript knows this has 'key' and 'header' properties
      return { [config.authentication.header]: config.authentication.key };
    case 'bearer':
      // TypeScript knows this has 'token' property
      return { Authorization: `Bearer ${config.authentication.token}` };
    case 'oauth':
      // TypeScript knows this has 'clientId', 'clientSecret', and optional 'scope'
      return handleOAuth(config.authentication);
  }
};
```

## Advanced Type Patterns

### Generic Schema Functions

```typescript
// Generic function that creates schemas with type inference
const createResourceSchema = <T extends z.ZodRawShape>(resourceFields: T) => {
  return z.object({
    id: z.string().uuid(),
    type: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    ...resourceFields
  });
};

// Create specific resource schemas
const UserResourceSchema = createResourceSchema({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'moderator'])
});

const DocumentResourceSchema = createResourceSchema({
  title: z.string().min(1),
  content: z.string(),
  author: z.string().uuid(),
  tags: z.array(z.string())
});

// Types are correctly inferred
type UserResource = z.infer<typeof UserResourceSchema>;
type DocumentResource = z.infer<typeof DocumentResourceSchema>;

// TypeScript knows the exact shape including base and specific fields
const processUser = (user: UserResource) => {
  // Base fields are available
  console.log(`User ID: ${user.id}`);
  console.log(`Created: ${user.createdAt}`);
  
  // User-specific fields are available
  console.log(`Name: ${user.name}`);
  console.log(`Email: ${user.email}`);
  console.log(`Role: ${user.role}`);
};
```

### Conditional Type Inference

```typescript
const ConditionalSchema = z.object({
  mode: z.enum(['read', 'write', 'admin']),
  data: z.any()
}).transform((input) => {
  if (input.mode === 'read') {
    return {
      mode: input.mode,
      readData: z.object({
        query: z.string(),
        filters: z.array(z.string()).optional()
      }).parse(input.data)
    };
  } else if (input.mode === 'write') {
    return {
      mode: input.mode,
      writeData: z.object({
        content: z.string(),
        metadata: z.record(z.string(), z.any()).optional()
      }).parse(input.data)
    };
  } else {
    return {
      mode: input.mode,
      adminData: z.object({
        action: z.enum(['create', 'delete', 'modify']),
        target: z.string(),
        permissions: z.array(z.string())
      }).parse(input.data)
    };
  }
});

type ConditionalResult = z.infer<typeof ConditionalSchema>;
// TypeScript infers a union type based on the transformation
// ConditionalResult = 
//   | { mode: 'read'; readData: { query: string; filters?: string[] } }
//   | { mode: 'write'; writeData: { content: string; metadata?: Record<string, any> } }
//   | { mode: 'admin'; adminData: { action: 'create' | 'delete' | 'modify'; target: string; permissions: string[] } }
```

### Array and Record Type Inference

```typescript
const CollectionSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    value: z.number(),
    metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
  })),
  
  lookup: z.record(z.string(), z.object({
    index: z.number(),
    cached: z.boolean().default(false)
  })),
  
  matrix: z.array(z.array(z.number()))
});

type Collection = z.infer<typeof CollectionSchema>;
// TypeScript correctly infers:
// type Collection = {
//   items: Array<{
//     id: string;
//     value: number;
//     metadata: Record<string, string | number | boolean>;
//   }>;
//   lookup: Record<string, { index: number; cached: boolean; }>;
//   matrix: number[][];
// }

const processCollection = (collection: Collection) => {
  // TypeScript provides intellisense for nested array/record types
  collection.items.forEach(item => {
    console.log(`Item ${item.id}: ${item.value}`);
    Object.entries(item.metadata).forEach(([key, value]) => {
      // TypeScript knows value is string | number | boolean
      console.log(`  ${key}: ${value} (${typeof value})`);
    });
  });
  
  // Record access is type-safe
  Object.entries(collection.lookup).forEach(([key, lookup]) => {
    console.log(`Lookup ${key}: index ${lookup.index}, cached: ${lookup.cached}`);
  });
};
```

## Utility Types and Helpers

### Extracting Nested Types

```typescript
const ComplexSchema = z.object({
  user: z.object({
    profile: z.object({
      personal: z.object({
        name: z.string(),
        age: z.number()
      }),
      professional: z.object({
        title: z.string(),
        company: z.string()
      })
    }),
    preferences: z.object({
      theme: z.enum(['light', 'dark']),
      notifications: z.boolean()
    })
  }),
  settings: z.array(z.object({
    key: z.string(),
    value: z.any()
  }))
});

// Extract nested types
type ComplexType = z.infer<typeof ComplexSchema>;
type UserType = ComplexType['user'];
type ProfileType = UserType['profile'];
type PersonalType = ProfileType['personal'];
type SettingType = ComplexType['settings'][number]; // Array element type

// Alternative approach using utility types
type ExtractUser<T> = T extends { user: infer U } ? U : never;
type ExtractedUser = ExtractUser<ComplexType>;
```

### Creating Type-Safe Builders

```typescript
// Type-safe builder pattern using Zod inference
class QueryBuilder<T extends z.ZodRawShape> {
  private schema: z.ZodObject<T>;
  
  constructor(schema: z.ZodObject<T>) {
    this.schema = schema;
  }
  
  build(data: z.input<z.ZodObject<T>>): z.infer<z.ZodObject<T>> {
    return this.schema.parse(data);
  }
  
  partial(): QueryBuilder<{ [K in keyof T]: z.ZodOptional<T[K]> }> {
    return new QueryBuilder(this.schema.partial());
  }
  
  extend<U extends z.ZodRawShape>(
    extension: U
  ): QueryBuilder<T & U> {
    return new QueryBuilder(this.schema.extend(extension));
  }
}

// Usage with full type inference
const userBuilder = new QueryBuilder(z.object({
  name: z.string(),
  age: z.number()
}));

const extendedBuilder = userBuilder.extend({
  email: z.string().email()
});

// TypeScript infers the correct type
const user = extendedBuilder.build({
  name: "John",
  age: 30,
  email: "john@example.com"
});
```

### Type Guards and Predicates

```typescript
// Create type guards from Zod schemas
const createTypeGuard = <T extends z.ZodTypeAny>(schema: T) => {
  return (value: unknown): value is z.infer<T> => {
    return schema.safeParse(value).success;
  };
};

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email()
});

// Type guard with correct type inference
const isUser = createTypeGuard(UserSchema);

const processUnknownData = (data: unknown) => {
  if (isUser(data)) {
    // TypeScript knows data is User type here
    console.log(`Processing user: ${data.name} (${data.email})`);
    return data.id;
  } else {
    throw new Error('Invalid user data');
  }
};
```

## MCP-Specific Type Patterns

### Tool Response Types

```typescript
const ToolResponseSchema = z.object({
  content: z.array(z.discriminatedUnion('type', [
    z.object({
      type: z.literal('text'),
      text: z.string()
    }),
    z.object({
      type: z.literal('image'),
      data: z.string(),
      mimeType: z.string()
    }),
    z.object({
      type: z.literal('resource'),
      resource: z.object({
        uri: z.string(),
        text: z.string().optional(),
        mimeType: z.string().optional()
      })
    })
  ])),
  isError: z.boolean().optional()
});

type ToolResponse = z.infer<typeof ToolResponseSchema>;

// Type-safe response builders
const createTextResponse = (text: string): ToolResponse => ({
  content: [{ type: 'text', text }]
});

const createImageResponse = (data: string, mimeType: string): ToolResponse => ({
  content: [{ type: 'image', data, mimeType }]
});

const createResourceResponse = (uri: string, text?: string, mimeType?: string): ToolResponse => ({
  content: [{ type: 'resource', resource: { uri, text, mimeType } }]
});
```

### Server Configuration Types

```typescript
const McpServerConfigSchema = z.object({
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  
  capabilities: z.object({
    logging: z.object({}).optional(),
    prompts: z.object({
      listChanged: z.boolean().optional()
    }).optional(),
    resources: z.object({
      subscribe: z.boolean().optional(),
      listChanged: z.boolean().optional()
    }).optional(),
    tools: z.object({
      listChanged: z.boolean().optional()
    }).optional()
  }).optional(),
  
  protocolVersion: z.string().default("2024-11-05"),
  
  instructions: z.string().optional()
});

type McpServerConfig = z.infer<typeof McpServerConfigSchema>;

// Type-safe server factory
const createMcpServer = (config: McpServerConfig) => {
  // Implementation uses correctly typed config
  return new McpServer(config);
};
```

## Best Practices for Type Inference

### 1. Leverage Union Types

```typescript
const StatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);
const ActionSchema = z.union([
  z.literal('start'),
  z.literal('pause'),
  z.literal('stop'),
  z.literal('reset')
]);

type Status = z.infer<typeof StatusSchema>; // 'pending' | 'processing' | 'completed' | 'failed'
type Action = z.infer<typeof ActionSchema>; // 'start' | 'pause' | 'stop' | 'reset'

// Type-safe state machine
const handleStateTransition = (currentStatus: Status, action: Action): Status => {
  switch (currentStatus) {
    case 'pending':
      return action === 'start' ? 'processing' : 'pending';
    case 'processing':
      return action === 'pause' ? 'pending' : action === 'stop' ? 'completed' : 'processing';
    // TypeScript ensures all cases are handled
    default:
      return currentStatus;
  }
};
```

### 2. Use Brand Types for Domain Modeling

```typescript
// Create branded types for domain concepts
const UserIdSchema = z.string().uuid().brand('UserId');
const EmailSchema = z.string().email().brand('Email');
const TimestampSchema = z.string().datetime().brand('Timestamp');

type UserId = z.infer<typeof UserIdSchema>;
type Email = z.infer<typeof EmailSchema>;
type Timestamp = z.infer<typeof TimestampSchema>;

// Branded types prevent mixing up similar primitives
const sendEmail = (to: Email, from: Email, content: string) => {
  // Implementation
};

// This would cause a TypeScript error:
// sendEmail("not-an-email", "also-not-an-email", "Hello");

// This works correctly:
const validEmail = EmailSchema.parse("user@example.com");
sendEmail(validEmail, validEmail, "Hello");
```

### 3. Combine with Generic Constraints

```typescript
// Generic MCP tool with type constraints
interface McpTool<TInput extends z.ZodRawShape, TOutput> {
  name: string;
  description: string;
  inputSchema: z.ZodObject<TInput>;
  execute(params: z.infer<z.ZodObject<TInput>>): Promise<TOutput>;
}

class TypeSafeMcpTool<TInput extends z.ZodRawShape, TOutput> implements McpTool<TInput, TOutput> {
  constructor(
    public name: string,
    public description: string,
    public inputSchema: z.ZodObject<TInput>,
    public execute: (params: z.infer<z.ZodObject<TInput>>) => Promise<TOutput>
  ) {}
  
  async call(rawParams: unknown): Promise<TOutput> {
    const validatedParams = this.inputSchema.parse(rawParams);
    return this.execute(validatedParams);
  }
}

// Usage with full type safety
const calculatorTool = new TypeSafeMcpTool(
  "calculator",
  "Perform calculations",
  z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number()
  }),
  async (params) => {
    // params is correctly typed as { operation: 'add' | 'subtract' | 'multiply' | 'divide', a: number, b: number }
    switch (params.operation) {
      case 'add': return params.a + params.b;
      case 'subtract': return params.a - params.b;
      case 'multiply': return params.a * params.b;
      case 'divide': return params.a / params.b;
    }
  }
);
```

By leveraging Zod's type inference capabilities, you can build type-safe MCP tools that provide excellent developer experience with full IntelliSense support and compile-time error checking. The key is to design your schemas thoughtfully and use the inferred types consistently throughout your application.