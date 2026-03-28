'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PASSWORD_MIN_LENGTH, PASSWORD_HINT } from '@/lib/password-validation'

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
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Invalid activation link. Please contact your strata manager.')
      setState('error')
      return
    }

    // Token is now HMAC-signed — client cannot decode it for validation.
    // Just check it has the expected format (payload.signature).
    if (!token.includes('.')) {
      setError('Invalid activation link. Please contact your strata manager.')
      setState('error')
      return
    }

    setState('ready')
  }, [token])

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return

    setPasswordError(null)

    // F17: Client-side password strength check
    if (password.length < PASSWORD_MIN_LENGTH) {
      setPasswordError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
      return
    }

    if (!/[A-Z]/.test(password)) {
      setPasswordError('Password must contain at least one uppercase letter.')
      return
    }

    if (!/[a-z]/.test(password)) {
      setPasswordError('Password must contain at least one lowercase letter.')
      return
    }

    if (!/[0-9]/.test(password)) {
      setPasswordError('Password must contain at least one digit.')
      return
    }

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setState('activating')

    try {
      const response = await fetch('/api/owner/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Activation failed')
      }

      // Activation succeeded — redirect to login page (auto-login removed
      // because the API no longer returns the email for security reasons)
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
            You can now sign in with your email and password.
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
          Create a password to activate your owner portal account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleActivate} className="space-y-4">
          {passwordError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {passwordError}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder={PASSWORD_HINT}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={PASSWORD_MIN_LENGTH}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={PASSWORD_MIN_LENGTH}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={state === 'activating'}
          >
            {state === 'activating' ? 'Activating...' : 'Activate Account'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Once activated, you can view your levy statements, documents,
          maintenance requests, and more.
        </p>
      </CardFooter>
    </Card>
  )
}
