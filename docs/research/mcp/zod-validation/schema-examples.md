# Zod Schema Examples for MCP Tools

This document provides practical Zod schema examples specifically designed for MCP (Model Context Protocol) tools, covering common use cases and patterns.

## Basic Tool Schemas

### Simple Calculator Tool

```typescript
import { z } from "zod";

const CalculatorSchema = z.object({
  operation: z.enum(['add', 'subtract', 'multiply', 'divide'])
    .describe("Mathematical operation to perform"),
  a: z.number()
    .describe("First operand"),
  b: z.number()
    .describe("Second operand")
    .refine((val) => val !== 0, {
      message: "Second operand cannot be zero for division"
    })
});

type CalculatorInput = z.infer<typeof CalculatorSchema>;
```

### Text Processing Tool

```typescript
const TextProcessorSchema = z.object({
  text: z.string()
    .min(1, "Text cannot be empty")
    .max(10000, "Text exceeds maximum length")
    .describe("Text to process"),
    
  operations: z.array(z.enum([
    'uppercase', 'lowercase', 'trim', 'reverse', 
    'remove_spaces', 'word_count', 'char_count'
  ]))
    .min(1, "At least one operation must be specified")
    .describe("List of operations to apply to the text"),
    
  output_format: z.enum(['plain', 'json', 'markdown'])
    .default('plain')
    .describe("Format for the output")
});
```

## File System Operations

### File Management Tool

```typescript
const FileOperationSchema = z.object({
  action: z.enum(['read', 'write', 'delete', 'list', 'copy', 'move'])
    .describe("File system action to perform"),
    
  source_path: z.string()
    .min(1, "Source path cannot be empty")
    .refine((path) => {
      // Security: Prevent path traversal
      return !path.includes('..') && 
             !path.includes('~') && 
             !path.startsWith('/etc/') &&
             !path.startsWith('/root/') &&
             !path.startsWith('/sys/') &&
             !path.startsWith('/proc/');
    }, {
      message: "Invalid or unsafe file path"
    })
    .describe("Source file or directory path"),
    
  destination_path: z.string()
    .optional()
    .refine((path) => {
      if (!path) return true;
      return !path.includes('..') && 
             !path.includes('~') && 
             !path.startsWith('/etc/') &&
             !path.startsWith('/root/');
    }, {
      message: "Invalid or unsafe destination path"
    })
    .describe("Destination path (required for copy/move operations)"),
    
  content: z.string()
    .optional()
    .describe("Content to write (required for write operations)"),
    
  encoding: z.enum(['utf8', 'base64', 'binary'])
    .default('utf8')
    .describe("File encoding"),
    
  options: z.object({
    recursive: z.boolean()
      .default(false)
      .describe("Apply operation recursively to directories"),
    force: z.boolean()
      .default(false)
      .describe("Force operation (overwrite existing files)"),
    create_dirs: z.boolean()
      .default(true)
      .describe("Create parent directories if they don't exist"),
    backup: z.boolean()
      .default(false)
      .describe("Create backup before destructive operations")
  }).optional()
}).refine((data) => {
  // Conditional validation based on action
  if (data.action === 'write' && !data.content) {
    return false;
  }
  if (['copy', 'move'].includes(data.action) && !data.destination_path) {
    return false;
  }
  return true;
}, {
  message: "Missing required fields for the specified action"
});
```

## Database Operations

### Database Query Tool

```typescript
const DatabaseQuerySchema = z.object({
  query_type: z.enum(['select', 'insert', 'update', 'delete', 'create_table', 'drop_table'])
    .describe("Type of database query"),
    
  table_name: z.string()
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid table name")
    .max(64, "Table name too long")
    .describe("Name of the database table"),
    
  columns: z.array(z.string())
    .optional()
    .describe("Columns to select or modify"),
    
  where_clause: z.object({
    column: z.string(),
    operator: z.enum(['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN']),
    value: z.union([z.string(), z.number(), z.boolean(), z.array(z.any())])
  }).optional()
    .describe("WHERE clause conditions"),
    
  data: z.record(z.string(), z.any())
    .optional()
    .describe("Data for insert/update operations"),
    
  order_by: z.object({
    column: z.string(),
    direction: z.enum(['ASC', 'DESC']).default('ASC')
  }).optional()
    .describe("ORDER BY clause"),
    
  limit: z.number()
    .int()
    .positive()
    .max(10000)
    .optional()
    .describe("Maximum number of rows to return"),
    
  offset: z.number()
    .int()
    .nonnegative()
    .optional()
    .describe("Number of rows to skip")
}).refine((data) => {
  // Validate required fields based on query type
  if (data.query_type === 'insert' && !data.data) {
    return false;
  }
  if (data.query_type === 'update' && (!data.data || !data.where_clause)) {
    return false;
  }
  if (data.query_type === 'delete' && !data.where_clause) {
    return false;
  }
  return true;
}, {
  message: "Missing required fields for the specified query type"
});
```

