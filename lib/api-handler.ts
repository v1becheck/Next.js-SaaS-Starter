// API route handler wrapper with error handling, logging, and rate limiting
// Tradeoff: Wrapper pattern provides consistent error handling and logging.
// Alternative: Manual try-catch in each route (more flexible but repetitive).

import { NextRequest, NextResponse } from 'next/server'
import { handleApiError } from './errors'
import { logger } from './logger'
import { rateLimit, RateLimitOptions } from './rate-limit'
import { getAuthContext } from './auth'

type Handler = (
  request: NextRequest,
  context: { auth?: Awaited<ReturnType<typeof getAuthContext>> }
) => Promise<NextResponse>

interface HandlerOptions {
  requireAuth?: boolean
  rateLimit?: RateLimitOptions
}

export function createApiHandler(
  handler: Handler,
  options: HandlerOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now()
    const method = request.method
    const pathname = request.nextUrl.pathname

    try {
      // Rate limiting
      if (options.rateLimit) {
        const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown'
        const rateLimitResult = rateLimit(options.rateLimit)(ip)

        if (!rateLimitResult.allowed) {
          logger.warn('Rate limit exceeded', { ip, pathname })
          return NextResponse.json(
            {
              error: 'Too many requests',
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
            },
            {
              status: 429,
              headers: {
                'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
                'X-RateLimit-Limit': String(options.rateLimit.maxRequests),
                'X-RateLimit-Remaining': String(rateLimitResult.remaining),
                'X-RateLimit-Reset': String(rateLimitResult.resetAt),
              },
            }
          )
        }
      }

      // Authentication
      let auth = undefined
      if (options.requireAuth) {
        auth = await getAuthContext(request)
        if (!auth) {
          logger.warn('Unauthorized request', { pathname, method })
          return NextResponse.json(
            { error: 'Unauthorized', code: 'UNAUTHORIZED' },
            { status: 401 }
          )
        }
      }

      // Execute handler
      const response = await handler(request, { auth })

      // Log request
      const duration = Date.now() - startTime
      logger.logRequest(method, pathname, response.status, duration, auth?.user.id)

      return response
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('API handler error', error, { method, pathname, duration })
      return handleApiError(error)
    }
  }
}

