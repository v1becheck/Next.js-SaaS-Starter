import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createCheckoutSession, SUBSCRIPTION_PLANS } from '@/lib/stripe'
import { z } from 'zod'

// Validation schema
const checkoutSchema = z.object({
  planType: z.enum(['monthly', 'yearly']),
})

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const auth = await requireAuth(request)

    const body = await request.json()
    const { planType } = checkoutSchema.parse(body)

    const plan = SUBSCRIPTION_PLANS[planType]
    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      )
    }

    // Create checkout session
    const session = await createCheckoutSession(
      auth.user.id,
      auth.user.email,
      plan.priceId,
      planType
    )

    return NextResponse.json({
      url: session.url,
    })
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

    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'An error occurred creating checkout session' },
      { status: 500 }
    )
  }
}