## HTTP/API Operations

### HTTP Request Tool

```typescript
const HttpRequestSchema = z.object({
  url: z.string()
    .url("Must be a valid URL")
    .refine((url) => {
      // Security: Only allow HTTPS in production
      if (process.env.NODE_ENV === 'production') {
        return url.startsWith('https://');
      }
      return url.startsWith('http://') || url.startsWith('https://');
    }, {
      message: "Only HTTPS URLs are allowed in production"
    })
    .describe("Target URL for the HTTP request"),
    
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'])
    .default('GET')
    .describe("HTTP method"),
    
  headers: z.record(z.string(), z.string())
    .optional()
    .refine((headers) => {
      if (!headers) return true;
      // Security: Prevent header injection
      return Object.values(headers).every(value => 
        !value.includes('\r') && !value.includes('\n')
      );
    }, {
      message: "Headers contain invalid characters"
    })
    .describe("HTTP headers"),
    
  body: z.union([
    z.string(),
    z.object({}).passthrough(),
    z.array(z.any())
  ]).optional()
    .describe("Request body (for POST, PUT, PATCH)"),
    
  timeout: z.number()
    .int()
    .positive()
    .max(300000) // 5 minutes max
    .default(30000)
    .describe("Request timeout in milliseconds"),
    
  follow_redirects: z.boolean()
    .default(true)
    .describe("Whether to follow HTTP redirects"),
    
  max_redirects: z.number()
    .int()
    .positive()
    .max(10)
    .default(5)
    .describe("Maximum number of redirects to follow"),
    
  response_format: z.enum(['json', 'text', 'binary'])
    .default('json')
    .describe("Expected response format")
});
```

## Data Processing Tools

### CSV Processing Tool

```typescript
const CsvProcessorSchema = z.object({
  operation: z.enum(['parse', 'generate', 'filter', 'transform', 'aggregate'])
    .describe("CSV processing operation"),
    
  data: z.union([
    z.string(), // CSV string
    z.array(z.record(z.string(), z.any())), // Array of objects
    z.array(z.array(z.string())) // Array of arrays
  ]).describe("Input data (CSV string or structured data)"),
  
  options: z.object({
    delimiter: z.string()
      .length(1, "Delimiter must be a single character")
      .default(',')
      .describe("CSV delimiter character"),
      
    quote: z.string()
      .length(1, "Quote character must be a single character")
      .default('"')
      .describe("Quote character"),
      
    escape: z.string()
      .length(1, "Escape character must be a single character")
      .default('"')
      .describe("Escape character"),
      
    header: z.boolean()
      .default(true)
      .describe("Whether the first row contains headers"),
      
    skip_empty_lines: z.boolean()
      .default(true)
      .describe("Skip empty lines during parsing")
  }).optional(),
  
  filters: z.array(z.object({
    column: z.string().describe("Column name to filter on"),
    condition: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than'])
      .describe("Filter condition"),
    value: z.union([z.string(), z.number(), z.boolean()])
      .describe("Value to compare against")
  })).optional()
    .describe("Filters to apply to the data"),
    
  transformations: z.array(z.object({
    column: z.string().describe("Column to transform"),
    operation: z.enum(['uppercase', 'lowercase', 'trim', 'replace', 'format_date', 'to_number'])
      .describe("Transformation operation"),
    parameters: z.record(z.string(), z.any()).optional()
      .describe("Parameters for the transformation")
  })).optional()
    .describe("Transformations to apply to columns")
});
```

