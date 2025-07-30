# FastMCP Tools and Resources Creation Guide

## Understanding MCP Components

### Tools vs Resources vs Prompts

#### Tools
- **Function**: Perform actions with side effects (like POST endpoints)
- **Use Cases**: Data manipulation, API calls, file operations, calculations
- **Return**: Text results or resource links
- **Examples**: Create user, send email, process data, make API calls

#### Resources
- **Function**: Provide data without computation (like GET endpoints)
- **Use Cases**: Configuration data, templates, static content, cached results
- **Return**: Text, JSON, or binary content
- **Examples**: User profiles, configuration files, documentation

#### Prompts
- **Function**: Reusable templates for LLM interactions
- **Use Cases**: Standardized conversation patterns, context injection
- **Return**: Formatted prompts with context
- **Examples**: Code review templates, analysis patterns

## Creating Tools

### Basic Tool Creation (Python)

#### Simple Function Tool
```python
from fastmcp import FastMCP

mcp = FastMCP("Tools Demo")

@mcp.tool
def calculate_bmi(weight_kg: float, height_m: float) -> str:
    """Calculate Body Mass Index
    
    Args:
        weight_kg: Weight in kilograms
        height_m: Height in meters
        
    Returns:
        BMI calculation result with category
    """
    bmi = weight_kg / (height_m ** 2)
    
    if bmi < 18.5:
        category = "Underweight"
    elif bmi < 25:
        category = "Normal weight"
    elif bmi < 30:
        category = "Overweight"
    else:
        category = "Obese"
    
    return f"BMI: {bmi:.1f} ({category})"
```

#### Tool with Complex Input
```python
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class TaskCreate(BaseModel):
    title: str = Field(..., description="Task title")
    description: Optional[str] = Field(None, description="Task description")
    priority: int = Field(1, ge=1, le=5, description="Priority (1-5)")
    tags: Optional[List[str]] = Field(None, description="Task tags")
    due_date: Optional[datetime] = Field(None, description="Due date")

@mcp.tool
def create_task(task: TaskCreate) -> str:
    """Create a new task with detailed information"""
    task_id = f"task_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    result = {
        "id": task_id,
        "title": task.title,
        "description": task.description,
        "priority": task.priority,
        "tags": task.tags or [],
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "created_at": datetime.now().isoformat(),
        "status": "pending"
    }
    
    return f"Task created: {result}"
```

#### Async Tool
```python
import httpx
import asyncio

@mcp.tool
async def fetch_weather(city: str, api_key: str) -> str:
    """Fetch weather information for a city"""
    url = f"http://api.openweathermap.org/data/2.5/weather"
    params = {
        "q": city,
        "appid": api_key,
        "units": "metric"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            return f"Weather in {city}: {data['main']['temp']}°C, {data['weather'][0]['description']}"
        except httpx.HTTPError as e:
            return f"Error fetching weather: {e}"
```

### Advanced Tool Patterns (Python)

#### Tool with Context Access
```python
from fastmcp import Context

@mcp.tool
def log_activity(activity: str, context: Context) -> str:
    """Log an activity with context information"""
    # Send log message to client
    context.log_info(f"Activity logged: {activity}")
    
    # Access session information
    session_info = getattr(context.session, 'id', 'unknown')
    timestamp = datetime.now().isoformat()
    
    return f"Activity '{activity}' logged at {timestamp} (Session: {session_info})"
```

#### Tool with Progress Reporting
```python
import time

@mcp.tool
def batch_process(items: List[str], context: Context) -> str:
    """Process items in batch with progress updates"""
    total_items = len(items)
    processed = []
    
    for i, item in enumerate(items):
        # Simulate processing
        time.sleep(0.5)
        
        # Report progress
        progress = (i + 1) / total_items
        context.send_progress(
            progress_token=f"batch_{i}",
            progress=progress,
            total=1.0
        )
        
        processed.append(f"processed_{item}")
    
    return f"Processed {total_items} items: {processed}"
```

#### Tool with File Operations
```python
import os
from pathlib import Path

@mcp.tool
def save_data(filename: str, content: str, directory: str = "data") -> str:
    """Save content to a file"""
    try:
        # Create directory if it doesn't exist
        Path(directory).mkdir(parents=True, exist_ok=True)
        
        # Save file
        file_path = Path(directory) / filename
        file_path.write_text(content)
        
        return f"Data saved to {file_path.absolute()}"
    except Exception as e:
        return f"Error saving file: {e}"

@mcp.tool
def read_data(filename: str, directory: str = "data") -> str:
    """Read content from a file"""
    try:
        file_path = Path(directory) / filename
        if not file_path.exists():
            return f"File {file_path} does not exist"
        
        content = file_path.read_text()
        return f"File content ({len(content)} chars):\n{content}"
    except Exception as e:
        return f"Error reading file: {e}"
```

