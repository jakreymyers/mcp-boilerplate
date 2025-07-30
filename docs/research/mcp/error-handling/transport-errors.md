# Transport Layer Error Handling in MCP

## Overview

Transport layer errors occur at the communication level between MCP clients and servers. This includes connection failures, message transmission errors, protocol violations, and network-related issues. This document covers comprehensive error handling strategies for different transport types.

## Transport Types and Error Patterns

### STDIO Transport Errors

#### Connection and Process Errors

```typescript
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn, ChildProcess } from "child_process";

class RobustStdioTransport {
  private process: ChildProcess | null = null;
  private reconnectAttempts = 0;
  private maxReconnects = 3;
  private reconnectDelay = 1000;
  
  async connect(command: string, args: string[]): Promise<void> {
    try {
      this.process = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false
      });
      
      this.setupErrorHandlers();
      await this.waitForConnection();
      this.reconnectAttempts = 0; // Reset on successful connection
      
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to start MCP server process: ${error.message}`,
        {
          command,
          args,
          error: error.message,
          attempt: this.reconnectAttempts + 1
        }
      );
    }
  }
  
  private setupErrorHandlers(): void {
    if (!this.process) return;
    
    this.process.on('error', (error) => {
      console.error('Process error:', error);
      this.handleProcessError(error);
    });
    
    this.process.on('exit', (code, signal) => {
      console.warn(`Process exited with code ${code}, signal ${signal}`);
      if (code !== 0 && this.reconnectAttempts < this.maxReconnects) {
        this.attemptReconnect();
      }
    });
    
    this.process.stderr?.on('data', (data) => {
      console.error('Server stderr:', data.toString());
    });
    
    // Handle broken pipe errors
    this.process.stdin?.on('error', (error) => {
      if (error.code === 'EPIPE') {
        console.warn('Broken pipe detected, attempting reconnect');
        this.attemptReconnect();
      } else {
        console.error('Stdin error:', error);
      }
    });
    
    this.process.stdout?.on('error', (error) => {
      console.error('Stdout error:', error);
      this.handleStreamError(error);
    });
  }
  
  private async handleProcessError(error: any): Promise<void> {
    const errorData = {
      code: error.code,
      message: error.message,
      errno: error.errno,
      syscall: error.syscall,
      path: error.path
    };
    
    switch (error.code) {
      case 'ENOENT':
        throw new McpError(
          ErrorCode.InternalError,
          "MCP server executable not found",
          {
            ...errorData,
            suggestion: "Check that the server executable exists and is in PATH"
          }
        );
        
      case 'EACCES':
        throw new McpError(
          ErrorCode.InternalError,
          "Permission denied executing MCP server",
          {
            ...errorData,
            suggestion: "Check file permissions on the server executable"
          }
        );
        
      case 'EMFILE':
      case 'ENFILE':
        throw new McpError(
          ErrorCode.InternalError,
          "Too many open files",
          {
            ...errorData,
            suggestion: "Increase system file descriptor limits"
          }
        );
        
      default:
        throw new McpError(
          ErrorCode.InternalError,
          `Process error: ${error.message}`,
          errorData
        );
    }
  }
  
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnects) {
      throw new McpError(
        ErrorCode.InternalError,
        "Maximum reconnection attempts exceeded",
        {
          maxReconnects: this.maxReconnects,
          finalAttempt: this.reconnectAttempts
        }
      );
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnects} in ${delay}ms`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      // Re-establish connection with same parameters
      // Implementation depends on how original connection was made
      await this.reconnect();
    } catch (error) {
      console.error(`Reconnect attempt ${this.reconnectAttempts} failed:`, error);
      if (this.reconnectAttempts < this.maxReconnects) {
        await this.attemptReconnect();
      } else {
        throw error;
      }
    }
  }
  
  private async waitForConnection(timeoutMs: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.process) {
        reject(new Error("No process to wait for"));
        return;
      }
      
      const timeout = setTimeout(() => {
        reject(new McpError(
          ErrorCode.InternalError,
          "Connection timeout",
          { timeoutMs }
        ));
      }, timeoutMs);
      
      // Wait for first successful message exchange or ready indicator
      this.process.stdout?.once('data', () => {
        clearTimeout(timeout);
        resolve();
      });
      
      this.process.once('exit', (code) => {
        clearTimeout(timeout);
        reject(new McpError(
          ErrorCode.InternalError,
          `Process exited before connection established`,
          { exitCode: code }
        ));
      });
    });
  }
  
  private async reconnect(): Promise<void> {
    // Clean up existing process
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    
    // Re-establish connection
    // Implementation specific to your connection setup
  }
}
```

