import { NextRequest, NextResponse } from "next/server"
import { proxyBackendRequest, requireBackendAuth } from "@/lib/backend-admin"

// GET /api/dashboard/projects/[repoId]/profile
export async function GET(
  request: NextRequest,
  { params }: { params: { repoId: string } }
) {
  const authResult = await requireBackendAuth()
  if (!authResult.ok) {
    return authResult.response
  }

  try {
    return proxyBackendRequest({
      path: `/api/v1/projects/${params.repoId}/profile`,
      method: "GET",
      token: authResult.token,
      userId: authResult.userId,
    })
  } catch (error) {
    console.error("Error fetching project profile:", error)
    return NextResponse.json(
      { error: "Failed to fetch project profile" },
      { status: 500 }
    )
  }
}
