import { createHmac, timingSafeEqual } from 'crypto'

const EXPIRY_MS = 48 * 60 * 60 * 1000 // 48 hours

interface ActivationPayload {
  ownerId: string
  portalUserId: string
  ts: number
}

function getSecret(): string {
  const secret = process.env.ACTIVATION_TOKEN_SECRET
  if (!secret) {
    throw new Error('ACTIVATION_TOKEN_SECRET environment variable is not set')
  }
  return secret
}

function sign(data: string): string {
  const hmac = createHmac('sha256', getSecret())
  hmac.update(data)
  return hmac.digest('base64url')
}

export function createActivationToken(ownerId: string, portalUserId: string): string {
  const payload = JSON.stringify({ ownerId, portalUserId, ts: Date.now() })
  const encodedPayload = Buffer.from(payload).toString('base64url')
  const signature = sign(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export function verifyActivationToken(token: string): ActivationPayload {
  const dotIndex = token.indexOf('.')
  if (dotIndex === -1) {
    throw new Error('Invalid token format')
  }

  const encodedPayload = token.substring(0, dotIndex)
  const providedSignature = token.substring(dotIndex + 1)

  // Verify HMAC signature using timing-safe comparison
  const expectedSignature = sign(encodedPayload)

  const providedBuffer = Buffer.from(providedSignature, 'base64url')
  const expectedBuffer = Buffer.from(expectedSignature, 'base64url')

  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    throw new Error('Invalid token signature')
  }

  // Decode payload
  let payload: ActivationPayload
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'))
  } catch {
    throw new Error('Invalid token payload')
  }

  if (!payload.ownerId || !payload.portalUserId) {
    throw new Error('Invalid token payload: missing required fields')
  }

  // Check expiry (48 hours)
  if (payload.ts && Date.now() - payload.ts > EXPIRY_MS) {
    throw new Error('Activation link has expired. Please contact your strata manager.')
  }

  return payload
}
