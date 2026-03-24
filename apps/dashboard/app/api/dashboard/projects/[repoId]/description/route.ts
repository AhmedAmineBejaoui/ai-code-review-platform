import { NextRequest, NextResponse } from "next/server"
import { proxyBackendRequest } from "@/lib/backend-admin"

// POST /api/dashboard/projects/[repoId]/description
export async function POST(
  request: NextRequest,
  { params }: { params: { repoId: string } }
) {
  try {
    return proxyBackendRequest({
      request,
      endpoint: `/api/projects/${params.repoId}/description`,
      method: "POST",
    })
  } catch (error) {
    console.error("Error generating project description:", error)
    return NextResponse.json(
      { error: "Failed to generate project description" },
      { status: 500 }
    )
  }
}