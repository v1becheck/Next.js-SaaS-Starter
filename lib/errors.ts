// Custom error classes for better error handling
// Tradeoff: Using custom error classes allows for type-safe error handling
// and consistent error responses across the application.

import { NextResponse } from 'next/server'
import { z } from 'zod'

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public errors?: any[]) {
    super(message, 400, 'VALIDATION_ERROR')
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN')
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND')
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED')
  }
}

// Error handler for API routes
export function handleApiError(error: unknown): NextResponse {
  // Known application errors
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error instanceof ValidationError && error.errors && { errors: error.errors }),
      },
      { status: error.statusCode }
    )
  }

  // Zod validation errors
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: error.errors,
      },
      { status: 400 }
    )
  }

  // Unknown errors - log but don't expose details
  console.error('Unhandled error:', error)
  return NextResponse.json(
    {
      error: 'An internal error occurred',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  )
}

