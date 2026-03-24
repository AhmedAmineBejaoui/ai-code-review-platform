import { NextRequest, NextResponse } from "next/server"
import { proxyBackendRequest } from "@/lib/backend-admin"

// POST /api/dashboard/rag/analyze/diff
export async function POST(request: NextRequest) {
  try {
    return proxyBackendRequest({
      request,
      endpoint: "/api/rag/analyze/diff",
      method: "POST",
    })
  } catch (error) {
    console.error("Error analyzing diff:", error)
    return NextResponse.json(
      { error: "Failed to analyze diff" },
      { status: 500 }
    )
  }
}