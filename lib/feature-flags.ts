import { prisma } from './prisma'

// Feature flag system
// Tradeoff: Per-user flags stored in DB. Simple but requires DB query.
// Alternative: Redis cache for better performance at scale.

// Check if a feature is enabled for a user
export async function isFeatureEnabled(
  userId: string,
  flagKey: string
): Promise<boolean> {
  const flag = await prisma.userFeatureFlag.findUnique({
    where: {
      userId_flagKey: {
        userId,
        flagKey,
      },
    },
  })

  return flag?.enabled ?? false
}

// Set feature flag for a user
export async function setFeatureFlag(
  userId: string,
  flagKey: string,
  enabled: boolean
): Promise<void> {
  await prisma.userFeatureFlag.upsert({
    where: {
      userId_flagKey: {
        userId,
        flagKey,
      },
    },
    update: {
      enabled,
    },
    create: {
      userId,
      flagKey,
      enabled,
    },
  })
}

// Get all feature flags for a user
export async function getUserFeatureFlags(userId: string): Promise<Record<string, boolean>> {
  const flags = await prisma.userFeatureFlag.findMany({
    where: { userId },
  })

  return flags.reduce((acc, flag) => {
    acc[flag.flagKey] = flag.enabled
    return acc
  }, {} as Record<string, boolean>)
}

// Require feature flag - throws if not enabled
export async function requireFeature(
  userId: string,
  flagKey: string
): Promise<void> {
  const enabled = await isFeatureEnabled(userId, flagKey)
  
  if (!enabled) {
    throw new Error(`Feature ${flagKey} is not enabled for this user`)
  }
}

