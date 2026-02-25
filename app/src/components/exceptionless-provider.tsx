'use client'

import { useEffect } from 'react'
import { Exceptionless } from '@exceptionless/browser'

export function ExceptionlessProvider() {
  useEffect(() => {
    Exceptionless.startup((c) => {
      c.apiKey = process.env.NEXT_PUBLIC_EXCEPTIONLESS_API_KEY!
      c.serverUrl = process.env.NEXT_PUBLIC_EXCEPTIONLESS_SERVER_URL!
    })
  }, [])

  return null
}