#### Message Transmission Errors

```typescript
class ReliableMessageHandler {
  private messageQueue: Array<{
    id: string;
    message: any;
    attempts: number;
    maxAttempts: number;
    timestamp: number;
  }> = [];
  
  private pendingResponses = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  
  async sendMessage(message: any, maxAttempts: number = 3): Promise<any> {
    const messageId = this.generateMessageId();
    const queuedMessage = {
      id: messageId,
      message: { ...message, id: messageId },
      attempts: 0,
      maxAttempts,
      timestamp: Date.now()
    };
    
    this.messageQueue.push(queuedMessage);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(messageId);
        reject(new McpError(
          ErrorCode.InternalError,
          "Message response timeout",
          {
            messageId,
            method: message.method,
            timeoutMs: 30000
          }
        ));
      }, 30000);
      
      this.pendingResponses.set(messageId, { resolve, reject, timeout });
      this.attemptSendMessage(queuedMessage);
    });
  }
  
  private async attemptSendMessage(queuedMessage: any): Promise<void> {
    try {
      queuedMessage.attempts++;
      
      // Simulate message transmission
      await this.transmitMessage(queuedMessage.message);
      
      // Remove from queue on successful transmission
      const index = this.messageQueue.indexOf(queuedMessage);
      if (index !== -1) {
        this.messageQueue.splice(index, 1);
      }
      
    } catch (error) {
      console.error(`Message transmission failed (attempt ${queuedMessage.attempts}):`, error);
      
      if (queuedMessage.attempts >= queuedMessage.maxAttempts) {
        // Max attempts reached, fail the message
        const pending = this.pendingResponses.get(queuedMessage.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingResponses.delete(queuedMessage.id);
          pending.reject(new McpError(
            ErrorCode.InternalError,
            "Message transmission failed after max attempts",
            {
              messageId: queuedMessage.id,
              attempts: queuedMessage.attempts,
              maxAttempts: queuedMessage.maxAttempts,
              lastError: error.message
            }
          ));
        }
        
        // Remove from queue
        const index = this.messageQueue.indexOf(queuedMessage);
        if (index !== -1) {
          this.messageQueue.splice(index, 1);
        }
      } else {
        // Schedule retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, queuedMessage.attempts - 1), 10000);
        setTimeout(() => {
          this.attemptSendMessage(queuedMessage);
        }, delay);
      }
    }
  }
  
  private async transmitMessage(message: any): Promise<void> {
    // Implementation specific to your transport
    // This should throw on transmission errors
    if (!this.isConnected()) {
      throw new Error("Transport not connected");
    }
    
    try {
      await this.writeToTransport(JSON.stringify(message) + '\n');
    } catch (error) {
      if (error.code === 'EPIPE') {
        throw new Error("Broken pipe - connection lost");
      } else if (error.code === 'ECONNRESET') {
        throw new Error("Connection reset by peer");
      } else {
        throw error;
      }
    }
  }
  
  handleResponse(response: any): void {
    const messageId = response.id;
    const pending = this.pendingResponses.get(messageId);
    
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingResponses.delete(messageId);
      
      if (response.error) {
        pending.reject(new McpError(
          response.error.code,
          response.error.message,
          response.error.data
        ));
      } else {
        pending.resolve(response.result);
      }
    }
  }
  
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private isConnected(): boolean {
    // Implementation specific connection check
    return true;
  }
  
  private async writeToTransport(data: string): Promise<void> {
    // Implementation specific write operation
  }
}
```

### HTTP/SSE Transport Errors

#### HTTP Transport Error Handling

