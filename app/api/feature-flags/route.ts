import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getUserFeatureFlags, setFeatureFlag } from '@/lib/feature-flags'
import { requireAdmin } from '@/lib/rbac'
import { z } from 'zod'

// Get user's feature flags
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    const flags = await getUserFeatureFlags(auth.user.id)

    return NextResponse.json({ flags })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Get feature flags error:', error)
    return NextResponse.json(
      { error: 'An error occurred fetching feature flags' },
      { status: 500 }
    )
  }
}

// Set feature flag (admin only)
const setFlagSchema = z.object({
  userId: z.string(),
  flagKey: z.string(),
  enabled: z.boolean(),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    requireAdmin(auth)

    const body = await request.json()
    const { userId, flagKey, enabled } = setFlagSchema.parse(body)

    await setFeatureFlag(userId, flagKey, enabled)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    console.error('Set feature flag error:', error)
    return NextResponse.json(
      { error: 'An error occurred setting feature flag' },
      { status: 500 }
    )
  }
}

