// Example API route for user operations
// Demonstrates parameter validation and error handling

import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { validate, nameSchema, emailSchema } from '@/lib/validation'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/rbac'
import { NotFoundError } from '@/lib/errors'
import { z } from 'zod'

// GET /api/users/[id] - Get user by ID
async function getUser(request: NextRequest, { auth }: { auth?: any }) {
  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }

  const userId = request.nextUrl.pathname.split('/').pop()
  
  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  // Users can only view their own profile unless admin
  if (auth.user.role !== 'ADMIN' && auth.user.id !== userId) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN' },
      { status: 403 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) {
    throw new NotFoundError('User not found')
  }

  return NextResponse.json({ user })
}

// PATCH /api/users/[id] - Update user (admin only or self)
async function updateUser(request: NextRequest, { auth }: { auth?: any }) {
  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }

  const userId = request.nextUrl.pathname.split('/').pop()
  
  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  // Users can only update their own profile unless admin
  if (auth.user.role !== 'ADMIN' && auth.user.id !== userId) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN' },
      { status: 403 }
    )
  }

  const body = await request.json()
  
  // Validate update data
  const updateSchema = z.object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
  })

  const updateData = validate(updateSchema, body)

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!existingUser) {
    throw new NotFoundError('User not found')
  }

  // Check email uniqueness if updating email
  if (updateData.email && updateData.email !== existingUser.email) {
    const emailExists = await prisma.user.findUnique({
      where: { email: updateData.email },
    })

    if (emailExists) {
      return NextResponse.json(
        { error: 'Email already in use', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({ user: updatedUser })
}

export const GET = createApiHandler(getUser, {
  requireAuth: true,
  rateLimit: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
  },
})

export const PATCH = createApiHandler(updateUser, {
  requireAuth: true,
  rateLimit: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  },
})

