// Shared Zod validation schemas
// Tradeoff: Centralizing schemas allows reuse and consistency.
// Alternative: Inline schemas (more flexible but less consistent).

import { z } from 'zod'

// Email validation
export const emailSchema = z.string().email('Invalid email address').toLowerCase().trim()

// Password validation - production requirements
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

// Name validation
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .trim()

// Common pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// Common query parameters
export const querySchema = z.object({
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

// Auth schemas
export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

// Stripe schemas
export const checkoutSchema = z.object({
  planType: z.enum(['monthly', 'yearly']),
})

// Feature flag schemas
export const setFeatureFlagSchema = z.object({
  userId: z.string().cuid('Invalid user ID'),
  flagKey: z.string().min(1).max(100),
  enabled: z.boolean(),
})

// Helper to validate and throw custom error
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Validation failed', error.errors)
    }
    throw error
  }
}

import { ValidationError } from './errors'

