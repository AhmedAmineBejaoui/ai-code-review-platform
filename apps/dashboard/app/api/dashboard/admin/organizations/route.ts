import { auth } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

const BACKEND_FETCH_TIMEOUT_MS = Math.max(
  1_000,
  Number(process.env.DASHBOARD_BACKEND_FETCH_TIMEOUT_MS ?? "15000") || 15_000,
)

export const dynamic = "force-dynamic"

/**
 * GET /api/dashboard/admin/organizations
 *
 * Lists all organizations with admin permissions.
 */
export async function GET(request: NextRequest) {
  const { userId, getToken } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: "Missing Clerk token" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const page = searchParams.get("page") ?? "1"
  const limit = searchParams.get("limit") ?? "50"
  const search = searchParams.get("search")

  const backendParams = new URLSearchParams({ page, limit })
  if (search) backendParams.set("search", search)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), BACKEND_FETCH_TIMEOUT_MS)

  let backendResponse: Response
  try {
    backendResponse = await fetch(
      `${BACKEND_API_BASE_URL}/api/v1/admin/organizations?${backendParams.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-User-Id": userId,
          Accept: "application/json",
        },
        signal: controller.signal,
        cache: "no-store",
      },
    )
  } catch {
    return NextResponse.json(
      { error: "Backend timeout while fetching organizations" },
      { status: 504 },
    )
  } finally {
    clearTimeout(timeout)
  }

  if (!backendResponse.ok) {
    if (backendResponse.status === 404) {
      // Return empty list if backend doesn't have organizations endpoint yet
      return NextResponse.json({ organizations: [] }, { status: 200 })
    }
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: backendResponse.status },
    )
  }

  let rawBody: unknown
  try {
    rawBody = await backendResponse.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid response from backend" },
      { status: 502 },
    )
  }

  return NextResponse.json(rawBody, { status: 200 })
}

/**
 * POST /api/dashboard/admin/organizations
 *
 * Creates a new organization.
 */
export async function POST(request: NextRequest) {
  const { userId, getToken } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: "Missing Clerk token" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), BACKEND_FETCH_TIMEOUT_MS)

  let backendResponse: Response
  try {
    backendResponse = await fetch(`${BACKEND_API_BASE_URL}/api/v1/admin/organizations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-User-Id": userId,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch {
    return NextResponse.json(
      { error: "Backend timeout while creating organization" },
      { status: 504 },
    )
  } finally {
    clearTimeout(timeout)
  }

  if (!backendResponse.ok) {
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: backendResponse.status },
    )
  }

  let rawBody: unknown
  try {
    rawBody = await backendResponse.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid response from backend" },
      { status: 502 },
    )
  }

  return NextResponse.json(rawBody, { status: 201 })
}