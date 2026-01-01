import Stripe from 'stripe'
import { prisma } from './prisma'

// Stripe client initialization
// Tradeoff: Using Stripe SDK for type safety and webhook verification.
// Ensure STRIPE_SECRET_KEY is set in environment variables.
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY must be set in environment variables')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
})

// Subscription plan configuration
// Tradeoff: Hardcoded price IDs. In production, store these in database for flexibility.
export const SUBSCRIPTION_PLANS = {
  monthly: {
    priceId: process.env.STRIPE_MONTHLY_PRICE_ID!,
    name: 'Monthly',
    interval: 'month' as const,
  },
  yearly: {
    priceId: process.env.STRIPE_YEARLY_PRICE_ID!,
    name: 'Yearly',
    interval: 'year' as const,
  },
} as const

// Create or get Stripe customer for user
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string
): Promise<string> {
  // Check if user already has a Stripe customer ID
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  })

  if (subscription?.stripeCustomerId) {
    return subscription.stripeCustomerId
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  })

  // Create or update subscription record
  await prisma.subscription.upsert({
    where: { userId },
    update: {
      stripeCustomerId: customer.id,
    },
    create: {
      userId,
      stripeCustomerId: customer.id,
      status: 'INCOMPLETE',
    },
  })

  return customer.id
}

// Create checkout session for subscription
export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  priceId: string,
  planType: 'monthly' | 'yearly'
): Promise<Stripe.Checkout.Session> {
  const customerId = await getOrCreateStripeCustomer(userId, userEmail)

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`,
    metadata: {
      userId,
      planType,
    },
  })

  return session
}

// Create portal session for subscription management
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return session
}

// Sync subscription from Stripe webhook
export async function syncSubscriptionFromStripe(
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = subscription.customer as string

  // Find subscription by customer ID
  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeCustomerId: customerId },
  })

  if (!dbSubscription) {
    console.error(`Subscription not found for customer ${customerId}`)
    return
  }

  // Map Stripe status to our enum
  let status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING' | 'INCOMPLETE'
  switch (subscription.status) {
    case 'active':
      status = 'ACTIVE'
      break
    case 'canceled':
      status = 'CANCELED'
      break
    case 'past_due':
      status = 'PAST_DUE'
      break
    case 'trialing':
      status = 'TRIALING'
      break
    default:
      status = 'INCOMPLETE'
  }

  // Update subscription
  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price.id || null,
      status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  })
}