```typescript
import { fetch } from 'undici';

class HTTPTransportHandler {
  private baseUrl: string;
  private timeout: number;
  private retryConfig: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
  };
  
  constructor(baseUrl: string, options: any = {}) {
    this.baseUrl = baseUrl;
    this.timeout = options.timeout || 30000;
    this.retryConfig = {
      maxRetries: options.maxRetries || 3,
      baseDelay: options.baseDelay || 1000,
      maxDelay: options.maxDelay || 10000
    };
  }
  
  async sendRequest(request: any): Promise<any> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await this.attemptRequest(request, attempt);
      } catch (error) {
        lastError = error;
        
        if (!this.shouldRetry(error, attempt)) {
          throw error;
        }
        
        if (attempt < this.retryConfig.maxRetries) {
          const delay = this.calculateDelay(attempt);
          console.warn(`Request failed (attempt ${attempt + 1}), retrying in ${delay}ms:`, error.message);
          await this.delay(delay);
        }
      }
    }
    
    throw lastError!;
  }
  
  private async attemptRequest(request: any, attempt: number): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'MCP-Protocol-Version': '2024-11-05'
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Handle HTTP status codes
      if (!response.ok) {
        await this.handleHttpError(response, request);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new McpError(
          ErrorCode.InternalError,
          "Invalid response content type",
          {
            expected: 'application/json',
            received: contentType,
            status: response.status
          }
        );
      }
      
      try {
        const result = await response.json();
        return result;
      } catch (parseError) {
        throw new McpError(
          ErrorCode.ParseError,
          "Failed to parse JSON response",
          {
            status: response.status,
            contentType,
            parseError: parseError.message
          }
        );
      }
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new McpError(
          ErrorCode.InternalError,
          "Request timeout",
          {
            timeoutMs: this.timeout,
            attempt: attempt + 1,
            url: this.baseUrl
          }
        );
      }
      
      // Network errors
      if (error.code === 'ECONNREFUSED') {
        throw new McpError(
          ErrorCode.InternalError,
          "Connection refused by server",
          {
            url: this.baseUrl,
            attempt: attempt + 1,
            suggestion: "Check if the server is running and accessible"
          }
        );
      }
      
      if (error.code === 'ENOTFOUND') {
        throw new McpError(
          ErrorCode.InternalError,
          "Server not found",
          {
            url: this.baseUrl,
            suggestion: "Check the server URL and DNS resolution"
          }
        );
      }
      
      if (error.code === 'ECONNRESET') {
        throw new McpError(
          ErrorCode.InternalError,
          "Connection reset by server",
          {
            url: this.baseUrl,
            attempt: attempt + 1,
            retryable: true
          }
        );
      }
      
      throw error;
    }
  }
  
  private async handleHttpError(response: Response, request: any): Promise<never> {
    let errorBody: any = null;
    
    try {
      const text = await response.text();
      if (text) {
        errorBody = JSON.parse(text);
      }
    } catch {
      // Ignore parse errors for error responses
    }
    
    const errorData = {
      status: response.status,
      statusText: response.statusText,
      url: this.baseUrl,
      method: request.method,
      body: errorBody
    };
    
    switch (response.status) {
      case 400:
        throw new McpError(
          ErrorCode.InvalidRequest,
          "Bad Request",
          {
            ...errorData,
            suggestion: "Check request format and parameters"
          }
        );
        
      case 401:
        throw new McpError(
          ErrorCode.InternalError, // Could define custom auth error code
          "Unauthorized",
          {
            ...errorData,
            suggestion: "Check authentication credentials"
          }
        );
        
      case 403:
        throw new McpError(
          ErrorCode.InternalError,
          "Forbidden",
          {
            ...errorData,
            suggestion: "Check access permissions"
          }
        );
        
      case 404:
        throw new McpError(
          ErrorCode.MethodNotFound,
          "Endpoint not found",
          {
            ...errorData,
            suggestion: "Check the server URL and endpoint path"
          }
        );
        
      case 429:
        const retryAfter = response.headers.get('retry-after');
        throw new McpError(
          ErrorCode.InternalError,
          "Rate limit exceeded",
          {
            ...errorData,
            retryAfter: retryAfter ? parseInt(retryAfter) : null,
            retryable: true
          }
        );
        
      case 500:
      case 502:
      case 503:
      case 504:
        throw new McpError(
          ErrorCode.InternalError,
          `Server error: ${response.status}`,
          {
            ...errorData,
            retryable: true
          }
        );
        
      default:
        throw new McpError(
          ErrorCode.InternalError,
          `HTTP error: ${response.status}`,
          errorData
        );
    }
  }
  
  private shouldRetry(error: any, attempt: number): boolean {
    if (attempt >= this.retryConfig.maxRetries) {
      return false;
    }
    
    if (error instanceof McpError) {
      // Retry server errors and some network errors
      if (error.code === ErrorCode.InternalError) {
        const data = error.data || {};
        return data.retryable === true || 
               data.status >= 500 ||
               ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'].includes(data.code);
      }
    }
    
    // Retry network errors
    return ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND'].includes(error.code);
  }
  
  private calculateDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(2, attempt);
    return Math.min(delay, this.retryConfig.maxDelay);
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### SSE Transport Error Handling

```typescript
class SSETransportHandler {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnects = 5;
  private baseReconnectDelay = 1000;
  
