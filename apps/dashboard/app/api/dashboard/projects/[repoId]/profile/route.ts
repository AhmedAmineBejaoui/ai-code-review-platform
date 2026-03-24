import { NextRequest, NextResponse } from "next/server"
import { proxyBackendRequest } from "@/lib/backend-admin"

// GET /api/dashboard/projects/[repoId]/profile
export async function GET(
  request: NextRequest,
  { params }: { params: { repoId: string } }
) {
  try {
    return proxyBackendRequest({
      request,
      endpoint: `/api/projects/${params.repoId}/profile`,
      method: "GET",
    })
  } catch (error) {
    console.error("Error fetching project profile:", error)
    return NextResponse.json(
      { error: "Failed to fetch project profile" },
      { status: 500 }
    )
  }
}