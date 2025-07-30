/**
 * Tool Type Definitions
 * 
 * This module defines TypeScript interfaces for MCP tools,
 * providing type safety for tool implementations.
 */

import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Generic tool function interface
 * 
 * @template T - The input type (inferred from Zod schema)
 */
export interface ToolFunction<T = unknown> {
  (params: T): Promise<CallToolResult>;
}

/**
 * Tool definition interface
 * 
 * Defines the structure of an MCP tool with schema validation
 */
export interface ToolDefinition<T = unknown> {
  /** Unique tool name */
  name: string;
  
  /** Human-readable description */
  description: string;
  
  /** Zod schema for input validation */
  inputSchema: z.ZodSchema<T>;
  
  /** Tool execution function */
  execute: ToolFunction<T>;
}

/**
 * Tool registry type
 * 
 * Maps tool names to their definitions
 */
export type ToolRegistry = Record<string, ToolDefinition>;

/**
 * Tool execution context
 * 
 * Provides additional context during tool execution
 */
export interface ToolContext {
  /** Tool name being executed */
  toolName: string;
  
  /** Timestamp of execution */
  timestamp: Date;
  
  /** Optional request metadata */
  metadata?: Record<string, unknown>;
}