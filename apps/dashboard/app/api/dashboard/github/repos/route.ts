import { auth, clerkClient } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

type GithubRepoApiItem = {
  id?: number
  name?: string
  full_name?: string
  private?: boolean
  html_url?: string
  default_branch?: string
  owner?: {
    login?: string
  }
  updated_at?: string
}

type GithubRepoOption = {
  id: number
  name: string
  fullName: string
  private: boolean
  htmlUrl: string | null
  defaultBranch: string | null
  ownerLogin: string | null
  updatedAt: string | null
}

const GITHUB_API_BASE_URL = "https://api.github.com"
const MAX_PAGES = 3
const PAGE_SIZE = 100

function normalizeRepo(item: GithubRepoApiItem): GithubRepoOption | null {
  if (typeof item.id !== "number" || typeof item.full_name !== "string" || item.full_name.trim().length === 0) {
    return null
  }
  return {
    id: item.id,
    name: typeof item.name === "string" ? item.name : item.full_name,
    fullName: item.full_name,
    private: item.private === true,
    htmlUrl: typeof item.html_url === "string" ? item.html_url : null,
    defaultBranch: typeof item.default_branch === "string" ? item.default_branch : null,
    ownerLogin: typeof item.owner?.login === "string" ? item.owner.login : null,
    updatedAt: typeof item.updated_at === "string" ? item.updated_at : null,
  }
}

function normalizeGithubError(raw: unknown): string {
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim()
  }
  if (typeof raw === "object" && raw !== null) {
    const message = (raw as { message?: unknown }).message
    if (typeof message === "string" && message.trim().length > 0) {
      return message.trim()
    }
  }
  return "GitHub request failed"
}

async function fetchGithubRepos(token: string): Promise<{ items: GithubRepoOption[]; error: string | null }> {
  const dedup = new Map<number, GithubRepoOption>()

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await fetch(
      `${GITHUB_API_BASE_URL}/user/repos?per_page=${PAGE_SIZE}&page=${page}&sort=updated&direction=desc&affiliation=owner,collaborator,organization_member`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        cache: "no-store",
      },
    )

    if (!response.ok) {
      const rawBody = await response.text()
      let parsedBody: unknown = rawBody
      if (rawBody) {
        try {
          parsedBody = JSON.parse(rawBody)
        } catch {
          parsedBody = rawBody
        }
      }
      return { items: [], error: normalizeGithubError(parsedBody) }
    }

    const payload = (await response.json().catch(() => [])) as unknown
    if (!Array.isArray(payload)) {
      return { items: [], error: "Unexpected GitHub response format" }
    }

    let addedCount = 0
    for (const rawItem of payload) {
      if (typeof rawItem !== "object" || rawItem === null) {
        continue
      }
      const normalized = normalizeRepo(rawItem as GithubRepoApiItem)
      if (!normalized) {
        continue
      }
      dedup.set(normalized.id, normalized)
      addedCount += 1
    }

    if (addedCount < PAGE_SIZE) {
      break
    }
  }

  const items = Array.from(dedup.values()).sort((left, right) => {
    const leftDate = left.updatedAt ?? ""
    const rightDate = right.updatedAt ?? ""
    return rightDate.localeCompare(leftDate)
  })
  return { items, error: null }
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const client = await clerkClient()
  let oauthTokens
  try {
    oauthTokens = await client.users.getUserOauthAccessToken(userId, "github")
  } catch {
    return NextResponse.json(
      {
        connected: false,
        items: [],
        error: "GitHub account is not connected to the current user.",
      },
      { status: 200 },
    )
  }

  const tokenCandidate = Array.isArray(oauthTokens?.data)
    ? oauthTokens.data.find((item) => typeof item?.token === "string" && item.token.trim().length > 0)
    : null

  if (!tokenCandidate) {
    return NextResponse.json(
      {
        connected: false,
        items: [],
        error: "GitHub account is connected but no OAuth access token is available.",
      },
      { status: 200 },
    )
  }

  const reposResult = await fetchGithubRepos(tokenCandidate.token)
  if (reposResult.error) {
    return NextResponse.json(
      {
        connected: true,
        items: [],
        error: reposResult.error,
      },
      { status: 200 },
    )
  }

  return NextResponse.json(
    {
      connected: true,
      items: reposResult.items,
      error: null,
    },
    { status: 200 },
  )
}