  async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.eventSource = new EventSource(url);
        
        this.eventSource.onopen = () => {
          console.log('SSE connection established');
          this.reconnectAttempts = 0; // Reset on successful connection
          resolve();
        };
        
        this.eventSource.onerror = (event) => {
          console.error('SSE connection error:', event);
          this.handleConnectionError(event, reject);
        };
        
        this.eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Failed to parse SSE message:', error);
            this.handleParseError(error, event.data);
          }
        };
        
        // Set up custom event handlers
        this.setupCustomEventHandlers();
        
      } catch (error) {
        reject(new McpError(
          ErrorCode.InternalError,
          `Failed to establish SSE connection: ${error.message}`,
          { url, error: error.message }
        ));
      }
    });
  }
  
  private handleConnectionError(event: Event, reject?: (error: Error) => void): void {
    const readyState = this.eventSource?.readyState;
    
    let errorMessage = "SSE connection error";
    let shouldReconnect = false;
    
    switch (readyState) {
      case EventSource.CONNECTING:
        errorMessage = "SSE connection failed during handshake";
        shouldReconnect = true;
        break;
        
      case EventSource.CLOSED:
        errorMessage = "SSE connection closed unexpectedly";
        shouldReconnect = true;
        break;
        
      default:
        errorMessage = "Unknown SSE connection error";
        shouldReconnect = true;
    }
    
    const error = new McpError(
      ErrorCode.InternalError,
      errorMessage,
      {
        readyState,
        reconnectAttempts: this.reconnectAttempts,
        maxReconnects: this.maxReconnects
      }
    );
    
    if (reject) {
      reject(error);
      return;
    }
    
    if (shouldReconnect && this.reconnectAttempts < this.maxReconnects) {
      this.attemptReconnect();
    } else {
      this.handleFinalConnectionFailure(error);
    }
  }
  
  private async attemptReconnect(): Promise<void> {
    this.reconnectAttempts++;
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );
    
    console.log(`Attempting SSE reconnect ${this.reconnectAttempts}/${this.maxReconnects} in ${delay}ms`);
    
    // Close existing connection
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    setTimeout(async () => {
      try {
        await this.connect(this.getConnectionUrl());
      } catch (error) {
        console.error(`SSE reconnect attempt ${this.reconnectAttempts} failed:`, error);
        if (this.reconnectAttempts < this.maxReconnects) {
          this.attemptReconnect();
        } else {
          this.handleFinalConnectionFailure(error);
        }
      }
    }, delay);
  }
  
  private handleParseError(error: Error, rawData: string): void {
    console.error('SSE message parse error:', {
      error: error.message,
      rawData: rawData.substring(0, 200) + (rawData.length > 200 ? '...' : ''),
      timestamp: new Date().toISOString()
    });
    
    // Could emit an error event or store for debugging
    this.emit('parseError', {
      error: error.message,
      rawData,
      timestamp: new Date().toISOString()
    });
  }
  
  private setupCustomEventHandlers(): void {
    if (!this.eventSource) return;
    
    // Handle JSON-RPC responses
    this.eventSource.addEventListener('response', (event: MessageEvent) => {
      try {
        const response = JSON.parse(event.data);
        this.handleResponse(response);
      } catch (error) {
        this.handleParseError(error, event.data);
      }
    });
    
    // Handle JSON-RPC requests from server
    this.eventSource.addEventListener('request', (event: MessageEvent) => {
      try {
        const request = JSON.parse(event.data);
        this.handleServerRequest(request);
      } catch (error) {
        this.handleParseError(error, event.data);
      }
    });
    
    // Handle server notifications
    this.eventSource.addEventListener('notification', (event: MessageEvent) => {
      try {
        const notification = JSON.parse(event.data);
        this.handleNotification(notification);
      } catch (error) {
        this.handleParseError(error, event.data);
      }
    });
  }
  
  private handleMessage(data: any): void {
    // Handle different message types
    if (data.id && data.result !== undefined) {
      this.handleResponse(data);
    } else if (data.id && data.error !== undefined) {
      this.handleErrorResponse(data);
    } else if (data.method && data.id !== undefined) {
      this.handleServerRequest(data);
    } else if (data.method && data.id === undefined) {
      this.handleNotification(data);
    } else {
      console.warn('Unknown SSE message format:', data);
    }
  }
  
  private handleResponse(response: any): void {
    // Handle successful responses
    this.emit('response', response);
  }
  
  private handleErrorResponse(errorResponse: any): void {
    // Handle error responses
    const error = new McpError(
      errorResponse.error.code,
      errorResponse.error.message,
      errorResponse.error.data
    );
    
    this.emit('error', error, errorResponse.id);
  }
  
  private handleServerRequest(request: any): void {
    // Handle requests from server
    this.emit('request', request);
  }
  
  private handleNotification(notification: any): void {
    // Handle notifications from server
    this.emit('notification', notification);
  }
  
  private handleFinalConnectionFailure(error: Error): void {
    console.error('SSE connection failed permanently:', error);
    this.emit('connectionFailed', error);
  }
  
  private getConnectionUrl(): string {
    // Return the URL used for connection
    // Implementation specific
    return '';
  }
  
  private emit(event: string, ...args: any[]): void {
    // Event emitter implementation
    // Could use Node.js EventEmitter or custom implementation
  }
  
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.reconnectAttempts = 0;
  }
}
```

### WebSocket Transport Errors

```typescript
class WebSocketTransportHandler {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnects = 5;
  private pingInterval: NodeJS.Timeout | null = null;
  private pongTimeout: NodeJS.Timeout | null = null;
  
