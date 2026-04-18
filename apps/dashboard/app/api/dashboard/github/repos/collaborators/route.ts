import { auth, clerkClient } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const GITHUB_API_BASE_URL = "https://api.github.com"
const GITHUB_API_VERSION = "2022-11-28"

async function resolveGithubToken(client: Awaited<ReturnType<typeof clerkClient>>, userId: string): Promise<string | null> {
  for (const provider of ["github"] as const) {
    try {
      const tokens = await client.users.getUserOauthAccessToken(userId, provider)
      const candidate = Array.isArray(tokens?.data)
        ? tokens.data.find((t) => typeof t?.token === "string" && t.token.trim().length > 0)
        : null
      if (candidate) return candidate.token
    } catch {
      // try next provider
    }
  }
  return null
}

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const repo = searchParams.get("repo")
  if (!repo) {
    return NextResponse.json({ error: "repo query param is required" }, { status: 400 })
  }

  const client = await clerkClient()
  const githubToken = await resolveGithubToken(client, userId)

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
    "User-Agent": "ai-code-review-platform",
  }
  if (githubToken) headers.Authorization = `Bearer ${githubToken}`

  // Fetch collaborators (paginated)
  const collaborators: Array<{ login: string; email: string | null; name: string | null }> = []
  let url: string | null = `${GITHUB_API_BASE_URL}/repos/${repo}/collaborators?affiliation=all&per_page=100`

  while (url) {
    const res = await fetch(url, { headers, cache: "no-store" })
    if (!res.ok) break

    const data = (await res.json().catch(() => [])) as unknown
    if (Array.isArray(data)) {
      for (const item of data) {
        if (typeof item?.login === "string") {
          // GitHub collaborators API doesn't include email/name - these will be null
          collaborators.push({
            login: item.login,
            email: null, // GitHub doesn't provide email in collaborators endpoint
            name: null,  // GitHub doesn't provide name in collaborators endpoint
          })
        }
      }
    }

    const link = res.headers.get("Link") ?? ""
    const next = link.match(/<([^>]+)>;\s*rel="next"/)
    url = next ? next[1] : null
  }

  return NextResponse.json({ items: collaborators })
}
