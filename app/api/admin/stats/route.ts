// Example admin-only API route with rate limiting
// Demonstrates RBAC enforcement and admin operations

import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/rbac'
import { logger } from '@/lib/logger'

// GET /api/admin/stats - Get platform statistics (admin only)
async function getStats(request: NextRequest, { auth }: { auth?: any }) {
  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }

  requireAdmin(auth)

  // Get statistics in parallel for performance
  const [
    totalUsers,
    activeSubscriptions,
    totalRevenue,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count({
      where: { status: 'ACTIVE' },
    }),
    // In production, calculate from Stripe or transaction table
    Promise.resolve(0),
    prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    }),
  ])

  logger.info('Admin stats fetched', { adminId: auth.user.id })

  return NextResponse.json({
    stats: {
      totalUsers,
      activeSubscriptions,
      totalRevenue,
      recentUsers,
    },
  })
}

export const GET = createApiHandler(getStats, {
  requireAuth: true,
  rateLimit: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  },
})

