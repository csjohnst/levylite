/**
 * Shared password validation for signup and owner activation flows.
 * Requirements: minimum 12 characters, at least one uppercase, one lowercase, one digit.
 */

export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_HINT = 'Minimum 12 characters with uppercase, lowercase, and a number'

export interface PasswordValidationResult {
  valid: boolean
  message: string
}

export function validatePassword(password: string): PasswordValidationResult {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    }
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter.',
    }
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one lowercase letter.',
    }
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one digit.',
    }
  }

  return { valid: true, message: '' }
}
