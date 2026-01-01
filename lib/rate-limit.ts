// Simple in-memory rate limiting
// Tradeoff: In-memory is simple but doesn't work across multiple servers.
// For production with multiple instances, use Redis or a distributed cache.
interface RateLimitStore {
  [key: string]: {
    count: number
    resetAt: number
  }
}

const store: RateLimitStore = {}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach((key) => {
    if (store[key].resetAt < now) {
      delete store[key]
    }
  })
}, 60000) // Clean every minute

export interface RateLimitOptions {
  maxRequests: number
  windowMs: number
}

// Check rate limit for a given identifier (e.g., IP address, user ID)
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = store[identifier]

  // No entry or window expired - create new entry
  if (!entry || entry.resetAt < now) {
    store[identifier] = {
      count: 1,
      resetAt: now + options.windowMs,
    }
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetAt: now + options.windowMs,
    }
  }

  // Entry exists and within window
  if (entry.count >= options.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  // Increment count
  entry.count++
  return {
    allowed: true,
    remaining: options.maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

// Rate limit middleware helper
export function rateLimit(options: RateLimitOptions) {
  return (identifier: string) => {
    return checkRateLimit(identifier, options)
  }
}

