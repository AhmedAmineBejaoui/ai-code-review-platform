import { NextRequest, NextResponse } from "next/server"
import { proxyBackendRequest } from "@/lib/backend-admin"

// POST /api/dashboard/rag/query
export async function POST(request: NextRequest) {
  try {
    return proxyBackendRequest({
      request,
      endpoint: "/api/rag/query",
      method: "POST",
    })
  } catch (error) {
    console.error("Error executing RAG query:", error)
    return NextResponse.json(
      { error: "Failed to execute RAG query" },
      { status: 500 }
    )
  }
}