import { NextRequest, NextResponse } from "next/server"
import { proxyBackendRequest } from "@/lib/backend-admin"

// POST /api/dashboard/rag/query/code
export async function POST(request: NextRequest) {
  try {
    return proxyBackendRequest({
      request,
      endpoint: "/api/rag/query/code",
      method: "POST",
    })
  } catch (error) {
    console.error("Error querying code context:", error)
    return NextResponse.json(
      { error: "Failed to query code context" },
      { status: 500 }
    )
  }
}