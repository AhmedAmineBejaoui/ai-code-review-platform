import { NextRequest, NextResponse } from "next/server"
import { proxyBackendRequest } from "@/lib/backend-admin"

// GET /api/dashboard/rag/agents/status
export async function GET(request: NextRequest) {
  try {
    return proxyBackendRequest({
      request,
      endpoint: "/api/rag/agents/status",
      method: "GET",
    })
  } catch (error) {
    console.error("Error getting agents status:", error)
    return NextResponse.json(
      { error: "Failed to get agents status" },
      { status: 500 }
    )
  }
}