import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { generateAccessToken, generateRefreshToken } from '@/lib/jwt'
import { createApiHandler } from '@/lib/api-handler'
import { validate, registerSchema } from '@/lib/validation'
import { ValidationError } from '@/lib/errors'
import { logger } from '@/lib/logger'

async function register(request: NextRequest) {
  const body = await request.json()
  const { name, email, password } = validate(registerSchema, body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new ValidationError('User with this email already exists')
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'USER',
      },
    })

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

    logger.info('User registered', { userId: user.id, email: user.email })

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
      { status: 201 }
    )
}

export const POST = createApiHandler(register, {
  rateLimit: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
})

