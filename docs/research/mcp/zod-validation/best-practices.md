# Zod Validation Best Practices for MCP Tools

This document outlines comprehensive best practices for using Zod validation in Model Context Protocol (MCP) implementations, focusing on security, performance, maintainability, and user experience.

## Core Principles

### 1. Security-First Validation

Always validate and sanitize ALL inputs from clients. Never trust client-provided data.

```typescript
import { z } from "zod";

// ❌ Dangerous: No validation
const unsafeSchema = z.any();

// ✅ Secure: Comprehensive validation
const secureSchema = z.object({
  userInput: z.string()
    .max(1000, "Input too long")
    .refine((val) => !val.includes('<script>'), "Script tags not allowed")
    .transform((val) => val.trim())
    .describe("User-provided input with XSS protection"),
    
  filePath: z.string()
    .refine((path) => !path.includes('..'), "Path traversal not allowed")
    .refine((path) => !path.startsWith('/etc/'), "System directories forbidden")
    .refine((path) => path.length <= 255, "Path too long")
    .describe("File path with traversal protection")
});
```

### 2. Always Include Descriptions

Descriptions are crucial for MCP tools as they help AI models understand parameter purposes and constraints.

```typescript
// ❌ Poor: No descriptions
const badSchema = z.object({
  name: z.string(),
  age: z.number(),
  active: z.boolean()
});

// ✅ Good: Comprehensive descriptions  
const goodSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .describe("User's full name for identification purposes"),
    
  age: z.number()
    .int("Age must be a whole number")
    .positive("Age must be positive")
    .max(150, "Age cannot exceed 150 years")
    .describe("User's age in years"),
    
  active: z.boolean()
    .default(true)
    .describe("Whether the user account is currently active")
});
```

### 3. Use Refinements for Complex Logic

Leverage refinements for business logic validation that can't be expressed with basic validators.

```typescript
const EventSchema = z.object({
  title: z.string().min(1).max(200).describe("Event title"),
  startDate: z.string().datetime().describe("Event start date (ISO format)"),
  endDate: z.string().datetime().describe("Event end date (ISO format)"),
  maxAttendees: z.number().int().positive().describe("Maximum number of attendees"),
  currentAttendees: z.number().int().nonnegative().default(0).describe("Current attendee count")
})
.refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end > start;
}, {
  message: "End date must be after start date",
  path: ['endDate']
})
.refine((data) => {
  return data.currentAttendees <= data.maxAttendees;
}, {
  message: "Current attendees cannot exceed maximum capacity",
  path: ['currentAttendees']
})
.refine((data) => {
  const start = new Date(data.startDate);
  return start > new Date();
}, {
  message: "Event cannot be scheduled in the past",
  path: ['startDate']
});
```

## Schema Design Patterns

### 4. Composable Schema Architecture

Build reusable schema components to avoid duplication and ensure consistency.

```typescript
// Base components
const BaseEntitySchema = z.object({
  id: z.string().uuid().describe("Unique entity identifier"),
  createdAt: z.string().datetime().describe("Creation timestamp"),
  updatedAt: z.string().datetime().optional().describe("Last update timestamp")
});

const PaginationSchema = z.object({
  page: z.number().int().positive().default(1).describe("Page number (1-based)"),
  limit: z.number().int().positive().max(1000).default(50).describe("Items per page"),
  sortBy: z.string().optional().describe("Field to sort by"),
  sortOrder: z.enum(['asc', 'desc']).default('asc').describe("Sort direction")
});

const FilterSchema = z.object({
  search: z.string().optional().describe("Search term"),
  status: z.enum(['active', 'inactive', 'pending']).optional().describe("Status filter"),
  dateRange: z.object({
    start: z.string().datetime().describe("Start date"),
    end: z.string().datetime().describe("End date")
  }).optional().describe("Date range filter")
});

// Composed schemas
const UserSchema = BaseEntitySchema.extend({
  name: z.string().min(1).max(100).describe("User name"),
  email: z.string().email().describe("User email"),
  role: z.enum(['admin', 'user', 'moderator']).describe("User role")
});

const UserListSchema = z.object({
  filters: FilterSchema.optional().describe("Search and filter options"),
  pagination: PaginationSchema.optional().describe("Pagination settings")
});
```

### 5. Environment-Aware Validation

Adjust validation rules based on environment (development vs production).

