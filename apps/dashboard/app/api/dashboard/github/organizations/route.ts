import { auth, clerkClient } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const GITHUB_API = "https://api.github.com"

async function getGithubToken(userId: string): Promise<string | null> {
  const client = await clerkClient()
  for (const provider of ["github", "oauth_github"]) {
    try {
      const tokens = await client.users.getUserOauthAccessToken(userId, provider)
      const t = Array.isArray(tokens?.data)
        ? tokens.data.find((i) => typeof i?.token === "string" && i.token.trim().length > 0)
        : null
      if (t?.token) return t.token
    } catch {
      // fallthrough
    }
  }
  return null
}

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  }
}

async function ghGet<T>(url: string, token: string): Promise<T | null> {
  const res = await fetch(url, { headers: ghHeaders(token), cache: "no-store" })
  if (!res.ok) return null
  return (await res.json()) as T
}

/**
 * GET /api/dashboard/github/organizations
 *   → lists GitHub orgs the authed user belongs to
 * GET /api/dashboard/github/organizations?org=acme
 *   → returns full org details: info, repos, members
 */
export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = await getGithubToken(userId)
  if (!token) {
    return NextResponse.json(
      { connected: false, error: "GitHub account not connected", organizations: [] },
      { status: 200 },
    )
  }

  const { searchParams } = new URL(request.url)
  const org = searchParams.get("org")?.trim()

  if (!org) {
    const orgs = await ghGet<Array<Record<string, unknown>>>(`${GITHUB_API}/user/orgs?per_page=100`, token)
    const items = (orgs || []).map((o) => ({
      login: o.login as string,
      id: o.id as number,
      description: (o.description as string) || null,
      avatarUrl: (o.avatar_url as string) || null,
      url: (o.url as string) || null,
    }))
    return NextResponse.json({ connected: true, organizations: items })
  }

  const [info, repos, members] = await Promise.all([
    ghGet<Record<string, unknown>>(`${GITHUB_API}/orgs/${encodeURIComponent(org)}`, token),
    ghGet<Array<Record<string, unknown>>>(
      `${GITHUB_API}/orgs/${encodeURIComponent(org)}/repos?per_page=100&sort=updated`,
      token,
    ),
    ghGet<Array<Record<string, unknown>>>(
      `${GITHUB_API}/orgs/${encodeURIComponent(org)}/members?per_page=100`,
      token,
    ),
  ])

  if (!info) {
    return NextResponse.json({ error: `Organization '${org}' not found` }, { status: 404 })
  }

  return NextResponse.json({
    connected: true,
    organization: {
      login: info.login,
      name: info.name || info.login,
      description: info.description || null,
      avatarUrl: info.avatar_url || null,
      htmlUrl: info.html_url || null,
      publicRepos: info.public_repos || 0,
      followers: info.followers || 0,
      location: info.location || null,
      blog: info.blog || null,
    },
    repos: (repos || []).map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description || null,
      private: r.private || false,
      htmlUrl: r.html_url,
      language: r.language || null,
      stars: r.stargazers_count || 0,
      forks: r.forks_count || 0,
      updatedAt: r.updated_at || null,
      defaultBranch: r.default_branch || null,
    })),
    members: (members || []).map((m) => ({
      login: m.login,
      id: m.id,
      avatarUrl: m.avatar_url || null,
      htmlUrl: m.html_url || null,
      type: m.type || "User",
      siteAdmin: m.site_admin || false,
    })),
  })
}
