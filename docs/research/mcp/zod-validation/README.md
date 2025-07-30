# Zod Validation for MCP Tools - Research Documentation

This directory contains comprehensive research and documentation on using Zod validation library with Model Context Protocol (MCP) tools and servers.

## Overview

Zod is a TypeScript-first schema validation library that provides runtime validation with static type inference. It's extensively used in the MCP TypeScript SDK for validating tool parameters, resource definitions, and ensuring type safety across MCP implementations.

## Documentation Structure

### 📚 [Overview](./overview.md)
Comprehensive introduction to Zod validation library covering:
- Core features and benefits
- Basic schema types and validation rules
- Advanced features like transformations and refinements
- Integration with TypeScript
- Performance considerations
- JSON Schema compatibility

### 🔗 [MCP Integration](./mcp-integration.md)
Detailed guide on integrating Zod with MCP servers and tools:
- MCP architecture with Zod validation
- Tool registration with schema validation
- Resource and prompt registration patterns
- Error handling and security considerations
- Advanced validation patterns for MCP use cases

### 📋 [Schema Examples](./schema-examples.md)
Practical Zod schema examples for common MCP tool scenarios:
- Basic tool schemas (calculator, text processing)
- File system operations with security validation
- Database query tools with SQL injection prevention
- HTTP/API request tools with comprehensive validation
- Email and communication tools
- Search and query interfaces
- Authentication and security schemas
- Monitoring and analytics tools
- Reusable validation components and utilities

### ⚡ [Best Practices](./best-practices.md)
Essential best practices for Zod validation in MCP contexts:
- Security-first validation principles
- Error handling and user experience
- Performance optimization strategies
- Schema design patterns and composability
- Environment-aware validation
- Testing and development workflows
- Documentation and maintenance standards

### 🔧 [Type Inference](./type-inference.md)
Advanced guide to Zod's type inference capabilities:
- Basic type inference with `z.infer<>`
- Input vs output types for transformations
- Complex nested type inference
- Generic schema functions and builders
- Type guards and predicates
- MCP-specific type patterns
- Brand types and domain modeling

## Key Benefits of Zod for MCP

### 🛡️ Security
- **Input Validation**: Comprehensive validation prevents injection attacks and malformed data
- **Path Traversal Protection**: Built-in safeguards against directory traversal attacks
- **XSS Prevention**: Content sanitization and validation rules
- **Rate Limiting**: Schema-based resource usage controls

### 📊 Type Safety
- **Static Type Inference**: Automatic TypeScript type generation from schemas
- **Runtime Validation**: Catches errors that static typing might miss
- **IDE Support**: Full IntelliSense from inferred types
- **Compile-time Checks**: Early error detection during development

### 🚀 Performance
- **Zero Dependencies**: Lightweight library with minimal overhead
- **Efficient Validation**: Fast schema compilation and validation
- **Caching Support**: Schema reuse and caching strategies
- **Async Optimization**: Batched async validations for better performance

### 🔧 Developer Experience
- **Descriptive Errors**: Clear, actionable validation error messages
- **Chainable API**: Intuitive schema building with method chaining
- **Transformation Support**: Built-in data transformation capabilities
- **Testing Integration**: Easy schema testing and validation workflows

## Quick Start Example

```typescript
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Define a Zod schema for tool parameters
const CalculatorSchema = z.object({
  operation: z.enum(['add', 'subtract', 'multiply', 'divide'])
    .describe("Mathematical operation to perform"),
  a: z.number()
    .describe("First operand"),
  b: z.number()
    .describe("Second operand")
    .refine((val) => val !== 0, "Division by zero not allowed")
});

// Extract TypeScript type
type CalculatorInput = z.infer<typeof CalculatorSchema>;

// Create MCP server
const server = new McpServer({
  name: "calculator-server",
  version: "1.0.0"
});

// Register tool with Zod validation
server.registerTool("calculator", {
  title: "Calculator Tool",
  description: "Perform basic arithmetic operations",
  inputSchema: CalculatorSchema
}, async (params: CalculatorInput) => {
  // params is fully typed and validated
  let result: number;
  
  switch (params.operation) {
    case 'add':
      result = params.a + params.b;
      break;
    case 'subtract':
      result = params.a - params.b;
      break;
    case 'multiply':
      result = params.a * params.b;
      break;
    case 'divide':
      result = params.a / params.b;
      break;
  }
  
  return {
    content: [{
      type: "text",
      text: `${params.a} ${params.operation} ${params.b} = ${result}`
    }]
  };
});
```

## Common Use Cases

### Tool Parameter Validation
```typescript
const FileOperationSchema = z.object({
  path: z.string()
    .refine(path => !path.includes('..'), "Path traversal not allowed")
    .describe("File path to operate on"),
  action: z.enum(['read', 'write', 'delete'])
    .describe("File operation to perform")
});
```

### Resource Definition
```typescript
const DatabaseResourceSchema = z.object({
  table: z.string()
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid table name")
    .describe("Database table name"),
  id: z.string().uuid().optional()
    .describe("Record ID (optional for listing)")
});
```

### Prompt Arguments
```typescript
const ContentPromptSchema = z.object({
  topic: z.string().min(3)
    .describe("Content topic"),
  style: z.enum(['formal', 'casual', 'technical']).default('formal')
    .describe("Writing style"),
  length: z.enum(['short', 'medium', 'long']).default('medium')
    .describe("Content length")
});
```

## Related Resources

### External Links
- [Zod Official Documentation](https://zod.dev/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Specification](https://modelcontextprotocol.io/)

### Internal References
- [MCP Boilerplate Examples](../../examples/)
- [Server Implementation Guide](../implementation/)
- [Security Guidelines](../security/)

## Contributing

When adding new schema examples or patterns to this documentation:

1. **Include Descriptions**: All schema fields must have clear descriptions
2. **Security First**: Consider security implications and add appropriate validations
3. **Type Safety**: Demonstrate proper type inference usage
4. **Real-world Examples**: Use practical, applicable examples
5. **Error Handling**: Show proper error handling patterns
6. **Performance**: Consider validation performance impacts

## Versioning

This documentation covers:
- **Zod**: v3.x (latest stable)
- **MCP Protocol**: v2024-11-05
- **TypeScript**: v5.x
- **Node.js**: v18+ (recommended v20+)

---

*Last updated: 2025-01-30*