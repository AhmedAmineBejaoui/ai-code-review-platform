import { NextRequest, NextResponse } from "next/server"
import { proxyBackendRequest } from "@/lib/backend-admin"

// POST /api/dashboard/rag/query/documentation
export async function POST(request: NextRequest) {
  try {
    return proxyBackendRequest({
      request,
      endpoint: "/api/rag/query/documentation",
      method: "POST",
    })
  } catch (error) {
    console.error("Error querying documentation:", error)
    return NextResponse.json(
      { error: "Failed to query documentation" },
      { status: 500 }
    )
  }
}