import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createPortalSession } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const auth = await requireAuth(request)

    // Get user's subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId: auth.user.id },
    })

    if (!subscription || !subscription.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      )
    }

    // Create portal session
    const session = await createPortalSession(
      subscription.stripeCustomerId,
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    )

    return NextResponse.json({
      url: session.url,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Portal error:', error)
    return NextResponse.json(
      { error: 'An error occurred creating portal session' },
      { status: 500 }
    )
  }
}