```typescript
const createConfigSchema = (isDevelopment: boolean = false) => {
  const baseSchema = z.object({
    apiUrl: z.string().url().describe("API base URL"),
    retryAttempts: z.number().int().positive().max(10).default(3).describe("Max retry attempts"),
    timeout: z.number().int().positive().max(300000).default(30000).describe("Request timeout (ms)")
  });

  if (isDevelopment) {
    return baseSchema.extend({
      debugMode: z.boolean().default(true).describe("Enable debug logging"),
      mockData: z.boolean().default(false).describe("Use mock data instead of real API"),
      apiKey: z.string().min(1).describe("API key (development - minimal validation)")
    });
  }

  return baseSchema.extend({
    debugMode: z.boolean().default(false).describe("Enable debug logging"),
    apiKey: z.string()
      .min(32, "Production API key must be at least 32 characters")
      .regex(/^[a-zA-Z0-9_-]+$/, "Invalid API key format")
      .describe("API key (production - strict validation)"),
    
    rateLimits: z.object({
      requestsPerMinute: z.number().int().positive().max(10000).default(1000),
      burstLimit: z.number().int().positive().max(100).default(50)
    }).describe("Rate limiting configuration")
  });
};

// Usage
const isDev = process.env.NODE_ENV === 'development';
const ConfigSchema = createConfigSchema(isDev);
```

## Error Handling and User Experience

### 6. Provide Meaningful Error Messages

Custom error messages should be actionable and user-friendly.

```typescript
const UserRegistrationSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters long")
    .max(30, "Username cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, hyphens, and underscores")
    .refine(async (username) => {
      // Async validation for uniqueness
      const exists = await checkUsernameExists(username);
      return !exists;
    }, "This username is already taken. Please choose a different one")
    .describe("Unique username for the account"),

  email: z.string()
    .email("Please enter a valid email address (e.g., user@example.com)")
    .refine(async (email) => {
      const exists = await checkEmailExists(email);
      return !exists;
    }, "An account with this email already exists. Try logging in instead?")
    .describe("Email address for account verification"),

  password: z.string()
    .min(12, "Password must be at least 12 characters for security")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
           "Password must include: lowercase letter, uppercase letter, number, and special character (@$!%*?&)")
    .describe("Strong password for account security"),

  confirmPassword: z.string()
    .describe("Confirm your password by typing it again")
})
.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match. Please make sure both password fields are identical",
  path: ['confirmPassword']
});
```

### 7. Handle Validation Errors Gracefully

```typescript
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

const validateAndExecute = async (schema: z.ZodSchema, data: unknown, operation: Function) => {
  try {
    // Validate input
    const validatedData = await schema.parseAsync(data);
    
    // Execute operation with validated data
    return await operation(validatedData);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Transform Zod errors into user-friendly MCP errors
      const errorMessages = error.errors.map(err => {
        const path = err.path.length > 0 ? ` (${err.path.join('.')})` : '';
        return `${err.message}${path}`;
      }).join('; ');
      
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Validation failed: ${errorMessages}`
      );
    }
    
    // Re-throw other errors
    throw error;
  }
};

// Usage in MCP tool
server.registerTool("create-user", {
  title: "Create User",
  description: "Create a new user account",
  inputSchema: UserRegistrationSchema
}, async (params) => {
  return validateAndExecute(
    UserRegistrationSchema,
    params,
    async (validatedData) => {
      // Safe to use validatedData here
      const user = await createUser(validatedData);
      return {
        content: [{
          type: "text",
          text: `User ${user.username} created successfully`
        }]
      };
    }
  );
});
```

## Performance Optimization

### 8. Optimize Schema Performance

```typescript
// ❌ Inefficient: Multiple async validations
const inefficientSchema = z.object({
  email: z.string().email()
    .refine(async (email) => await checkEmailExists(email), "Email exists")
    .refine(async (email) => await checkEmailDomain(email), "Invalid domain")
    .refine(async (email) => await checkEmailReputation(email), "Suspicious email"),
});

// ✅ Efficient: Batch async validations
const efficientSchema = z.object({
  email: z.string().email()
    .refine(async (email) => {
      // Batch all async checks
      const [exists, validDomain, goodReputation] = await Promise.all([
        checkEmailExists(email),
        checkEmailDomain(email),
        checkEmailReputation(email)
      ]);
      
      if (exists) throw new Error("Email already exists");
      if (!validDomain) throw new Error("Invalid email domain");
      if (!goodReputation) throw new Error("Email from suspicious domain");
      
      return true;
    }, "Email validation failed")
});

