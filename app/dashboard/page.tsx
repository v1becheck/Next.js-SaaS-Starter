'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUser, clearAuthTokens, authenticatedFetch } from '@/lib/auth-client'
import Link from 'next/link'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) {
      router.push('/auth/login')
      return
    }

    setUser(currentUser)
    loadSubscription()
  }, [router])

  const loadSubscription = async () => {
    try {
      const response = await authenticatedFetch('/api/subscription')
      if (response.ok) {
        const data = await response.json()
        setSubscription(data.subscription)
      }
    } catch (error) {
      console.error('Failed to load subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    clearAuthTokens()
    router.push('/auth/login')
  }

  const handleSubscribe = async (planType: 'monthly' | 'yearly') => {
    try {
      const response = await authenticatedFetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType }),
      })

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Failed to create checkout:', error)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
              <p className="text-gray-600">
                Welcome, {user?.name || user?.email}!
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Logout
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4">Subscription</h2>
            {subscription ? (
              <div>
                <p>Status: {subscription.status}</p>
                {subscription.currentPeriodEnd && (
                  <p>
                    Current period ends:{' '}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                )}
                <button
                  onClick={async () => {
                    const response = await authenticatedFetch('/api/stripe/portal', {
                      method: 'POST',
                    })
                    const data = await response.json()
                    if (data.url) {
                      window.location.href = data.url
                    }
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Manage Subscription
                </button>
              </div>
            ) : (
              <div>
                <p className="mb-4">No active subscription</p>
                <div className="flex gap-4">
                  <button
                    onClick={() => handleSubscribe('monthly')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Subscribe Monthly
                  </button>
                  <button
                    onClick={() => handleSubscribe('yearly')}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Subscribe Yearly
                  </button>
                </div>
              </div>
            )}
          </div>

          {user?.role === 'ADMIN' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold mb-4">Admin Panel</h2>
              <p className="text-gray-600">Admin features go here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
