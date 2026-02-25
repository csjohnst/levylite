export async function register() {
  // Node.js 22+ has an experimental globalThis.localStorage that is
  // non-functional unless --localstorage-file is provided with a valid path.
  // This breaks libraries that check `typeof localStorage !== 'undefined'`
  // during SSR. Remove the broken global so they fall through to their
  // server-side fallback paths.
  if (typeof window === 'undefined' && typeof globalThis.localStorage !== 'undefined') {
    // @ts-expect-error — intentionally removing broken Node.js built-in
    delete globalThis.localStorage
  }

  // Exceptionless server-side error tracking
  if (typeof window === 'undefined') {
    try {
      const { Exceptionless } = await import(/* webpackIgnore: true */ '@exceptionless/node')
      await Exceptionless.startup((c) => {
        c.apiKey = process.env.NEXT_PUBLIC_EXCEPTIONLESS_API_KEY!
        c.serverUrl = process.env.NEXT_PUBLIC_EXCEPTIONLESS_SERVER_URL!
      })
    } catch {
      // Fails in dev mode with webpack — non-critical, skip silently
    }
  }
}
