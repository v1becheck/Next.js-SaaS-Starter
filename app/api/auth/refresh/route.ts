import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from '@/lib/jwt'
import { createApiHandler } from '@/lib/api-handler'
import { validate, refreshTokenSchema } from '@/lib/validation'
import { AuthenticationError } from '@/lib/errors'
import { logger } from '@/lib/logger'

async function refresh(request: NextRequest) {
  const body = await request.json()
  const { refreshToken } = validate(refreshTokenSchema, body)

    // Verify refresh token
    let payload
    try {
      payload = verifyRefreshToken(refreshToken)
    } catch (error) {
      throw new AuthenticationError('Invalid or expired refresh token')
    }

    // Verify token exists in database (allows revocation)
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    })

    if (!storedToken || storedToken.expiresAt < new Date()) {
      // Clean up expired token
      if (storedToken) {
        await prisma.refreshToken.delete({
          where: { id: storedToken.id },
        })
      }
      throw new AuthenticationError('Invalid or expired refresh token')
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken({
      userId: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
    })

    const newRefreshToken = generateRefreshToken({
      userId: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
    })

    // Delete old refresh token (token rotation for security)
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    })

    // Store new refresh token
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: storedToken.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    logger.info('Token refreshed', { userId: storedToken.user.id })

    return NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    })
}

export const POST = createApiHandler(refresh, {
  rateLimit: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  },
})

