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

type GithubExternalAccountInfo = {
  connected: boolean
  login: string | null
}

function asTrimmedString(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null
  }
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toUnknownArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw
  }
  if (typeof raw !== "object" || raw === null) {
    return []
  }
  const data = (raw as { data?: unknown }).data
  return Array.isArray(data) ? data : []
}

function isGithubProvider(rawProvider: unknown): boolean {
  const provider = asTrimmedString(rawProvider)?.toLowerCase()
  if (!provider) {
    return false
  }
  return provider === "github" || provider === "oauth_github" || provider.includes("github")
}

function normalizeGithubLoginCandidate(raw: unknown): string | null {
  const rawValue = asTrimmedString(raw)
  if (!rawValue) {
    return null
  }

  const withoutAt = rawValue.startsWith("@") ? rawValue.slice(1) : rawValue
  return /^[a-z\d](?:[a-z\d-]{0,38})$/i.test(withoutAt) ? withoutAt : null
}

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

function normalizeGithubError(raw: unknown, statusCode?: number, hasToken?: boolean): string {
  let baseMessage = "GitHub request failed"

  if (typeof raw === "string" && raw.trim().length > 0) {
    baseMessage = raw.trim()
  } else if (typeof raw === "object" && raw !== null) {
    const message = (raw as { message?: unknown }).message
    if (typeof message === "string" && message.trim().length > 0) {
      baseMessage = message.trim()
    }
  }

  if (statusCode === 403 && baseMessage.toLowerCase().includes("rate limit")) {
    const tokenHint = hasToken
      ? ""
      : " No GitHub OAuth token detected. Reconnect GitHub in Clerk to increase the rate limit."
    return `${baseMessage}${tokenHint}`
  }

  if (statusCode === 404) {
    return `${baseMessage}. The user/organization may not exist or may be inaccessible.`
  }

  return baseMessage
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

function extractGithubExternalAccountInfo(rawUser: unknown): GithubExternalAccountInfo {
  if (typeof rawUser !== "object" || rawUser === null) {
    return { connected: false, login: null }
  }

  const userRecord = rawUser as Record<string, unknown>
  const externalAccounts = [
    ...toUnknownArray(userRecord.externalAccounts),
    ...toUnknownArray(userRecord.external_accounts),
  ]

  let connected = false
  for (const account of externalAccounts) {
    if (typeof account !== "object" || account === null) {
      continue
    }

    const accountRecord = account as Record<string, unknown>
    const provider =
      accountRecord.provider ??
      accountRecord.providerSlug ??
      accountRecord.provider_slug
    if (!isGithubProvider(provider)) {
      continue
    }

    connected = true
    const username =
      normalizeGithubLoginCandidate(accountRecord.username) ??
      normalizeGithubLoginCandidate(accountRecord.login) ??
      normalizeGithubLoginCandidate(accountRecord.accountIdentifier) ??
      normalizeGithubLoginCandidate(accountRecord.account_identifier) ??
      normalizeGithubLoginCandidate(accountRecord.identificationId) ??
      normalizeGithubLoginCandidate(accountRecord.identification_id)

    if (username) {
      return { connected: true, login: username }
    }
  }

  if (!connected) {
    return { connected: false, login: null }
  }

  return {
    connected: true,
    login:
      normalizeGithubLoginCandidate(userRecord.githubUsername) ??
      normalizeGithubLoginCandidate(userRecord.github_username) ??
      null,
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

async function fetchGithubRepos(
  token: string | null,
  endpointBuilder: (page: number) => string,
): Promise<{ items: GithubRepoOption[]; error: string | null }> {
  const dedup = new Map<number, GithubRepoOption>()

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await fetch(`${GITHUB_API_BASE_URL}${endpointBuilder(page)}`, {
      method: "GET",
      headers: buildGithubHeaders(token),
      cache: "no-store",
    })

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
      return { items: [], error: normalizeGithubError(parsedBody, response.status, Boolean(token)) }
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

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const customAccount = asTrimmedString(searchParams.get("account"))
  const accountType = searchParams.get("type") === "org" ? "org" : "user"

  const client = await clerkClient()
  const [user, oauthToken] = await Promise.all([
    client.users.getUser(userId).catch(() => null),
    resolveGithubOauthAccessToken(client, userId),
  ])
  const githubAccount = extractGithubExternalAccountInfo(user)

  if (customAccount) {
    const endpointBuilder =
      accountType === "org"
        ? (page: number) =>
            `/orgs/${encodeURIComponent(customAccount)}/repos?per_page=${PAGE_SIZE}&page=${page}&sort=updated&direction=desc&type=all`
        : (page: number) =>
            `/users/${encodeURIComponent(customAccount)}/repos?per_page=${PAGE_SIZE}&page=${page}&sort=updated&direction=desc&type=all`

    const reposResult = await fetchGithubRepos(oauthToken, endpointBuilder)
    if (reposResult.error) {
      return NextResponse.json(
        {
          connected: true,
          items: [],
          error: reposResult.error,
          account: customAccount,
          accountType,
        },
        { status: 200 },
      )
    }

    return NextResponse.json(
      {
        connected: true,
        items: reposResult.items,
        error: null,
        account: customAccount,
        accountType,
      },
      { status: 200 },
    )
  }

  if (oauthToken) {
    const reposResult = await fetchGithubRepos(
      oauthToken,
      (page) =>
        `/user/repos?per_page=${PAGE_SIZE}&page=${page}&sort=updated&direction=desc&affiliation=owner,collaborator,organization_member`,
    )
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

  if (!githubAccount.connected) {
    return NextResponse.json(
      {
        connected: false,
        items: [],
        error: "GitHub account is not connected to the current user.",
      },
      { status: 200 },
    )
  }

  if (!githubAccount.login) {
    return NextResponse.json(
      {
        connected: true,
        items: [],
        error: "GitHub account is connected but login is unavailable. Reconnect GitHub from Clerk.",
      },
      { status: 200 },
    )
  }
  const githubLogin = githubAccount.login

  const reposResult = await fetchGithubRepos(
    null,
    (page) =>
      `/users/${encodeURIComponent(githubLogin)}/repos?per_page=${PAGE_SIZE}&page=${page}&sort=updated&direction=desc&type=owner`,
  )
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
      error:
        "GitHub account is connected but no OAuth access token is available. Only public repositories are listed.",
    },
    { status: 200 },
  )
}
