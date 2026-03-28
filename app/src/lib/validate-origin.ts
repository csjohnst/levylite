/**
 * Validates that the request origin matches the app's configured URL.
 * Used for CSRF protection on custom API routes.
 */
export function validateRequestOrigin(request: Request): { valid: boolean; error?: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!appUrl) {
    // In development, skip origin check if NEXT_PUBLIC_APP_URL is not set
    if (process.env.NODE_ENV === 'development') {
      return { valid: true }
    }
    return { valid: false, error: 'NEXT_PUBLIC_APP_URL is not configured' }
  }

  const origin = request.headers.get('origin')

  if (!origin) {
    return { valid: false, error: 'Missing origin header' }
  }

  // Parse both URLs to compare origins (protocol + host)
  try {
    const appOrigin = new URL(appUrl).origin
    const requestOrigin = new URL(origin).origin

    if (appOrigin !== requestOrigin) {
      return { valid: false, error: 'Origin mismatch' }
    }
  } catch {
    return { valid: false, error: 'Invalid origin or app URL' }
  }

  return { valid: true }
}
