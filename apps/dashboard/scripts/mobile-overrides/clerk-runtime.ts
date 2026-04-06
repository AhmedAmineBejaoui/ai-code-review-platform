/**
 * Mobile-compatible Clerk Runtime Config
 * 
 * Client-safe version that doesn't use process.env during runtime
 */

type ClerkRuntimeConfig = {
  clerkJSUrl?: string
  clerkJSVersion?: string
  scriptLoadTimeout?: number
}

const LOCAL_CLERK_JS_URL = "/vendor/clerk-js/current/clerk.browser.js"

export function getClerkRuntimeConfig(): ClerkRuntimeConfig {
  // For mobile builds, always use local Clerk JS
  // Environment variables are baked in at build time
  return {
    clerkJSUrl: LOCAL_CLERK_JS_URL,
    scriptLoadTimeout: 30_000,
  }
}
