import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Get current user's subscription
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const auth = await requireAuth(request)

    const subscription = await prisma.subscription.findUnique({
      where: { userId: auth.user.id },
    })

    if (!subscription) {
      return NextResponse.json({ subscription: null })
    }

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Get subscription error:', error)
    return NextResponse.json(
      { error: 'An error occurred fetching subscription' },
      { status: 500 }
    )
  }
}