  async connect(url: string, protocols?: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url, protocols);
        
        this.ws.onopen = () => {
          console.log('WebSocket connection established');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };
        
        this.ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          this.stopHeartbeat();
          this.handleConnectionClose(event, reject);
        };
        
        this.ws.onerror = (event) => {
          console.error('WebSocket error:', event);
          this.handleConnectionError(event, reject);
        };
        
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            this.handleParseError(error, event.data);
          }
        };
        
      } catch (error) {
        reject(new McpError(
          ErrorCode.InternalError,
          `Failed to create WebSocket connection: ${error.message}`,
          { url, error: error.message }
        ));
      }
    });
  }
  
  private handleConnectionClose(event: CloseEvent, reject?: (error: Error) => void): void {
    const { code, reason } = event;
    let shouldReconnect = false;
    let errorMessage = `WebSocket closed: ${code} ${reason}`;
    
    // Handle different close codes
    switch (code) {
      case 1000: // Normal closure
        errorMessage = "WebSocket closed normally";
        shouldReconnect = false;
        break;
        
      case 1001: // Going away
        errorMessage = "WebSocket closed - endpoint going away";
        shouldReconnect = true;
        break;
        
      case 1002: // Protocol error
        errorMessage = "WebSocket protocol error";
        shouldReconnect = false;
        break;
        
      case 1003: // Unsupported data
        errorMessage = "WebSocket unsupported data received";
        shouldReconnect = false;
        break;
        
      case 1006: // Abnormal closure
        errorMessage = "WebSocket connection lost unexpectedly";
        shouldReconnect = true;
        break;
        
      case 1011: // Server error
        errorMessage = "WebSocket server error";
        shouldReconnect = true;
        break;
        
      case 1012: // Service restart
        errorMessage = "WebSocket service restarting";
        shouldReconnect = true;
        break;
        
      default:
        if (code >= 3000 && code <= 3999) {
          errorMessage = `WebSocket application error: ${code} ${reason}`;
          shouldReconnect = true;
        } else if (code >= 4000 && code <= 4999) {
          errorMessage = `WebSocket private error: ${code} ${reason}`;
          shouldReconnect = false; // Private errors usually shouldn't retry
        } else {
          shouldReconnect = true;
        }
    }
    
    const error = new McpError(
      ErrorCode.InternalError,
      errorMessage,
      {
        code,
        reason,
        wasClean: event.wasClean,
        reconnectAttempts: this.reconnectAttempts,
        shouldReconnect
      }
    );
    
    if (reject) {
      reject(error);
      return;
    }
    
    if (shouldReconnect && this.reconnectAttempts < this.maxReconnects) {
      this.attemptReconnect();
    } else {
      this.handleFinalConnectionFailure(error);
    }
  }
  
  private handleConnectionError(event: Event, reject?: (error: Error) => void): void {
    const error = new McpError(
      ErrorCode.InternalError,
      "WebSocket connection error",
      {
        event: event.type,
        reconnectAttempts: this.reconnectAttempts
      }
    );
    
    if (reject) {
      reject(error);
    } else {
      console.error('WebSocket error:', error);
    }
  }
  
  private startHeartbeat(): void {
    // Send ping every 30 seconds
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
        
        // Set timeout for pong response
        this.pongTimeout = setTimeout(() => {
          console.warn('Pong timeout - connection may be dead');
          this.ws?.close(1006, 'Ping timeout');
        }, 5000);
      }
    }, 30000);
    
    // Handle pong responses
    if (this.ws) {
      this.ws.on('pong', () => {
        if (this.pongTimeout) {
          clearTimeout(this.pongTimeout);
          this.pongTimeout = null;
        }
      });
    }
  }
  
  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }
  
  async sendMessage(message: any): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new McpError(
        ErrorCode.InternalError,
        "WebSocket not connected",
        {
          readyState: this.ws?.readyState,
          expectedState: WebSocket.OPEN
        }
      );
    }
    
    try {
      const data = JSON.stringify(message);
      this.ws.send(data);
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to send WebSocket message: ${error.message}`,
        {
          messageId: message.id,
          method: message.method,
          error: error.message
        }
      );
    }
  }
  
  private async attemptReconnect(): Promise<void> {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`Attempting WebSocket reconnect ${this.reconnectAttempts}/${this.maxReconnects} in ${delay}ms`);
    
    setTimeout(async () => {
      try {
        await this.connect(this.getConnectionUrl());
      } catch (error) {
        console.error(`WebSocket reconnect attempt ${this.reconnectAttempts} failed:`, error);
        if (this.reconnectAttempts < this.maxReconnects) {
          this.attemptReconnect();
        } else {
          this.handleFinalConnectionFailure(error);
        }
      }
    }, delay);
  }
  
  private handleMessage(data: any): void {
    // Handle different message types
    this.emit('message', data);
  }
  
  private handleParseError(error: Error, rawData: string): void {
    console.error('WebSocket message parse error:', {
      error: error.message,
      rawData: rawData.substring(0, 200),
      timestamp: new Date().toISOString()
    });
    
    this.emit('parseError', { error, rawData });
  }
  
  private handleFinalConnectionFailure(error: Error): void {
    console.error('WebSocket connection failed permanently:', error);
    this.emit('connectionFailed', error);
  }
  
  private getConnectionUrl(): string {
    // Return connection URL - implementation specific
    return '';
  }
  
  private emit(event: string, ...args: any[]): void {
    // Event emitter implementation
  }
  
  disconnect(): void {
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    
    this.reconnectAttempts = 0;
  }
}
```

## Transport Error Recovery Patterns

### Circuit Breaker for Transport

```typescript
enum CircuitState {
  Closed = 'closed',
  Open = 'open',
  HalfOpen = 'half-open'
}

class TransportCircuitBreaker {
  private state = CircuitState.Closed;
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;
  
  constructor(
    private failureThreshold = 5,
    private timeout = 60000, // 1 minute
    private successThreshold = 3
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.Open) {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = CircuitState.HalfOpen;
        this.successCount = 0;
      } else {
        throw new McpError(
          ErrorCode.InternalError,
          "Transport circuit breaker is open",
          {
            state: this.state,
            failureCount: this.failureCount,
            timeUntilRetry: Math.max(0, this.timeout - (Date.now() - this.lastFailureTime))
          }
        );
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitState.HalfOpen) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = CircuitState.Closed;
      }
    }
  }
  
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.Open;
    }
  }
  
  getState(): { state: CircuitState; failureCount: number; successCount: number } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount
    };
  }
}
```

## Best Practices Summary

### Connection Management
- Implement proper connection lifecycle handling
- Use heartbeat/ping-pong for connection health monitoring
- Handle reconnection with exponential backoff
- Set appropriate timeouts for different operations

### Error Categorization
- Distinguish between retryable and non-retryable errors
- Implement proper error codes for different failure types
- Provide context and suggestions in error messages
- Log errors with sufficient detail for debugging

### Resilience Patterns
- Circuit breaker for preventing cascade failures
- Retry with exponential backoff for transient errors
- Connection pooling for HTTP transports
- Graceful degradation when transport fails

### Monitoring and Observability
- Track connection metrics and error rates
- Log transport events with structured data
- Implement health checks and status endpoints
- Set up alerts for transport failures

This comprehensive guide ensures robust transport layer error handling in MCP applications across different communication protocols.