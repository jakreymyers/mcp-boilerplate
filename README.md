# MCP Boilerplate

A minimal, production-ready MCP (Model Context Protocol) server boilerplate with a simple addition calculator tool. Built with TypeScript, Zod validation, and comprehensive error handling.

## ✨ Features

- **Simple Calculator Tool**: Addition tool demonstrating MCP integration
- **Type Safety**: Full TypeScript support with strict type checking
- **Input Validation**: Zod schemas with security-first validation
- **Error Handling**: Comprehensive error handling with McpError
- **Production Ready**: Proper process management and graceful shutdown
- **Extensible**: Clean architecture for adding more tools

## 🚀 Quick Start

```bash
# Clone and install
git clone <your-repo-url>
cd mcp-boilerplate
npm install

# Build and run
npm run build
npm start
```

## 📋 Requirements

- Node.js 18.x or higher
- npm or yarn package manager

## 🏗️ Project Structure

```
mcp-boilerplate/
├── src/
│   ├── index.ts              # Server entry point
│   ├── server.ts             # MCP server setup
│   ├── tools/                # Tool implementations
│   │   ├── index.ts          # Tool registry
│   │   └── calculator.ts     # Addition tool
│   ├── schemas/              # Zod validation schemas
│   │   ├── index.ts          # Schema exports
│   │   └── calculator.ts     # Calculator schemas
│   ├── types/                # TypeScript definitions
│   │   ├── index.ts          # Type exports
│   │   └── tools.ts          # Tool interfaces
│   └── utils/                # Utility functions
│       ├── index.ts          # Utility exports
│       ├── errors.ts         # Error handling
│       └── validation.ts     # Validation helpers
├── dist/                     # Compiled JavaScript (generated)
├── docs/                     # Documentation and research
└── package.json              # Dependencies and scripts
```

## 🛠️ Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Watch mode compilation
- `npm start` - Start the MCP server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier
- `npm run clean` - Remove compiled files

## 🔧 Claude Desktop Integration

1. Build the project:
   ```bash
   npm run build
   ```

2. Add to your Claude Desktop configuration (`claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "mcp-boilerplate": {
         "command": "node",
         "args": ["/absolute/path/to/mcp-boilerplate/dist/index.js"],
         "env": {
           "NODE_ENV": "production"
         }
       }
     }
   }
   ```

3. Restart Claude Desktop

4. Test the calculator tool:
   - "Add 5 and 3"
   - "What is 1.5 + 2.7?"
   - "Calculate -2 plus 7"

## 🧪 Testing

The server has been tested with the following scenarios:

### ✅ Successful Operations
- **Basic Addition**: `5 + 3 = 8`
- **Negative Numbers**: `-2 + 7 = 5`
- **Decimal Numbers**: `1.5 + 2.7 = 4.2`
- **Zero Values**: `0 + 5 = 5`

### ✅ Error Handling
- **Invalid Input**: String inputs return validation errors
- **Missing Parameters**: Missing 'a' or 'b' parameters return required field errors
- **Out of Bounds**: Numbers outside safe range are rejected

## 🛡️ Security Features

- **Input Validation**: Comprehensive Zod schemas prevent malicious input
- **Number Safety**: Finite number validation prevents NaN/Infinity injection
- **Bounds Checking**: Reasonable limits prevent DoS attacks
- **Error Sanitization**: Production errors don't expose internal details

## 📊 Tool Reference

### calculator_add

Adds two numbers together with comprehensive validation.

**Parameters:**
- `a` (number): First number to add (-10,000,000,000 to 10,000,000,000)
- `b` (number): Second number to add (-10,000,000,000 to 10,000,000,000)

**Returns:**
- Success: `{ content: [{ type: 'text', text: 'a + b = result' }] }`
- Error: MCP error with validation details

**Example:**
```json
{
  "name": "calculator_add",
  "arguments": { "a": 5, "b": 3 }
}
```

## 🔄 Extending the Boilerplate

### Adding a New Tool

1. **Create the schema** in `src/schemas/`:
   ```typescript
   export const MyToolSchema = z.object({
     param1: z.string().min(1),
   }).strict();
   
   export type MyToolInput = z.infer<typeof MyToolSchema>;
   ```

2. **Implement the tool** in `src/tools/`:
   ```typescript
   export const myTool: ToolDefinition<MyToolInput> = {
     name: 'my_tool',
     description: 'Description of what the tool does',
     inputSchema: MyToolSchema,
     execute: async (params) => {
       // Tool implementation
       return { content: [{ type: 'text', text: 'Result' }] };
     },
   };
   ```

3. **Register the tool** in `src/tools/index.ts`:
   ```typescript
   export const tools = {
     calculator_add: calculatorTool,
     my_tool: myTool, // Add your tool here
   } as const;
   ```

4. **Rebuild and test**:
   ```bash
   npm run build
   npm start
   ```

## 🐛 Troubleshooting

### Server Won't Start
- Check Node.js version (requires 18.x+)
- Run `npm run build` to compile TypeScript
- Check for port conflicts

### Tool Not Found
- Verify tool is registered in `src/tools/index.ts`
- Rebuild with `npm run build`
- Check tool name matches exactly

### Validation Errors
- Check input parameter types match schema
- Verify required fields are provided
- Check number bounds (-1e10 to 1e10)

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

*Built with TypeScript, MCP SDK v1.17.0, and Zod validation*