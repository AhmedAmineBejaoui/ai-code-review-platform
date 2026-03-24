import { NextRequest, NextResponse } from "next/server"
import { proxyBackendRequest } from "@/lib/backend-admin"

// POST /api/dashboard/projects/[repoId]/analyze
export async function POST(
  request: NextRequest,
  { params }: { params: { repoId: string } }
) {
  try {
    return proxyBackendRequest({
      request,
      endpoint: `/api/projects/${params.repoId}/analyze`,
      method: "POST",
    })
  } catch (error) {
    console.error("Error starting project analysis:", error)
    return NextResponse.json(
      { error: "Failed to start project analysis" },
      { status: 500 }
    )
  }
}