/**
 * Error Handling Utilities
 * 
 * This module provides utility functions for handling errors
 * in the MCP server, including Zod validation errors and
 * proper McpError construction.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ZodError } from 'zod';

/**
 * Convert Zod validation error to McpError
 * 
 * @param error - Zod validation error
 * @returns McpError with detailed validation information
 */
export function handleZodError(error: ZodError): McpError {
  const firstIssue = error.issues[0];
  if (!firstIssue) {
    return new McpError(
      ErrorCode.InvalidParams,
      'Validation failed: Unknown error',
      { zodError: error.format(), issues: error.issues }
    );
  }
  
  const path = firstIssue.path.length > 0 ? ` at '${firstIssue.path.join('.')}'` : '';
  const message = `Validation failed: ${firstIssue.message}${path}`;
  
  return new McpError(
    ErrorCode.InvalidParams,
    message,
    { 
      zodError: error.format(),
      issues: error.issues 
    }
  );
}

/**
 * Create a validation error for invalid parameters
 * 
 * @param message - Error message
 * @param field - Optional field name that caused the error
 * @returns McpError with InvalidParams code
 */
export function createValidationError(message: string, field?: string): McpError {
  const fullMessage = field ? `${field}: ${message}` : message;
  
  return new McpError(
    ErrorCode.InvalidParams,
    fullMessage
  );
}

/**
 * Create an internal server error
 * 
 * @param message - Error message for the user
 * @param originalError - Original error (logged but not exposed in production)
 * @returns McpError with InternalError code
 */
export function createInternalError(message: string, originalError?: unknown): McpError {
  // SECURITY: Don't expose internal error details in production
  const isNonProd = process.env.NODE_ENV !== 'production';
  
  // Log the original error for debugging
  if (originalError) {
    console.error('Internal error occurred:', originalError);
  }
  
  return new McpError(
    ErrorCode.InternalError,
    message,
    isNonProd && originalError ? { 
      originalError: originalError instanceof Error ? originalError.message : String(originalError) 
    } : undefined
  );
}

/**
 * Create a method not found error
 * 
 * @param method - The method that was not found
 * @returns McpError with MethodNotFound code
 */
export function createMethodNotFoundError(method: string): McpError {
  return new McpError(
    ErrorCode.MethodNotFound,
    `Method '${method}' not found`
  );
}

/**
 * Type guard to check if an error is an McpError
 * 
 * @param error - Error to check
 * @returns True if the error is an McpError
 */
export function isMcpError(error: unknown): error is McpError {
  return error instanceof McpError;
}