## Email and Communication

### Email Tool

```typescript
const EmailSchema = z.object({
  to: z.array(z.string().email("Invalid email address"))
    .min(1, "At least one recipient is required")
    .max(100, "Too many recipients")
    .describe("Email recipients"),
    
  cc: z.array(z.string().email("Invalid CC email address"))
    .optional()
    .describe("CC recipients"),
    
  bcc: z.array(z.string().email("Invalid BCC email address"))
    .optional()
    .describe("BCC recipients"),
    
  subject: z.string()
    .min(1, "Subject cannot be empty")
    .max(200, "Subject too long")
    .describe("Email subject"),
    
  body: z.string()
    .min(1, "Email body cannot be empty")
    .max(1000000, "Email body too long")
    .describe("Email body content"),
    
  format: z.enum(['text', 'html'])
    .default('text')
    .describe("Email format"),
    
  priority: z.enum(['low', 'normal', 'high'])
    .default('normal')
    .describe("Email priority"),
    
  attachments: z.array(z.object({
    filename: z.string()
      .min(1, "Filename cannot be empty")
      .refine((name) => !name.includes('/') && !name.includes('\\'), {
        message: "Filename cannot contain path separators"
      }),
    content: z.string().describe("Base64 encoded file content"),
    mime_type: z.string().optional().describe("MIME type of the attachment")
  })).optional()
    .describe("Email attachments"),
    
  delivery_time: z.string()
    .datetime()
    .optional()
    .refine((time) => {
      if (!time) return true;
      return new Date(time) > new Date();
    }, {
      message: "Delivery time must be in the future"
    })
    .describe("Scheduled delivery time (ISO datetime)")
});
```

## Search and Query Tools

### Search Tool

```typescript
const SearchSchema = z.object({
  query: z.string()
    .min(1, "Search query cannot be empty")
    .max(1000, "Search query too long")
    .transform((val) => val.trim())
    .describe("Search query"),
    
  type: z.enum(['web', 'images', 'videos', 'news', 'academic', 'local'])
    .default('web')
    .describe("Type of search to perform"),
    
  filters: z.object({
    language: z.string()
      .regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Invalid language code")
      .optional()
      .describe("Language filter (ISO 639-1 format)"),
      
    date_range: z.enum(['day', 'week', 'month', 'year', 'custom'])
      .optional()
      .describe("Date range filter"),
      
    custom_date_start: z.string()
      .datetime()
      .optional()
      .describe("Custom date range start (ISO datetime)"),
      
    custom_date_end: z.string()
      .datetime()
      .optional()
      .describe("Custom date range end (ISO datetime)"),
      
    region: z.string()
      .regex(/^[A-Z]{2}$/, "Invalid region code")
      .optional()
      .describe("Geographic region filter (ISO 3166-1 alpha-2)"),
      
    safe_search: z.enum(['off', 'moderate', 'strict'])
      .default('moderate')
      .describe("Safe search setting")
  }).optional(),
  
  pagination: z.object({
    page: z.number()
      .int()
      .positive()
      .max(100)
      .default(1)
      .describe("Page number"),
      
    per_page: z.number()
      .int()
      .positive()
      .max(100)
      .default(10)
      .describe("Results per page")
  }).optional(),
  
  output_format: z.enum(['summary', 'detailed', 'raw'])
    .default('summary')
    .describe("Format of search results")
}).refine((data) => {
  // Validate custom date range
  if (data.filters?.date_range === 'custom') {
    return !!(data.filters.custom_date_start && data.filters.custom_date_end);
  }
  return true;
}, {
  message: "Custom date range requires both start and end dates",
  path: ['filters', 'date_range']
});
```

## Security and Authentication

### Authentication Tool

