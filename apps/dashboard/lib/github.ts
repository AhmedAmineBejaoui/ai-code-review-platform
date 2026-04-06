import { clerkClient } from "@clerk/clerk-react/server"

/**
 * Get GitHub access token for a user
 */
export async function getGitHubToken(userId: string): Promise<string | null> {
  try {
    // First try oauth_github, then github as fallback
    let tokens = await clerkClient.users.getUserOauthAccessToken(userId, 'oauth_github' as any)
    
    if (!tokens || tokens.data.length === 0) {
      // Try the alternative provider format
      tokens = await clerkClient.users.getUserOauthAccessToken(userId, 'github' as any)
    }
    
    if (!tokens || tokens.data.length === 0) {
      console.warn(`No GitHub token found for user ${userId}`)
      return null
    }

    return tokens.data[0].token
  } catch (error) {
    console.error("Error getting GitHub token:", error)
    return null
  }
}

/**
 * Create GitHub API headers with authentication
 */
export function getGitHubHeaders(token: string): Record<string, string> {
  return {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "AI-Code-Review-Platform"
  }
}