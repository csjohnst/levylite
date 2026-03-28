/**
 * Returns a generic, safe error message for client consumption.
 * Logs the real error details server-side for debugging.
 */
export function getSafeErrorMessage(error: unknown): string {
  // Log the real error server-side
  console.error('[Server Error]', error)

  if (error instanceof Error) {
    const msg = error.message.toLowerCase()

    // Supabase / PostgREST errors that may leak schema info
    if (
      msg.includes('relation') ||
      msg.includes('column') ||
      msg.includes('constraint') ||
      msg.includes('violates') ||
      msg.includes('permission denied') ||
      msg.includes('rls') ||
      msg.includes('policy') ||
      msg.includes('pgrest') ||
      msg.includes('pgrst')
    ) {
      return 'A database error occurred. Please try again or contact support.'
    }

    // Network / connection errors
    if (
      msg.includes('fetch') ||
      msg.includes('network') ||
      msg.includes('econnrefused') ||
      msg.includes('timeout')
    ) {
      return 'A connection error occurred. Please try again.'
    }

    // Storage errors
    if (msg.includes('storage') || msg.includes('bucket')) {
      return 'A file storage error occurred. Please try again.'
    }
  }

  return 'An unexpected error occurred. Please try again.'
}
