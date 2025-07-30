/**
 * Tool Registry
 * 
 * This module exports all available MCP tools and provides
 * a registry for tool discovery and execution.
 */

import { calculatorTool } from './calculator.js';

// Export all available tools
export const tools = {
  calculator_add: calculatorTool,
} as const;

// Export individual tools
export { calculatorTool } from './calculator.js';

// Tool registry for MCP server integration
export const toolRegistry = Object.values(tools);