// Cache compiled schemas for better performance
const schemaCache = new Map<string, z.ZodSchema>();

const getCachedSchema = (key: string, schemaFactory: () => z.ZodSchema) => {
  if (!schemaCache.has(key)) {
    schemaCache.set(key, schemaFactory());
  }
  return schemaCache.get(key)!;
};
```

### 9. Use Transformations Wisely

Transformations should be lightweight and side-effect free.

```typescript
const DataCleaningSchema = z.object({
  email: z.string()
    .trim() // Remove whitespace
    .toLowerCase() // Normalize case
    .email("Invalid email format")
    .describe("Email address (will be normalized to lowercase)"),
    
  phone: z.string()
    .transform((val) => val.replace(/\D/g, '')) // Remove non-digits
    .refine((val) => val.length >= 10, "Phone number must have at least 10 digits")
    .transform((val) => {
      // Format as (XXX) XXX-XXXX for US numbers
      if (val.length === 10) {
        return `(${val.slice(0,3)}) ${val.slice(3,6)}-${val.slice(6)}`;
      }
      return val;
    })
    .describe("Phone number (will be formatted automatically)"),
    
  tags: z.string()
    .transform((val) => val.split(',').map(tag => tag.trim()).filter(Boolean))
    .pipe(z.array(z.string().min(1)))
    .describe("Comma-separated tags (will be converted to array)")
});
```

## Security Best Practices

### 10. Prevent Common Vulnerabilities

```typescript
// SQL Injection Prevention
const DatabaseQuerySchema = z.object({
  tableName: z.string()
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid table name")
    .refine((name) => !SYSTEM_TABLES.includes(name), "Access to system tables denied")
    .describe("Database table name"),
    
  columns: z.array(z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/))
    .max(50, "Too many columns specified")
    .describe("Column names to select"),
    
  whereClause: z.object({
    column: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
    operator: z.enum(['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN']),
    value: z.union([z.string(), z.number(), z.boolean()])
  }).describe("WHERE clause (parameterized)")
});

// XSS Prevention
const ContentSchema = z.object({
  title: z.string()
    .max(200, "Title too long")
    .transform((val) => escapeHtml(val))
    .describe("Content title (HTML will be escaped)"),
    
  body: z.string()
    .max(50000, "Content too long")
    .refine((val) => !containsMaliciousScript(val), "Content contains prohibited elements")
    .transform((val) => sanitizeHtml(val, {
      allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
      allowedAttributes: {}
    }))
    .describe("Content body (HTML will be sanitized)")
});

// Path Traversal Prevention
const FilePathSchema = z.string()
  .refine((path) => !path.includes('..'), "Path traversal not allowed")
  .refine((path) => !path.includes('~'), "Home directory access not allowed")
  .refine((path) => path.startsWith('/app/data/'), "Path must be within allowed directory")
  .transform((path) => require('path').resolve(path))
  .refine((resolved) => resolved.startsWith('/app/data/'), "Resolved path outside allowed directory")
  .describe("File path (restricted to data directory)");
```

### 11. Rate Limiting and Resource Protection

```typescript
const RateLimitedSchema = z.object({
  operation: z.enum(['read', 'write', 'delete']).describe("Operation type"),
  resourceId: z.string().uuid().describe("Resource identifier"),
  batchSize: z.number()
    .int()
    .positive()
    .max(100, "Batch size too large - maximum 100 items")
    .default(1)
    .describe("Number of items to process")
}).refine((data) => {
  // Different limits for different operations
  const limits = { read: 1000, write: 100, delete: 10 };
  return data.batchSize <= limits[data.operation];
}, {
  message: "Batch size exceeds limit for this operation type",
  path: ['batchSize']
});
```

## Testing and Development

### 12. Schema Testing Strategies

```typescript
import { describe, it, expect } from 'jest';

describe('UserSchema', () => {
  const validUser = {
    name: "John Doe",
    email: "john@example.com",
    age: 30
  };

  it('should validate correct user data', () => {
    const result = UserSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = UserSchema.safeParse({
      ...validUser,
      email: "not-an-email"
    });
    expect(result.success).toBe(false);
    expect(result.error?.errors[0].message).toContain('email');
  });

  it('should reject negative age', () => {
    const result = UserSchema.safeParse({
      ...validUser,
      age: -5
    });
    expect(result.success).toBe(false);
  });

  // Test transformations
  it('should normalize email case', () => {
    const result = UserSchema.parse({
      ...validUser,
      email: "JOHN@EXAMPLE.COM"
    });
    expect(result.email).toBe("john@example.com");
  });
});

