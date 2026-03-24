import { NextRequest, NextResponse } from "next/server"
import { proxyBackendRequest } from "@/lib/backend-admin"

// GET /api/dashboard/projects/[repoId]/context/status
export async function GET(
  request: NextRequest,
  { params }: { params: { repoId: string } }
) {
  try {
    return proxyBackendRequest({
      request,
      endpoint: `/api/projects/${params.repoId}/context/status`,
      method: "GET",
    })
  } catch (error) {
    console.error("Error fetching context status:", error)
    return NextResponse.json(
      { error: "Failed to fetch context status" },
      { status: 500 }
    )
  }
}

// POST /api/dashboard/projects/[repoId]/context/refresh
export async function POST(
  request: NextRequest,
  { params }: { params: { repoId: string } }
) {
  try {
    return proxyBackendRequest({
      request,
      endpoint: `/api/projects/${params.repoId}/context/refresh`,
      method: "POST",
    })
  } catch (error) {
    console.error("Error refreshing project context:", error)
    return NextResponse.json(
      { error: "Failed to refresh project context" },
      { status: 500 }
    )
  }
}