import { clerkClient } from "@clerk/nextjs/server"

const GITHUB_OAUTH_PROVIDERS = ["github", "oauth_github", "github_oauth"] as const

export async function resolveGithubTokenForUser(
  userId: string | null | undefined,
): Promise<string | null> {
  if (!userId) {
    return null
  }

  const client = await clerkClient()
  for (const provider of GITHUB_OAUTH_PROVIDERS) {
    try {
      const oauthTokens = await client.users.getUserOauthAccessToken(
        userId,
        provider as "github",
      )
      const tokenCandidate = Array.isArray(oauthTokens?.data)
        ? oauthTokens.data.find(
            (item: { token?: string }) =>
              typeof item?.token === "string" && item.token.trim().length > 0,
          )
        : null
      if (tokenCandidate?.token) {
        return tokenCandidate.token
      }
    } catch {
      // Provider not configured for this Clerk instance.
    }
  }

  return process.env.GITHUB_OAUTH_TOKEN || process.env.GH_TOKEN || null
}
