import { AuthContext } from './auth'

// Role-based access control utilities
// Tradeoff: Simple enum-based roles. For complex permissions, consider a permission matrix.
export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

// Check if user has required role
export function hasRole(auth: AuthContext, requiredRole: Role): boolean {
  return auth.user.role === requiredRole
}

// Require specific role - throws if user doesn't have it
export function requireRole(auth: AuthContext, requiredRole: Role): void {
  if (!hasRole(auth, requiredRole)) {
    throw new Error('Forbidden: Insufficient permissions')
  }
}

// Check if user is admin
export function isAdmin(auth: AuthContext): boolean {
  return hasRole(auth, Role.ADMIN)
}

// Require admin role
export function requireAdmin(auth: AuthContext): void {
  requireRole(auth, Role.ADMIN)
}

