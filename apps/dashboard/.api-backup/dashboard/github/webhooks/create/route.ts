import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getGitHubToken, getGitHubHeaders } from "@/lib/github"

// POST /api/dashboard/github/webhooks/create
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { repository, webhook } = await request.json()
    
    if (!repository || !webhook) {
      return NextResponse.json(
        { error: "Repository and webhook configuration required" },
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

    // Create webhook via GitHub API
    const response = await fetch(
      `https://api.github.com/repos/${repository}/hooks`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "AI-Code-Review-Platform"
        },
        body: JSON.stringify({
          name: "web",
          active: webhook.active ?? true,
          events: webhook.events ?? ["push", "pull_request", "member"],
          config: webhook.config
        })
      }
    )

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { error: `GitHub API error: ${error.message}` },
        { status: response.status }
      )
    }

    const webhookData = await response.json()

    return NextResponse.json(webhookData)

  } catch (error) {
    console.error("Webhook creation error:", error)
    return NextResponse.json(
      { error: "Failed to create webhook" },
      { status: 500 }
    )
  }
}