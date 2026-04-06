import { auth, clerkClient } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const GITHUB_API_BASE_URL = "https://api.github.com"

type GithubOrgApiItem = {
  id?: number
  login?: string
  avatar_url?: string
  description?: string
}

type GithubOrganization = {
  id: number
  login: string
  avatarUrl: string | null
  description: string | null
}

type GithubUserInfo = {
  login: string
  avatarUrl: string | null
}

function buildGithubHeaders(token: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    Authorization: `Bearer ${token}`,
  }
}

function normalizeOrg(item: GithubOrgApiItem): GithubOrganization | null {
  if (typeof item.id !== "number" || typeof item.login !== "string" || item.login.trim().length === 0) {
    return null
  }
  return {
    id: item.id,
    login: item.login,
    avatarUrl: typeof item.avatar_url === "string" ? item.avatar_url : null,
    description: typeof item.description === "string" ? item.description : null,
  }
}

async function resolveGithubOauthAccessToken(client: Awaited<ReturnType<typeof clerkClient>>, userId: string) {
  try {
    const oauthTokens = await client.users.getUserOauthAccessToken(userId, "github")
    const tokenCandidate = Array.isArray(oauthTokens?.data)
      ? oauthTokens.data.find((item) => typeof item?.token === "string" && item.token.trim().length > 0)
      : null
    if (tokenCandidate) {
      return tokenCandidate.token
    }
  } catch {
    // Fall through to legacy provider format.
  }

  try {
    const oauthTokens = await client.users.getUserOauthAccessToken(userId, "oauth_github")
    const tokenCandidate = Array.isArray(oauthTokens?.data)
      ? oauthTokens.data.find((item) => typeof item?.token === "string" && item.token.trim().length > 0)
      : null
    if (tokenCandidate) {
      return tokenCandidate.token
    }
  } catch {
    // Ignore and return null below.
  }
  return null
}

async function fetchGithubUser(token: string): Promise<GithubUserInfo | null> {
  try {
    const response = await fetch(`${GITHUB_API_BASE_URL}/user`, {
      method: "GET",
      headers: buildGithubHeaders(token),
      cache: "no-store",
    })

    if (!response.ok) {
      return null
    }

    const user = await response.json()
    if (typeof user.login !== "string") {
      return null
    }

    return {
      login: user.login,
      avatarUrl: typeof user.avatar_url === "string" ? user.avatar_url : null,
    }
  } catch {
    return null
  }
}

async function fetchGithubOrgs(token: string): Promise<{ items: GithubOrganization[]; error: string | null }> {
  try {
    const response = await fetch(`${GITHUB_API_BASE_URL}/user/orgs?per_page=100`, {
      method: "GET",
      headers: buildGithubHeaders(token),
      cache: "no-store",
    })

    if (!response.ok) {
      const rawBody = await response.text()
      let errorMessage = "Failed to fetch organizations"
      try {
        const parsed = JSON.parse(rawBody)
        if (typeof parsed.message === "string") {
          errorMessage = parsed.message
        }
      } catch {
        if (rawBody.trim().length > 0) {
          errorMessage = rawBody
        }
      }
      return { items: [], error: errorMessage }
    }

    const payload = await response.json()
    if (!Array.isArray(payload)) {
      return { items: [], error: "Unexpected response format from GitHub" }
    }

    const orgs: GithubOrganization[] = []
    for (const item of payload) {
      const normalized = normalizeOrg(item)
      if (normalized) {
        orgs.push(normalized)
      }
    }

    // Sort organizations alphabetically by login
    orgs.sort((a, b) => a.login.toLowerCase().localeCompare(b.login.toLowerCase()))

    return { items: orgs, error: null }
  } catch (err) {
    return { items: [], error: err instanceof Error ? err.message : "Unknown error fetching organizations" }
  }
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const client = await clerkClient()
  const oauthToken = await resolveGithubOauthAccessToken(client, userId)

  if (!oauthToken) {
    return NextResponse.json(
      {
        connected: false,
        user: null,
        organizations: [],
        error: "GitHub account is not connected or OAuth token is unavailable. Please reconnect GitHub.",
      },
      { status: 200 }
    )
  }

  // Fetch user info and organizations in parallel
  const [userInfo, orgsResult] = await Promise.all([
    fetchGithubUser(oauthToken),
    fetchGithubOrgs(oauthToken),
  ])

  if (orgsResult.error) {
    return NextResponse.json(
      {
        connected: true,
        user: userInfo,
        organizations: [],
        error: orgsResult.error,
      },
      { status: 200 }
    )
  }

  return NextResponse.json(
    {
      connected: true,
      user: userInfo,
      organizations: orgsResult.items,
      error: null,
    },
    { status: 200 }
  )
}
