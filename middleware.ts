import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { Role } from '@/lib/rbac'

// Middleware for route protection and RBAC
// Tradeoff: Middleware runs on edge, providing fast auth checks.
// Alternative: Server-side checks in each route (more flexible but slower).

interface RouteConfig {
  auth?: boolean
  roles?: Role[]
}

// Route configuration map
const routeConfig: Record<string, RouteConfig> = {
  '/api/subscription': { auth: true },
  '/api/stripe/checkout': { auth: true },
  '/api/stripe/portal': { auth: true },
  '/api/feature-flags': { auth: true },
  '/api/admin': { auth: true, roles: [Role.ADMIN] },
  '/dashboard': { auth: true },
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Find matching route config
  const config = Object.entries(routeConfig).find(([path]) =>
    pathname.startsWith(path)
  )?.[1]

  // No config means public route
  if (!config || !config.auth) {
    return NextResponse.next()
  }

  // Check authentication
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }

  try {
    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)

    // Verify user exists and get role
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Check role requirements
    if (config.roles && !config.roles.includes(user.role as Role)) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Add user info to request headers for use in API routes
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', user.id)
    requestHeaders.set('x-user-role', user.role)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    '/api/subscription/:path*',
    '/api/stripe/:path*',
    '/api/feature-flags/:path*',
    '/api/admin/:path*',
    '/dashboard/:path*',
  ],
}

