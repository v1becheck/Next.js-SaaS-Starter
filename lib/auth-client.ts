// Client-side auth utilities
// Tradeoff: Storing tokens in localStorage for simplicity.
// Alternative: httpOnly cookies (more secure but requires server-side handling)

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

const TOKEN_KEY = 'auth_tokens'
const USER_KEY = 'auth_user'

export function setAuthTokens(tokens: AuthTokens): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens))
}

export function getAuthTokens(): AuthTokens | null {
  const stored = localStorage.getItem(TOKEN_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

export function clearAuthTokens(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function setUser(user: any): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getUser(): any | null {
  const stored = localStorage.getItem(USER_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

// Get access token for API calls
export function getAccessToken(): string | null {
  const tokens = getAuthTokens()
  return tokens?.accessToken || null
}

// Refresh access token using refresh token
export async function refreshAccessToken(): Promise<string | null> {
  const tokens = getAuthTokens()
  if (!tokens?.refreshToken) return null

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    })

    if (!response.ok) {
      clearAuthTokens()
      return null
    }

    const data = await response.json()
    setAuthTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    })

    return data.accessToken
  } catch (error) {
    clearAuthTokens()
    return null
  }
}

// Make authenticated API request with automatic token refresh
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let accessToken = getAccessToken()

  if (!accessToken) {
    accessToken = await refreshAccessToken()
  }

  if (!accessToken) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  })

  // If token expired, try refreshing once
  if (response.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
        },
      })
    }
    clearAuthTokens()
    throw new Error('Authentication failed')
  }

  return response
}

