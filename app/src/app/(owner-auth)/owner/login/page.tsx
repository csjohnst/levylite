'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function OwnerLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [magicLinkLoading, setMagicLinkLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    router.push('/owner')
  }

  async function handleMagicLink() {
    if (!email) {
      setError('Please enter your email address first.')
      return
    }
    setError(null)
    setMagicLinkLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/owner`,
      },
    })

    // F14: Use generic message for both success and "signups not allowed" error
    // to prevent account enumeration. Only show specific message for rate limits.
    if (error) {
      if (error.message.includes('rate limit')) {
        setError(
          'Too many login attempts. Please try again in a few minutes.'
        )
        setMagicLinkLoading(false)
        return
      }
      // For "signups not allowed" or other errors, show generic success message
    }
    setMagicLinkSent(true)
    setMagicLinkLoading(false)
  }

  if (magicLinkSent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            If this email is associated with an account, a login link has been sent
            to <strong>{email}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The link will expire in 1 hour. If you don&apos;t see the email,
            check your spam folder.
          </p>
        </CardContent>
        <CardFooter>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setMagicLinkSent(false)}
          >
            Back to login
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Owner Portal</CardTitle>
        <CardDescription>
          Sign in to view your strata scheme information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleMagicLink}
          disabled={magicLinkLoading}
        >
          {magicLinkLoading ? 'Sending...' : 'Send me a login link instead'}
        </Button>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Are you a strata manager?{' '}
          <Link
            href="/login"
            className="text-primary underline-offset-4 hover:underline"
          >
            Log in here
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
