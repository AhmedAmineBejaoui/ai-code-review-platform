import { auth, clerkClient } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { resolveGithubTokenForUser } from "@/lib/server/github/auth"
import {
  buildGithubHeaders,
  GITHUB_API_BASE_URL,
  normalizeGithubError,
  parseGithubResponse,
} from "@/lib/server/github/client"

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

function extractGithubExternalAccountInfo(rawUser: unknown): GithubExternalAccountInfo {
  if (typeof rawUser !== "object" || rawUser === null) {
    return { connected: false, login: null }
  }

  const userRecord = rawUser as Record<string, unknown>

  // Try externalAccounts first (Clerk v5+)
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

    // Try to get login/username from various possible fields
    const username =
      normalizeGithubLoginCandidate(accountRecord.username) ??
      normalizeGithubLoginCandidate(accountRecord.login) ??
      normalizeGithubLoginCandidate(accountRecord.accountIdentifier) ??
      normalizeGithubLoginCandidate(accountRecord.account_identifier) ??
      normalizeGithubLoginCandidate(accountRecord.identificationId) ??
      normalizeGithubLoginCandidate(accountRecord.identification_id) ??
      normalizeGithubLoginCandidate((accountRecord.emailAddress as string)?.split("@")[0])

    if (username) {
      console.log(`âœ“ Found GitHub login in externalAccounts: ${username}`)
      return { connected: true, login: username }
    }
  }

  // Try externalIdentifiers if externalAccounts didn't work (Clerk v4)
  if (!connected) {
    const externalIdentifiers = [
      ...toUnknownArray(userRecord.externalIdentifiers),
      ...toUnknownArray(userRecord.external_identifiers),
    ]

    for (const identifier of externalIdentifiers) {
      if (typeof identifier !== "object" || identifier === null) {
        continue
      }

      const identifierRecord = identifier as Record<string, unknown>
      const provider =
        identifierRecord.provider ??
        identifierRecord.providerSlug ??
        identifierRecord.provider_slug

      if (!isGithubProvider(provider)) {
        continue
      }

      connected = true
      const username = normalizeGithubLoginCandidate(identifierRecord.identification)

      if (username) {
        console.log(`âœ“ Found GitHub login in externalIdentifiers: ${username}`)
        return { connected: true, login: username }
      }
    }
  }

  // Try user metadata (some Clerk versions store GitHub username here)
  if (connected) {
    const username =
      normalizeGithubLoginCandidate(userRecord.githubUsername) ??
      normalizeGithubLoginCandidate(userRecord.github_username) ??
      normalizeGithubLoginCandidate(userRecord.username) ??
      normalizeGithubLoginCandidate((userRecord.primaryEmailAddress as Record<string, unknown> | undefined)?.emailAddress) ??
      null

    if (username) {
      console.log(`âœ“ Found GitHub login in user metadata: ${username}`)
      return { connected: true, login: username }
    }
  }

  if (!connected) {
    console.log("â„¹ GitHub account not found in external accounts")
    return { connected: false, login: null }
  }

  console.log("âš  GitHub account connected but login/username unavailable")
  return {
    connected: true,
    login: null,
  }
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
      const parsedBody = await parseGithubResponse(response)
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
    client.users.getUser(userId).catch((e) => {
      console.error("Failed to get user from Clerk:", e)
      return null
    }),
    resolveGithubTokenForUser(userId),
  ])
  const githubAccount = user ? extractGithubExternalAccountInfo(user) : { connected: false, login: null }

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

  // Primary path: use GitHub account detected from Clerk
  if (githubAccount.connected && githubAccount.login) {
    const githubLogin = githubAccount.login
    // Path A: Try with OAuth token first (includes private + org repos)
    if (oauthToken) {
      console.log(`âœ“ Getting repos for ${githubLogin} with OAuth token`)
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
            login: githubLogin,
            tokenAvailable: true,
          },
          { status: 200 },
        )
      }

      return NextResponse.json(
        {
          connected: true,
          items: reposResult.items,
          error: null,
          login: githubLogin,
          tokenAvailable: true,
        },
        { status: 200 },
      )
    }

    // Path B: Fallback to public repos without OAuth token
    console.log(`â„¹ Getting public repos for ${githubLogin} without OAuth token`)
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
          login: githubAccount.login,
          tokenAvailable: false,
        },
        { status: 200 },
      )
    }

    return NextResponse.json(
      {
        connected: true,
        items: reposResult.items,
        error: reposResult.items.length === 0
          ? "No repositories found. Check that your GitHub account is public or try connecting via OAuth."
          : null,
        login: githubAccount.login,
        tokenAvailable: false,
        note: "Showing only public repositories. Connect GitHub OAuth in Clerk settings to see private repositories.",
      },
      { status: 200 },
    )
  }

  // Fallback: No GitHub account connected
  console.log("â„¹ No GitHub account found for user")
  return NextResponse.json(
    {
      connected: false,
      items: [],
      error: "GitHub account is not connected. Please connect it in your account settings.",
    },
    { status: 200 },
  )
}