### TypeScript Tool Creation

#### Basic TypeScript Tool
```typescript
import { FastMCP } from "fastmcp";
import { z } from "zod";

const server = new FastMCP({
  name: "TypeScript Tools Server",
  version: "1.0.0",
});

// Simple calculation tool
const CalculateSchema = z.object({
  operation: z.enum(["add", "subtract", "multiply", "divide"]),
  a: z.number(),
  b: z.number()
});

server.addTool({
  name: "calculate",
  description: "Perform basic mathematical operations",
  inputSchema: CalculateSchema,
  handler: async ({ operation, a, b }) => {
    let result: number;
    
    switch (operation) {
      case "add":
        result = a + b;
        break;
      case "subtract":
        result = a - b;
        break;
      case "multiply":
        result = a * b;
        break;
      case "divide":
        if (b === 0) {
          throw new Error("Division by zero is not allowed");
        }
        result = a / b;
        break;
    }
    
    return {
      content: [{
        type: "text",
        text: `${a} ${operation} ${b} = ${result}`
      }]
    };
  }
});
```

#### Complex TypeScript Tool with Validation
```typescript
import { z } from "zod";

// Define complex schema
const UserCreateSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().int().min(13).max(120),
  preferences: z.object({
    theme: z.enum(["light", "dark", "auto"]),
    notifications: z.boolean(),
    language: z.string().optional()
  }).optional()
});

server.addTool({
  name: "create_user",
  description: "Create a new user with validation",
  inputSchema: UserCreateSchema,
  handler: async (input) => {
    try {
      // Simulate user creation
      const userId = Math.random().toString(36).substr(2, 9);
      const user = {
        id: userId,
        ...input,
        createdAt: new Date().toISOString(),
        status: "active"
      };
      
      // Simulate saving to database
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        content: [{
          type: "text",
          text: `User created successfully:\n${JSON.stringify(user, null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error creating user: ${error.message}`
        }],
        isError: true
      };
    }
  }
});
```

## Creating Resources

### Basic Resource Creation (Python)

#### Static Resource
```python
@mcp.resource("config")
def get_config() -> str:
    """Get application configuration"""
    config = {
        "app_name": "FastMCP Demo",
        "version": "1.0.0",
        "environment": "development",
        "features": {
            "auth": True,
            "logging": True,
            "metrics": False
        }
    }
    return json.dumps(config, indent=2)
```

#### Dynamic Resource
```python
from datetime import datetime
import json

@mcp.resource("system-status")
def get_system_status() -> str:
    """Get current system status"""
    import psutil
    
    status = {
        "timestamp": datetime.now().isoformat(),
        "cpu_percent": psutil.cpu_percent(),
        "memory_percent": psutil.virtual_memory().percent,
        "disk_percent": psutil.disk_usage('/').percent,
        "uptime": datetime.now().isoformat()  # Simplified
    }
    return json.dumps(status, indent=2)
```

#### Resource with Parameters
```python
@mcp.resource("user-profile")
def get_user_profile(user_id: str) -> str:
    """Get user profile by ID"""
    # Simulate database lookup
    profiles = {
        "user1": {"name": "Alice", "role": "admin"},
        "user2": {"name": "Bob", "role": "user"},
        "user3": {"name": "Charlie", "role": "moderator"}
    }
    
    profile = profiles.get(user_id, {"error": "User not found"})
    return json.dumps(profile, indent=2)
```

### TypeScript Resource Creation

#### Basic TypeScript Resource
```typescript
server.addResource({
  uri: "config://app",
  name: "Application Configuration",
  description: "Current application configuration",
  mimeType: "application/json",
  handler: async () => {
    const config = {
      name: "TypeScript MCP Server",
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      features: {
        auth: true,
        rateLimit: true,
        cors: true
      }
    };
    
    return {
      contents: [{
        uri: "config://app",
        mimeType: "application/json",
        text: JSON.stringify(config, null, 2)
      }]
    };
  }
});
```

#### Dynamic TypeScript Resource
```typescript
server.addResource({
  uri: "status://system",
  name: "System Status",
  description: "Current system status and metrics",
  mimeType: "application/json",
  handler: async () => {
    const status = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform
    };
    
    return {
      contents: [{
        uri: "status://system",
        mimeType: "application/json",
        text: JSON.stringify(status, null, 2)
      }]
    };
  }
});
```

## Creating Prompts

### Basic Prompt Creation (Python)

#### Simple Prompt
```python
@mcp.prompt("code-review")
def code_review_prompt(language: str, code: str) -> str:
    """Generate a code review prompt"""
    return f"""Please review the following {language} code:

```{language}
{code}
```

Focus on:
1. Code quality and readability
2. Performance considerations
3. Security issues
4. Best practices
5. Potential bugs

Provide specific suggestions for improvement."""
```

#### Context-Aware Prompt
```python
@mcp.prompt("task-planning")
def task_planning_prompt(project: str, requirements: str, context: Context) -> str:
    """Generate a task planning prompt with context"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    return f"""Task Planning Session - {timestamp}
Project: {project}

Requirements:
{requirements}

Please create a detailed task breakdown including:
1. Main tasks and subtasks
2. Dependencies between tasks
3. Estimated time for each task
4. Priority levels
5. Risk assessment
6. Required resources

Format the response as a structured plan with clear action items."""
```

### TypeScript Prompt Creation

#### Basic TypeScript Prompt
```typescript
const AnalysisPromptSchema = z.object({
  topic: z.string(),
  context: z.string(),
  analysisType: z.enum(["technical", "business", "strategic"])
});

server.addPrompt({
  name: "analysis",
  description: "Generate analysis prompts for different contexts",
  arguments: AnalysisPromptSchema,
  handler: async ({ topic, context, analysisType }) => {
    const prompts = {
      technical: `Perform a technical analysis of ${topic}:
        
Context: ${context}

Please analyze:
1. Technical feasibility
2. Implementation challenges
3. Performance implications
4. Scalability considerations
5. Technology recommendations`,

      business: `Conduct a business analysis of ${topic}:
        
Context: ${context}

Please evaluate:
1. Business impact
2. Cost-benefit analysis
3. Market implications
4. Risk assessment
5. Strategic recommendations`,

      strategic: `Provide a strategic analysis of ${topic}:
        
Context: ${context}

Please assess:
1. Strategic alignment
2. Competitive advantages
3. Long-term implications
4. Resource requirements
5. Success metrics`
    };
    
    return {
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: prompts[analysisType]
        }
      }]
    };
  }
});
```

## Best Practices for Tools and Resources

### Validation and Error Handling

#### Input Validation
```python
from pydantic import BaseModel, Field, validator

class EmailInput(BaseModel):
    to: str = Field(..., description="Recipient email address")
    subject: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1)
    
    @validator('to')
    def validate_email(cls, v):
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, v):
            raise ValueError('Invalid email address')
        return v

@mcp.tool
def send_email(email: EmailInput) -> str:
    """Send an email with validation"""
    try:
        # Email sending logic here
        return f"Email sent to {email.to} with subject '{email.subject}'"
    except Exception as e:
        return f"Failed to send email: {e}"
```

#### Comprehensive Error Handling
```python
import logging
from enum import Enum

class ErrorType(Enum):
    VALIDATION = "validation_error"
    NETWORK = "network_error"
    PERMISSION = "permission_error"
    SYSTEM = "system_error"

@mcp.tool
def robust_operation(data: dict) -> str:
    """A tool with comprehensive error handling"""
    try:
        # Validate input
        if not data:
            raise ValueError("Input data is required")
        
        # Simulate operation that might fail
        result = process_data(data)
        return f"Operation successful: {result}"
        
    except ValueError as e:
        logging.error(f"Validation error: {e}")
        return f"Validation Error: {e}"
    except ConnectionError as e:
        logging.error(f"Network error: {e}")
        return f"Network Error: Unable to connect to external service"
    except PermissionError as e:
        logging.error(f"Permission error: {e}")
        return f"Permission Error: Insufficient privileges"
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        return f"System Error: An unexpected error occurred"

def process_data(data: dict):
    # Placeholder for actual processing logic
    return {"processed": True, "items": len(data)}
```

### Performance Optimization

#### Caching Resources
```python
from functools import lru_cache
import time

@lru_cache(maxsize=128)
def expensive_computation(param: str) -> str:
    """Expensive computation with caching"""
    time.sleep(2)  # Simulate expensive operation
    return f"Result for {param}: {hash(param)}"

@mcp.resource("cached-data")
def get_cached_data(param: str) -> str:
    """Resource with cached computation"""
    result = expensive_computation(param)
    return json.dumps({"result": result, "cached": True})
```

#### Async Resource Loading
```python
import asyncio
import aiofiles

@mcp.resource("large-file")
async def get_large_file(filename: str) -> str:
    """Asynchronously load large files"""
    try:
        async with aiofiles.open(filename, 'r') as file:
            content = await file.read()
            return content
    except FileNotFoundError:
        return json.dumps({"error": "File not found"})
    except Exception as e:
        return json.dumps({"error": str(e)})
```

This comprehensive guide covers the creation of tools, resources, and prompts in FastMCP, with practical examples for both Python and TypeScript implementations, including best practices for validation, error handling, and performance optimization.