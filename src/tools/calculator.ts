/**
 * Calculator Tool Implementation
 * 
 * This module implements a simple addition calculator tool for the MCP server.
 * Demonstrates proper input validation, error handling, and response formatting.
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { CalculatorAddSchema, type CalculatorAddInput } from '../schemas/calculator.js';
import { type ToolDefinition } from '../types/tools.js';
import { createInternalError, isMcpError } from '../utils/errors.js';

/**
 * Addition tool implementation with comprehensive error handling
 * 
 * @param params - Validated input parameters
 * @returns Tool result with addition calculation
 */
async function executeAddition(params: CalculatorAddInput): Promise<CallToolResult> {
  try {
    // SECURITY: Zod validation happens at the server level before this function
    // At this point, params are guaranteed to be valid CalculatorAddInput type
    const { a, b } = params;
    
    // GOTCHA: Handle edge cases that Zod might miss (defensive programming)
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Numbers must be finite values (no NaN or Infinity)'
      );
    }
    
    // Perform the addition
    const result = a + b;
    
    // GOTCHA: Check for overflow - JavaScript can produce Infinity for large numbers
    if (!Number.isFinite(result)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Result overflow: numbers too large to add safely'
      );
    }
    
    // Return successful result in MCP format
    return {
      content: [
        {
          type: 'text',
          text: `${a} + ${b} = ${result}`
        }
      ]
    };
    
  } catch (error) {
    // GOTCHA: Distinguish between McpError (protocol errors) and unexpected errors
    if (isMcpError(error)) {
      // Re-throw McpError instances (these are expected/handled errors)
      throw error;
    }
    
    // Log unexpected errors for debugging (but don't expose details to client)
    console.error('Unexpected error in calculator_add tool:', error);
    
    // Wrap unexpected errors in InternalError
    throw createInternalError(
      'An unexpected error occurred during calculation',
      error
    );
  }
}

/**
 * Calculator Addition Tool Definition
 * 
 * Defines the complete tool with metadata and execution function
 */
export const calculatorTool: ToolDefinition<CalculatorAddInput> = {
  name: 'calculator_add',
  description: 'Add two numbers together and return the result. Supports integers and decimal numbers within safe bounds.',
  inputSchema: CalculatorAddSchema,
  execute: executeAddition,
};

/**
 * Example usage:
 * 
 * Input: { a: 5, b: 3 }
 * Output: { content: [{ type: 'text', text: '5 + 3 = 8' }] }
 * 
 * Input: { a: 1.5, b: 2.7 }
 * Output: { content: [{ type: 'text', text: '1.5 + 2.7 = 4.2' }] }
 * 
 * Input: { a: "invalid", b: 3 }
 * Output: McpError with InvalidParams code
 */