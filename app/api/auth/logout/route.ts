import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'

// Validation schema
const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const auth = await requireAuth(request)

    const body = await request.json()
    const { refreshToken } = logoutSchema.parse(body)

    // Delete refresh token (revocation)
    await prisma.refreshToken.deleteMany({
      where: {
        token: refreshToken,
        userId: auth.user.id, // Ensure user owns the token
      },
    })

    return NextResponse.json({ message: 'Logged out successfully' })
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

    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    )
  }
}

