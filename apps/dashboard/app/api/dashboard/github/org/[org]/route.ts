import { auth, clerkClient } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

type GithubOrgApiResponse = {
  login?: string
  name?: string
  description?: string
  avatar_url?: string
  html_url?: string
  public_repos?: number
}

type GithubMemberApiResponse = {
  login?: string
  avatar_url?: string
  html_url?: string
  role?: string
}

type GithubOrgInfo = {
  name: string | null
  login: string | null
  description: string | null
  avatarUrl: string | null
  htmlUrl: string | null
  publicRepos: number | null
  members: GithubMember[]
}

type GithubMember = {
  login: string
  avatarUrl: string | null
  htmlUrl: string | null
  role?: string
}

const GITHUB_API_BASE_URL = "https://api.github.com"

async function resolveGithubOauthAccessToken(client: Awaited<ReturnType<typeof clerkClient>>, userId: string) {
  // Try GitHub OAuth token providers
  const providers = ["github", "oauth_github", "github_oauth"]

  for (const provider of providers) {
    try {
      const oauthTokens = await client.users.getUserOauthAccessToken(userId, provider as any)
      const tokenCandidate = Array.isArray(oauthTokens?.data)
        ? oauthTokens.data.find((item) => typeof item?.token === "string" && item.token.trim().length > 0)
        : null
      if (tokenCandidate) {
        return tokenCandidate.token
      }
    } catch (e) {
      // Provider not configured, continue to next
    }
  }

  // If no OAuth token from Clerk, check if we have a GitHub token in environment
  const envToken = process.env.GITHUB_OAUTH_TOKEN || process.env.GH_TOKEN
  if (envToken) {
    return envToken
  }

  return null
}

function buildGithubHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

export async function GET(request: Request, { params }: { params: { org: string } }) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const orgName = params.org

  const client = await clerkClient()
  const oauthToken = await resolveGithubOauthAccessToken(client, userId)

  try {
    // Fetch organization info
    const orgResponse = await fetch(`${GITHUB_API_BASE_URL}/orgs/${encodeURIComponent(orgName)}`, {
      method: "GET",
      headers: buildGithubHeaders(oauthToken),
      cache: "no-store",
    })

    if (!orgResponse.ok) {
      if (orgResponse.status === 404) {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 })
      }
      return NextResponse.json({ error: "Failed to fetch organization" }, { status: 500 })
    }

    const orgData: GithubOrgApiResponse = await orgResponse.json()

    // Fetch organization members
    const membersResponse = await fetch(`${GITHUB_API_BASE_URL}/orgs/${encodeURIComponent(orgName)}/members`, {
      method: "GET",
      headers: buildGithubHeaders(oauthToken),
      cache: "no-store",
    })

    let members: GithubMember[] = []
    if (membersResponse.ok) {
      const membersData: GithubMemberApiResponse[] = await membersResponse.json()
      members = membersData.map(member => ({
        login: member.login || "",
        avatarUrl: member.avatar_url || null,
        htmlUrl: member.html_url || null,
        role: member.role || "member"
      }))
    }

    const orgInfo: GithubOrgInfo = {
      name: orgData.name || null,
      login: orgData.login || null,
      description: orgData.description || null,
      avatarUrl: orgData.avatar_url || null,
      htmlUrl: orgData.html_url || null,
      publicRepos: orgData.public_repos || null,
      members: members
    }

    return NextResponse.json(orgInfo, { status: 200 })

  } catch (error) {
    console.error("Error fetching GitHub organization info:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}