```typescript
const AuthSchema = z.object({
  action: z.enum(['login', 'logout', 'refresh', 'validate', 'register'])
    .describe("Authentication action"),
    
  credentials: z.object({
    username: z.string()
      .min(3, "Username must be at least 3 characters")
      .max(50, "Username too long")
      .regex(/^[a-zA-Z0-9_.-]+$/, "Username contains invalid characters")
      .optional(),
      
    email: z.string()
      .email("Invalid email format")
      .optional(),
      
    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain uppercase, lowercase, and number")
      .optional(),
      
    token: z.string()
      .optional()
      .describe("Authentication token"),
      
    refresh_token: z.string()
      .optional()
      .describe("Refresh token"),
      
    mfa_code: z.string()
      .regex(/^\d{6}$/, "MFA code must be 6 digits")
      .optional()
      .describe("Multi-factor authentication code")
  }).optional(),
  
  options: z.object({
    remember_me: z.boolean()
      .default(false)
      .describe("Keep user logged in"),
      
    session_duration: z.number()
      .int()
      .positive()
      .max(86400 * 30) // 30 days max
      .default(3600) // 1 hour default
      .describe("Session duration in seconds"),
      
    require_mfa: z.boolean()
      .default(false)
      .describe("Require multi-factor authentication")
  }).optional()
}).refine((data) => {
  // Validate required credentials based on action
  if (data.action === 'login') {
    return !!(data.credentials?.username || data.credentials?.email) && 
           !!data.credentials?.password;
  }
  if (data.action === 'refresh') {
    return !!data.credentials?.refresh_token;
  }
  if (data.action === 'validate') {
    return !!data.credentials?.token;
  }
  return true;
}, {
  message: "Missing required credentials for the specified action"
});
```

## Monitoring and Analytics

### Analytics Tool

```typescript
const AnalyticsSchema = z.object({
  metric_type: z.enum(['pageview', 'event', 'conversion', 'error', 'performance'])
    .describe("Type of analytics metric"),
    
  event_data: z.object({
    name: z.string()
      .min(1, "Event name cannot be empty")
      .max(100, "Event name too long")
      .describe("Event name"),
      
    category: z.string()
      .optional()
      .describe("Event category"),
      
    action: z.string()
      .optional()
      .describe("Event action"),
      
    label: z.string()
      .optional()
      .describe("Event label"),
      
    value: z.number()
      .optional()
      .describe("Event value"),
      
    custom_properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .optional()
      .describe("Custom event properties")
  }),
  
  user_data: z.object({
    user_id: z.string().optional().describe("User identifier"),
    session_id: z.string().optional().describe("Session identifier"),
    ip_address: z.string().ip().optional().describe("User IP address"),
    user_agent: z.string().optional().describe("User agent string"),
    referrer: z.string().url().optional().describe("Referrer URL")
  }).optional(),
  
  timestamp: z.string()
    .datetime()
    .default(() => new Date().toISOString())
    .describe("Event timestamp"),
    
  filters: z.object({
    date_start: z.string().datetime().optional(),
    date_end: z.string().datetime().optional(),
    user_segment: z.string().optional(),
    page_path: z.string().optional(),
    event_name: z.string().optional()
  }).optional()
    .describe("Filters for analytics queries")
});
```

## Validation Helpers and Utilities

### Common Validation Patterns

```typescript
// Reusable validation components
const CommonValidations = {
  // File path validation
  safePath: z.string()
    .refine((path) => !path.includes('..'), "Path traversal not allowed")
    .refine((path) => !path.startsWith('/etc/'), "System directories not allowed"),
    
  // UUID validation
  uuid: z.string().uuid("Invalid UUID format"),
  
  // Safe HTML content
  safeHtml: z.string()
    .transform((val) => val.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''))
    .refine((val) => !val.includes('<script>'), "Script tags not allowed"),
    
  // Pagination
  pagination: z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(1000).default(50),
    offset: z.number().int().nonnegative().optional()
  }),
  
  // Date range
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).refine((data) => new Date(data.end) > new Date(data.start), {
    message: "End date must be after start date"
  }),
  
  // API key validation
  apiKey: z.string()
    .min(16, "API key too short")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid API key format")
};

// Example usage in a tool schema
const ApiToolSchema = z.object({
  api_key: CommonValidations.apiKey.describe("API authentication key"),
  resource_id: CommonValidations.uuid.describe("Resource UUID"),
  pagination: CommonValidations.pagination.optional(),
  date_filter: CommonValidations.dateRange.optional()
});
```

These schema examples provide a solid foundation for building robust MCP tools with comprehensive validation, security considerations, and clear error handling. Each schema includes descriptive field documentation and appropriate validation rules for common use cases.