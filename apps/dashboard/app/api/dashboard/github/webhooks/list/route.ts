import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getGitHubToken, getGitHubHeaders } from "@/lib/github"

// POST /api/dashboard/github/webhooks/list
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { repository } = await request.json()
    
    if (!repository) {
      return NextResponse.json(
        { error: "Repository name required" },
        { status: 400 }
      )
    }

    // Get GitHub token
    const token = await getGitHubToken(userId)
    if (!token) {
      return NextResponse.json(
        { error: "GitHub token not found. Please connect your GitHub account." },
        { status: 401 }
      )
    }

    // Get webhooks via GitHub API
    const response = await fetch(
      `https://api.github.com/repos/${repository}/hooks`,
      {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "AI-Code-Review-Platform"
        }
      }
    )

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { error: `GitHub API error: ${error.message}` },
        { status: response.status }
      )
    }

    const webhooks = await response.json()
    return NextResponse.json(webhooks)

  } catch (error) {
    console.error("Webhook list error:", error)
    return NextResponse.json(
      { error: "Failed to fetch webhooks" },
      { status: 500 }
    )
  }
}