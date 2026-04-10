/* Server-side GitHub client helpers for dashboard API routes.
   All functions are intended to be called from server-side Next.js route handlers.
*/

import { clerkClient } from "@clerk/nextjs/server"

const GITHUB_API_BASE = "https://api.github.com"

function buildGithubHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function requestGithub(path: string, init: RequestInit = {}, token?: string | null) {
  const url = `${GITHUB_API_BASE}${path}`
  const merged: RequestInit = {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...buildGithubHeaders(token),
    },
  }

  const res = await fetch(url, merged)
  const text = await res.text().catch(() => "")
  let data: unknown = text
  try {
    if (text) data = JSON.parse(text)
  } catch (_e) {
    // keep raw text
  }

  if (!res.ok) {
    const message = (data && typeof data === "object" && (data as any).message) || text || `HTTP ${res.status}`
    const err: any = new Error(String(message))
    err.status = res.status
    err.body = data
    throw err
  }

  return data
}

export async function resolveGithubTokenForUser(userId: string | null): Promise<string | null> {
  if (!userId) return null
  const client = await clerkClient()
  const providers = ["github", "oauth_github", "github_oauth"]

  for (const provider of providers) {
    try {
      // clerkClient users.getUserOauthAccessToken returns { data: [...] }
      const oauthTokens = await client.users.getUserOauthAccessToken(userId, provider as any)
      const tokenCandidate = Array.isArray(oauthTokens?.data) ? oauthTokens.data.find((it: any) => it?.token) : null
      if (tokenCandidate?.token) return tokenCandidate.token as string
    } catch (e) {
      // provider not configured or Clerk doesn't support this call in deployment; continue
      // console.debug(`OAuth token fetch failed for provider ${provider}:`, (e as Error).message)
    }
  }

  // Fallback to environment (local dev)
  const envToken = process.env.GITHUB_OAUTH_TOKEN || process.env.GH_TOKEN || null
  return envToken
}

export async function createBranch(params: {
  owner: string
  repo: string
  newBranch: string
  baseBranch?: string
  token?: string | null
}) {
  const { owner, repo, newBranch, baseBranch, token } = params
  const base = baseBranch ?? "main"

  // Resolve base SHA
  const baseRef = await requestGithub(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(base)}`, { method: "GET" }, token)
  const sha = (baseRef as any)?.object?.sha
  if (!sha) {
    const err: any = new Error("Unable to resolve base commit SHA")
    err.status = 500
    throw err
  }

  // Create new ref
  const create = await requestGithub(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha }),
  }, token)

  return create
}

export async function createOrUpdateFile(params: {
  owner: string
  repo: string
  path: string
  content: string
  branch: string
  message?: string | null
  token?: string | null
}) {
  const { owner, repo, path, content, branch, message, token } = params
  const encodedPath = encodeURIComponent(path)
  const contentB64 = Buffer.from(content, "utf8").toString("base64")

  // Check if file exists on the target branch
  let existingSha: string | null = null
  try {
    const getRes = await requestGithub(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`, { method: "GET" }, token)
    existingSha = (getRes as any)?.sha ?? null
  } catch (err: any) {
    if (err?.status === 404) {
      existingSha = null
    } else {
      throw err
    }
  }

  const body: Record<string, unknown> = {
    message: message ?? (existingSha ? `Update ${path}` : `Create ${path}`),
    content: contentB64,
    branch,
  }
  if (existingSha) body["sha"] = existingSha

  const res = await requestGithub(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`, {
    method: "PUT",
    body: JSON.stringify(body),
  }, token)

  return res
}

export async function createPullRequest(params: {
  owner: string
  repo: string
  title: string
  body?: string | null
  head: string
  base?: string
  token?: string | null
}) {
  const { owner, repo, title, body, head, base, token } = params
  const res = await requestGithub(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`, {
    method: "POST",
    body: JSON.stringify({ title, head, base: base ?? "main", body }),
  }, token)
  return res
}

export async function addIssueComment(params: { owner: string; repo: string; issueNumber: number; body: string; token?: string | null }) {
  const { owner, repo, issueNumber, body, token } = params
  const res = await requestGithub(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  }, token)
  return res
}
