/**
 * Mobile-compatible Backend Admin utilities
 * 
 * This is a stub version for mobile builds.
 * Server-side API proxying is not available in static export.
 * All API calls should go directly to the backend API from the client.
 */

import { NextResponse } from "next/server"

type AuthContext =
  | {
      ok: true
      userId: string
      token: string
    }
  | {
      ok: false
      response: NextResponse
    }

type ProxyOptions = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  path: string
  token: string
  userId: string
  body?: unknown
  timeoutMs?: number
}

/**
 * This function is not available in mobile builds.
 * Use client-side API calls with Clerk's getToken() instead.
 */
export async function requireBackendAuth(): Promise<AuthContext> {
  console.warn(
    "[Mobile Build] requireBackendAuth() called - this is a mobile build stub. " +
    "API routes are not available in mobile builds."
  )
  
  return {
    ok: false,
    response: NextResponse.json(
      { error: "Backend auth not available in mobile builds" },
      { status: 501 }
    ),
  }
}

/**
 * This function is not available in mobile builds.
 * Use direct fetch calls to the backend API from client components instead.
 */
export async function proxyBackendRequest(options: ProxyOptions): Promise<NextResponse> {
  console.warn(
    "[Mobile Build] proxyBackendRequest() called - this is a mobile build stub. " +
    "API routes are not available in mobile builds."
  )
  
  return NextResponse.json(
    { error: "Backend proxy not available in mobile builds" },
    { status: 501 }
  )
}
