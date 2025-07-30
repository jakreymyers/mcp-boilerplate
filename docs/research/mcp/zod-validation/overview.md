# Zod Validation Library - Overview

## Introduction

Zod is a TypeScript-first schema validation library designed to provide a developer-friendly experience with zero dependencies. It eliminates duplicative type declarations by automatically inferring static TypeScript types from schema definitions.

## Key Features

### 1. Type Inference
Zod automatically generates TypeScript types from your schemas, eliminating redundant type definitions.

```typescript
import { z } from "zod";

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email()
});

// Extract the inferred type
type User = z.infer<typeof UserSchema>;
// Equivalent to: { name: string; age: number; email: string }
```

### 2. Runtime Validation
Unlike static type checking, Zod performs actual runtime validation, catching errors that TypeScript might miss.

```typescript
// Validation methods
const userData = UserSchema.parse(input); // Throws on validation failure
const result = UserSchema.safeParse(input); // Returns result object

if (result.success) {
  console.log(result.data); // Typed data
} else {
  console.log(result.error); // Validation errors
}
```

### 3. Developer-Friendly API
Zod provides an intuitive, chainable interface for schema definition:

```typescript
const AdvancedSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username cannot exceed 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
    
  email: z.string()
    .email("Invalid email format")
    .toLowerCase(),
    
  age: z.number()
    .int("Age must be an integer")
    .positive("Age must be positive")
    .max(120, "Age cannot exceed 120"),
    
  tags: z.array(z.string()).optional(),
  
  metadata: z.object({
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    createdAt: z.date().default(() => new Date())
  })
});
```

## Core Schema Types

### Primitives
```typescript
z.string()    // string
z.number()    // number
z.bigint()    // bigint
z.boolean()   // boolean
z.date()      // Date
z.undefined() // undefined
z.null()      // null
z.void()      // void
z.any()       // any
z.unknown()   // unknown
z.never()     // never
```

### Complex Types
```typescript
// Objects
z.object({ key: z.string() })

// Arrays
z.array(z.string())

// Tuples
z.tuple([z.string(), z.number()])

// Records
z.record(z.string())

// Maps
z.map(z.string(), z.number())

// Sets
z.set(z.string())

// Unions
z.union([z.string(), z.number()])

// Discriminated Unions
z.discriminatedUnion("type", [
  z.object({ type: z.literal("a"), value: z.string() }),
  z.object({ type: z.literal("b"), value: z.number() })
])

// Enums
z.enum(["red", "green", "blue"])
z.nativeEnum(MyEnum)
```

## Validation Rules

### String Validations
```typescript
z.string()
  .min(5)                    // Minimum length
  .max(100)                  // Maximum length
  .length(10)                // Exact length
  .email()                   // Email format
  .url()                     // URL format
  .uuid()                    // UUID format
  .regex(/pattern/)          // Custom regex
  .includes("substring")     // Contains substring
  .startsWith("prefix")      // Starts with prefix
  .endsWith("suffix")        // Ends with suffix
  .datetime()                // ISO datetime string
  .trim()                    // Trim whitespace
  .toLowerCase()             // Convert to lowercase
  .toUpperCase()             // Convert to uppercase
```

### Number Validations
```typescript
z.number()
  .gt(5)                     // Greater than
  .gte(5)                    // Greater than or equal (alias: .min(5))
  .lt(10)                    // Less than
  .lte(10)                   // Less than or equal (alias: .max(10))
  .int()                     // Integer
  .positive()                // Positive number
  .nonnegative()             // Non-negative number
  .negative()                // Negative number
  .nonpositive()             // Non-positive number
  .multipleOf(5)             // Multiple of number
  .finite()                  // Finite number
  .safe()                    // Safe integer
```

### Array Validations
```typescript
z.array(z.string())
  .min(2)                    // Minimum elements
  .max(10)                   // Maximum elements
  .length(5)                 // Exact length
  .nonempty()                // At least one element
```

## Advanced Features

### Transformations
```typescript
const TransformSchema = z.string()
  .transform((val) => val.trim())
  .transform((val) => val.toLowerCase())
  .transform((val) => val.length);

type Output = z.infer<typeof TransformSchema>; // number
```

### Refinements
```typescript
const PasswordSchema = z.string()
  .min(8)
  .refine((val) => /[A-Z]/.test(val), {
    message: "Password must contain at least one uppercase letter"
  })
  .refine((val) => /[0-9]/.test(val), {
    message: "Password must contain at least one number"
  });
```

### Conditional Logic
```typescript
const ConditionalSchema = z.object({
  type: z.enum(["user", "admin"]),
  permissions: z.array(z.string())
}).refine((data) => {
  if (data.type === "admin") {
    return data.permissions.length > 0;
  }
  return true;
}, {
  message: "Admin users must have at least one permission",
  path: ["permissions"]
});
```

### Default Values
```typescript
const SchemaWithDefaults = z.object({
  name: z.string(),
  active: z.boolean().default(true),
  createdAt: z.date().default(() => new Date()),
  tags: z.array(z.string()).default([])
});
```

### Optional and Nullable
```typescript
z.string().optional()              // string | undefined
z.string().nullable()              // string | null
z.string().nullish()               // string | null | undefined
z.string().optional().default("")  // string (with empty string default)
```

## Error Handling

### Error Structure
```typescript
const result = schema.safeParse(data);

if (!result.success) {
  result.error.issues.forEach((issue) => {
    console.log({
      code: issue.code,           // Error code (e.g., "invalid_type")
      message: issue.message,     // Error message
      path: issue.path,           // Path to the invalid field
      expected: issue.expected,   // Expected type/value
      received: issue.received    // Received type/value
    });
  });
}
```

### Custom Error Messages
```typescript
const CustomErrorSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  age: z.number({
    required_error: "Age is required",
    invalid_type_error: "Age must be a number"
  }).min(18, "You must be at least 18 years old")
});
```

## JSON Schema Integration

Zod can convert schemas to JSON Schema format:

```typescript
import { zodToJsonSchema } from "zod-to-json-schema";

const schema = z.object({
  name: z.string(),
  age: z.number().min(0)
});

const jsonSchema = zodToJsonSchema(schema);
// Outputs standard JSON Schema
```

## Best Practices

1. **Use Descriptive Error Messages**: Always provide clear, actionable error messages
2. **Leverage Type Inference**: Use `z.infer<>` to extract types and avoid duplication
3. **Chain Validations**: Build complex validations by chaining simple ones
4. **Use Transformations Wisely**: Transform data after validation for clean separation
5. **Handle Errors Gracefully**: Use `safeParse` for user input, `parse` for trusted data
6. **Document Schemas**: Use `.describe()` to add documentation to schema fields
7. **Compose Schemas**: Break complex schemas into smaller, reusable pieces

## Performance Considerations

- Zod is lightweight with zero dependencies
- Validation is synchronous and fast
- Use `safeParse` to avoid throwing exceptions in performance-critical paths
- Consider caching parsed results for repeated validation of similar data
- For extremely large datasets, consider batch validation strategies

## Integration Examples

Zod integrates well with:
- **React Hook Form**: For form validation
- **Express.js**: For API request validation
- **tRPC**: For end-to-end type safety
- **Prisma**: For database schema validation
- **Next.js**: For API route validation
- **Model Context Protocol**: For tool parameter validation

This overview provides the foundation for understanding Zod's capabilities and how it can be effectively used in TypeScript applications for robust schema validation and type safety.