// Property-based testing with fast-check
import fc from 'fast-check';

const testUserSchema = () => {
  fc.assert(
    fc.property(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 100 }),
        email: fc.emailAddress(),
        age: fc.integer({ min: 0, max: 150 })
      }),
      (user) => {
        const result = UserSchema.safeParse(user);
        return result.success === true;
      }
    )
  );
};
```

### 13. Development Helpers

```typescript
// Schema introspection helper
const analyzeSchema = (schema: z.ZodSchema, data: unknown) => {
  const result = schema.safeParse(data);
  
  if (result.success) {
    console.log('✅ Validation passed');
    console.log('Parsed data:', result.data);
  } else {
    console.log('❌ Validation failed');
    result.error.errors.forEach((error, index) => {
      console.log(`Error ${index + 1}:`);
      console.log(`  Path: ${error.path.join('.')}`);
      console.log(`  Message: ${error.message}`);
      console.log(`  Code: ${error.code}`);
    });
  }
};

// Schema documentation generator
const generateSchemaDoc = (schema: z.ZodSchema, name: string) => {
  // This would generate documentation from schema structure
  // Implementation depends on your documentation needs
  console.log(`Schema: ${name}`);
  // Analyze schema structure and output documentation
};

// Performance profiler
const profileValidation = async (schema: z.ZodSchema, testData: unknown[], iterations: number = 1000) => {
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    for (const data of testData) {
      schema.safeParse(data);
    }
  }
  
  const end = performance.now();
  const avgTime = (end - start) / (iterations * testData.length);
  
  console.log(`Average validation time: ${avgTime.toFixed(3)}ms`);
  return avgTime;
};
```

## Documentation and Maintenance

### 14. Schema Documentation Standards

```typescript
/**
 * User Management Tool Schema
 * 
 * Validates input for user CRUD operations with comprehensive security checks.
 * 
 * Security features:
 * - Email uniqueness validation
 * - Strong password requirements  
 * - Role-based access control
 * - Input sanitization
 * 
 * Performance notes:
 * - Async validations are batched for efficiency
 * - Schema is cached after first compilation
 * 
 * @example
 * ```typescript
 * const input = {
 *   action: 'create',
 *   userData: {
 *     name: 'John Doe',
 *     email: 'john@example.com',
 *     password: 'SecurePass123!',
 *     role: 'user'
 *   }
 * };
 * 
 * const result = UserManagementSchema.parse(input);
 * ```
 */
const UserManagementSchema = z.object({
  action: z.enum(['create', 'read', 'update', 'delete'])
    .describe("CRUD operation to perform on user data"),
    
  // ... rest of schema
});
```

### 15. Version Management

```typescript
// Schema versioning for backward compatibility
const UserSchemaV1 = z.object({
  name: z.string(),
  email: z.string().email()
});

const UserSchemaV2 = UserSchemaV1.extend({
  age: z.number().optional(), // New optional field
  role: z.enum(['user', 'admin']).default('user') // New field with default
});

const UserSchemaV3 = UserSchemaV2.extend({
  permissions: z.array(z.string()).optional() // Latest version
});

// Version-aware validation
const validateUserByVersion = (data: unknown, version: string = 'latest') => {
  const schemas = {
    'v1': UserSchemaV1,
    'v2': UserSchemaV2,
    'v3': UserSchemaV3,
    'latest': UserSchemaV3
  };
  
  const schema = schemas[version as keyof typeof schemas];
  if (!schema) {
    throw new Error(`Unsupported schema version: ${version}`);
  }
  
  return schema.parse(data);
};
```

## Summary Checklist

When creating Zod schemas for MCP tools, ensure you:

- ✅ **Security**: Validate all inputs, prevent injection attacks, sanitize data
- ✅ **Descriptions**: Include comprehensive descriptions for all fields
- ✅ **Error Messages**: Provide clear, actionable error messages
- ✅ **Performance**: Optimize async validations and cache schemas
- ✅ **Composability**: Build reusable schema components
- ✅ **Environment Awareness**: Adjust validation based on environment
- ✅ **Testing**: Write comprehensive tests for schema validation
- ✅ **Documentation**: Document schema purpose, security features, and examples
- ✅ **Versioning**: Plan for schema evolution and backward compatibility
- ✅ **Type Safety**: Leverage TypeScript integration for compile-time checks

Following these best practices will result in robust, secure, and maintainable MCP tools with excellent validation capabilities.