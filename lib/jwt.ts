import jwt from 'jsonwebtoken'

// JWT configuration
// Tradeoff: Using separate access and refresh tokens.
// Access tokens are short-lived (15min) for security, refresh tokens are long-lived (7 days).
// This prevents long-lived access tokens from being compromised while allowing seamless UX.
const JWT_SECRET = process.env.JWT_SECRET!
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!
const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '7d'

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set in environment variables')
}

export interface JWTPayload {
  userId: string
  email: string
  role: string
}

// Generate access token (short-lived)
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  })
}

// Generate refresh token (long-lived)
export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  })
}

// Verify access token
export function verifyAccessToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch (error) {
    throw new Error('Invalid or expired access token')
  }
}

// Verify refresh token
export function verifyRefreshToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload
  } catch (error) {
    throw new Error('Invalid or expired refresh token')
  }
}

