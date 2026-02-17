'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type ActivationState = 'loading' | 'ready' | 'activating' | 'success' | 'error'

export default function OwnerActivatePage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      }
    >
      <OwnerActivateContent />
    </Suspense>
  )
}

function OwnerActivateContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [state, setState] = useState<ActivationState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    if (!token) {
      setError('Invalid activation link. Please contact your strata manager.')
      setState('error')
      return
    }

    try {
      // base64url → base64 → decode (browser-safe, no Node Buffer needed)
      const base64 = token.replace(/-/g, '+').replace(/_/g, '/')
      const decoded = JSON.parse(atob(base64))
      if (!decoded.ownerId || !decoded.portalUserId) {
        throw new Error('Invalid token')
      }
      // Check if token is older than 7 days
      if (decoded.ts && Date.now() - decoded.ts > 7 * 24 * 60 * 60 * 1000) {
        setError(
          'This activation link has expired. Please contact your strata manager to request a new one.'
        )
        setState('error')
        return
      }
      setState('ready')
    } catch {
      setError('Invalid activation link. Please contact your strata manager.')
      setState('error')
    }
  }, [token])

  async function handleActivate() {
    if (!token) return
    setState('activating')

    try {
      const response = await fetch('/api/owner/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Activation failed')
      }

      setOwnerEmail(result.email)

      // Send magic link for first login
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: result.email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/owner`,
        },
      })

      if (otpError) {
        // Activation succeeded but login link failed - still show success
        console.error('[activate] Failed to send login link:', otpError)
      }

      setState('success')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Activation failed. Please contact your strata manager.'
      )
      setState('error')
    }
  }

  if (state === 'loading') {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Validating activation link...</p>
        </CardContent>
      </Card>
    )
  }

  if (state === 'error') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activation Failed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline" className="w-full">
            <Link href="/owner/login">Go to Login</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (state === 'success') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Activated</CardTitle>
          <CardDescription>
            Your owner portal account has been activated successfully.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {ownerEmail
              ? `A login link has been sent to ${ownerEmail}. Check your email to sign in.`
              : 'Check your email for a login link to sign in.'}
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/owner/login">Go to Login</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activate Your Account</CardTitle>
        <CardDescription>
          Click below to activate your owner portal account and receive a login
          link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Once activated, you will be able to view your levy statements, access
          scheme documents, submit maintenance requests, and more.
        </p>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleActivate}
          className="w-full"
          disabled={state === 'activating'}
        >
          {state === 'activating' ? 'Activating...' : 'Confirm and Activate'}
        </Button>
      </CardFooter>
    </Card>
  )
}
