/**
 * Calculator Tool Validation Schemas
 * 
 * This module contains Zod schemas for validating calculator tool inputs.
 * Security-first approach with comprehensive validation to prevent attacks.
 */

import { z } from 'zod';

/**
 * Safe Number Schema with comprehensive validation
 * 
 * Prevents common security issues:
 * - NaN/Infinity injection
 * - JSON precision issues  
 * - DoS attacks via large numbers
 * - Integer overflow/underflow
 */
const SafeNumberSchema = z.number()
  .finite('Number must be finite (no NaN or Infinity)')
  .safe('Number must be within safe integer range')
  .min(-1e10, 'Number too small (must be >= -10,000,000,000)')
  .max(1e10, 'Number too large (must be <= 10,000,000,000)')
  // GOTCHA: Additional refinement to prevent JSON precision issues
  .refine(
    (n) => Number.isFinite(n) && !Number.isNaN(n), 
    'Invalid number format'
  );

/**
 * Calculator Addition Input Schema
 * 
 * Validates inputs for the calculator_add tool.
 * Uses strict validation to reject unknown properties.
 */
export const CalculatorAddSchema = z.object({
  a: SafeNumberSchema.describe('First number to add'),
  b: SafeNumberSchema.describe('Second number to add'),
}).strict(); // SECURITY: Reject unknown properties

/**
 * TypeScript type inferred from the schema
 * This ensures type safety between validation and implementation
 */
export type CalculatorAddInput = z.infer<typeof CalculatorAddSchema>;

/**
 * Example usage:
 * 
 * const result = CalculatorAddSchema.parse({ a: 5, b: 3 });
 * // result is typed as { a: number, b: number }
 * 
 * const invalidResult = CalculatorAddSchema.parse({ a: "hello", b: 3 });
 * // throws ZodError with detailed validation message
 */