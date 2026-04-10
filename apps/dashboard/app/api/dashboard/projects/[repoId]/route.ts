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
 * GET /api/dashboard/projects/{repoId}
 *
 * Proxies the backend project details endpoint with Clerk authentication.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { repoId: string } }
) {
  const { userId, getToken } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: "Missing Clerk token" }, { status: 401 })
  }

  const projectId = params.repoId
  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), BACKEND_FETCH_TIMEOUT_MS)

  let backendResponse: Response
  try {
    backendResponse = await fetch(
      `${BACKEND_API_BASE_URL}/api/v1/projects/${encodeURIComponent(projectId)}/details`,
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
      { error: "Backend timeout while fetching project details" },
      { status: 504 },
    )
  } finally {
    clearTimeout(timeout)
  }

  if (!backendResponse.ok) {
    if (backendResponse.status === 404) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }
    return NextResponse.json(
      { error: "Failed to fetch project details" },
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