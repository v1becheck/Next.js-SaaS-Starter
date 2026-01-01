import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { generateAccessToken, generateRefreshToken } from '@/lib/jwt'
import { createApiHandler } from '@/lib/api-handler'
import { validate, loginSchema } from '@/lib/validation'
import { AuthenticationError } from '@/lib/errors'
import { logger } from '@/lib/logger'

async function login(request: NextRequest) {
  const body = await request.json()
  const { email, password } = validate(loginSchema, body)

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user || !user.password) {
      logger.warn('Login attempt with invalid email', { email })
      throw new AuthenticationError('Invalid email or password')
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password)

    if (!isValid) {
      logger.warn('Login attempt with invalid password', { email, userId: user.id })
      throw new AuthenticationError('Invalid email or password')
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    logger.info('User logged in', { userId: user.id, email: user.email })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    })
}

export const POST = createApiHandler(login, {
  rateLimit: {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
})

