/**
 * Validation Utilities
 * 
 * This module provides utility functions for validating
 * tool inputs and handling validation errors.
 */

import { z } from 'zod';
import { handleZodError } from './errors.js';

/**
 * Validate tool input using a Zod schema
 * 
 * @template T - The expected input type
 * @param schema - Zod schema to validate against
 * @param input - Input to validate
 * @returns Validated and typed input
 * @throws McpError if validation fails
 */
export function validateToolInput<T>(schema: z.ZodSchema<T>, input: unknown): T {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw handleZodError(error);
    }
    throw error;
  }
}

/**
 * Safe validation that returns a result object instead of throwing
 * 
 * @template T - The expected input type
 * @param schema - Zod schema to validate against
 * @param input - Input to validate
 * @returns Validation result with success flag and data/error
 */
export function safeValidateToolInput<T>(
  schema: z.ZodSchema<T>, 
  input: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = schema.parse(input);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      if (!firstIssue) {
        return { success: false, error: 'Unknown validation error' };
      }
      const path = firstIssue.path.length > 0 ? ` at '${firstIssue.path.join('.')}'` : '';
      return { 
        success: false, 
        error: `${firstIssue.message}${path}` 
      };
    }
    return { 
      success: false, 
      error: 'Unknown validation error' 
    };
  }
}

/**
 * Check if a value is a safe number (finite, not NaN, within bounds)
 * 
 * @param value - Value to check
 * @param min - Minimum allowed value (default: -1e10)
 * @param max - Maximum allowed value (default: 1e10)
 * @returns True if the value is a safe number
 */
export function isSafeNumber(
  value: unknown, 
  min: number = -1e10, 
  max: number = 1e10
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    !Number.isNaN(value) &&
    value >= min &&
    value <= max
  );
}