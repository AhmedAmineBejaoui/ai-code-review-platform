import { clerkClient } from "@clerk/nextjs/server"

const GITHUB_OAUTH_PROVIDERS = ["github", "oauth_github", "github_oauth"] as const

function envFlag(value: string | null | undefined): boolean {
  return ["1", "true", "yes", "on"].includes((value ?? "").trim().toLowerCase())
}

export async function resolveGithubTokensForUser(
  userId: string | null | undefined,
): Promise<string[]> {
  if (!userId) {
    return []
  }

  const candidates: string[] = []
  const client = await clerkClient()
  for (const provider of GITHUB_OAUTH_PROVIDERS) {
    try {
      const oauthTokens = await client.users.getUserOauthAccessToken(
        userId,
        provider as "github",
      )
      if (Array.isArray(oauthTokens?.data)) {
        for (const entry of oauthTokens.data) {
          if (
            typeof entry?.token === "string" &&
            entry.token.trim().length > 0
          ) {
            candidates.push(entry.token.trim())
          }
        }
      }
    } catch {
      // Provider not configured for this Clerk instance.
    }
  }

  const allowGlobalFallback = envFlag(
    process.env.DASHBOARD_ALLOW_GLOBAL_GITHUB_TOKEN_FALLBACK,
  )
  if (allowGlobalFallback) {
    const fallbackToken = process.env.GITHUB_OAUTH_TOKEN || process.env.GH_TOKEN
    if (typeof fallbackToken === "string" && fallbackToken.trim().length > 0) {
      candidates.push(fallbackToken.trim())
    }
  }

  return Array.from(new Set(candidates))
}

export async function resolveGithubTokenForUser(
  userId: string | null | undefined,
): Promise<string | null> {
  const tokens = await resolveGithubTokensForUser(userId)
  return tokens[0] ?? null
}
