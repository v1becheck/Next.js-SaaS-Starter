// Example API route with authentication, rate limiting, and validation
// Demonstrates production-ready API route patterns

import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { validate, paginationSchema, querySchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/rbac'
import { logger } from '@/lib/logger'

// GET /api/users - List users (admin only)
async function getUsers(request: NextRequest, { auth }: { auth?: any }) {
  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }

  requireAdmin(auth)

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams
  const pagination = validate(paginationSchema, {
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
  })

  const query = validate(querySchema, {
    search: searchParams.get('search'),
    sortBy: searchParams.get('sortBy'),
    sortOrder: searchParams.get('sortOrder'),
  })

  // Build Prisma query
  const where = query.search
    ? {
        OR: [
          { email: { contains: query.search, mode: 'insensitive' as const } },
          { name: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      orderBy: query.sortBy
        ? { [query.sortBy]: query.sortOrder }
        : { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ])

  logger.info('Users fetched', {
    count: users.length,
    total,
    page: pagination.page,
    adminId: auth.user.id,
  })

  return NextResponse.json({
    users,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  })
}

// Export handlers with middleware
export const GET = createApiHandler(getUsers, {
  requireAuth: true,
  rateLimit: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
})

