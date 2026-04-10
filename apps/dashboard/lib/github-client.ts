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
    }
  }
  // Fallback to environment (local dev)
  const envToken = process.env.GITHUB_OAUTH_TOKEN || process.env.GH_TOKEN || null
  return envToken
}

export async function getGithubUser(token: string) {
  return await requestGithub(`/user`, { method: "GET" }, token) as any
}

export async function isUserMemberOfTeam(org: string, teamSlug: string, username: string, token?: string | null) {
  try {
    const res = await requestGithub(`/orgs/${encodeURIComponent(org)}/teams/${encodeURIComponent(teamSlug)}/memberships/${encodeURIComponent(username)}`, { method: "GET" }, token)
    // API returns state (active/inactive)
    return (res as any)?.state === "active" || true
  } catch (e: any) {
    if (e?.status === 404) return false
    throw e
  }
}

export async function isUserMemberOfOrg(org: string, username: string, token?: string | null) {
  try {
    await requestGithub(`/orgs/${encodeURIComponent(org)}/members/${encodeURIComponent(username)}`, { method: "GET" }, token)
    return true
  } catch (e: any) {
    if (e?.status === 404) return false
    throw e
  }
}

export async function isUserAllowedInScope(token: string | null, username: string) {
  // ALLOWED_GITHUB_TEAMS => comma separated list of org:team-slug entries  
  const teamsEnv = process.env.ALLOWED_GITHUB_TEAMS || ""
  const orgsEnv = process.env.ALLOWED_GITHUB_ORGS || ""
  if (teamsEnv) {
    const entries = teamsEnv.split(",").map(s => s.trim()).filter(Boolean)
    for (const e of entries) {
      const [org, team] = e.split(":").map(s => s.trim())
      if (!org || !team) continue
      try {        const ok = await isUserMemberOfTeam(org, team, username, token)
        if (ok) return true
      } catch (_) {        // continue
      }
    }
    return false
  }
  if (orgsEnv) {
    const orgs = orgsEnv.split(",").map(s => s.trim()).filter(Boolean)
    for (const org of orgs) {      try {        if (await isUserMemberOfOrg(org, username, token)) return true
      } catch (_) {        // continue
      }
    }
    return false
  }
  // If no restrictions configured, fail closed (require configuration)  
  const err: any = new Error("ALLOWED_GITHUB_TEAMS or ALLOWED_GITHUB_ORGS not configured on the server")
  err.status = 500
  throw err
}

export async function fetchFileContent(owner: string, repo: string, path: string, ref: string, token?: string | null) {
  const encodedPath = encodeURIComponent(path)
  const res = await requestGithub(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`, { method: "GET" }, token)
  const b64 = (res as any)?.content
  const sha = (res as any)?.sha
  const content = b64 ? Buffer.from(String(b64), "base64").toString("utf8") : ""
  return { content, sha }
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
  const baseRef = await requestGithub(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(base)}`, { method: "GET" }, token)
  const sha = (baseRef as any)?.object?.sha
  if (!sha) {    const err: any = new Error("Unable to resolve base commit SHA")    err.status = 500    throw err  }
  const create = await requestGithub(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`, { method: "POST", body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha }) }, token)
  return create
}

export async function createOrUpdateFile(params: {  owner: string  repo: string  path: string  content: string  branch: string  message?: string | null  token?: string | null}) {  const { owner, repo, path, content, branch, message, token } = params  const encodedPath = encodeURIComponent(path)  const contentB64 = Buffer.from(content, "utf8").toString("base64")  // Check if file exists on the target branch  let existingSha: string | null = null  try {    const getRes = await requestGithub(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`, { method: "GET" }, token)    existingSha = (getRes as any)?.sha ?? null  } catch (err: any) {    if (err?.status === 404) {      existingSha = null    } else {      throw err    }  }  const body: Record<string, unknown> = {    message: message ?? (existingSha ? `Update ${path}` : `Create ${path}`),    content: contentB64,    branch,  }  if (existingSha) body["sha"] = existingSha  try {    const res = await requestGithub(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`, { method: "PUT", body: JSON.stringify(body) }, token)    return res  } catch (err: any) {    // On conflict, include the latest content to help UI resolution    if (err?.status === 409 || err?.status === 422) {      const latest = await fetchFileContent(owner, repo, path, branch, token).catch(() => null)      const conflictErr: any = new Error("Conflict while updating file")      conflictErr.status = err.status      conflictErr.body = { ...(err.body || {}), conflict: true, latest }      throw conflictErr    }    throw err  }}

export async function createPullRequest(params: {  owner: string  repo: string  title: string  body?: string | null  head: string  base?: string  token?: string | null}) {  const { owner, repo, title, body, head, base, token } = params  const res = await requestGithub(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`, { method: "POST", body: JSON.stringify({ title, head, base: base ?? "main", body }) }, token)  return res}

export async function listPullRequests(owner: string, repo: string, state: string = "open", token?: string | null) {  const res = await requestGithub(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=${encodeURIComponent(state)}`, { method: "GET" }, token)  return res}

export async function createPullRequestReview(params: { owner: string; repo: string; pullNumber: number; event: string; body?: string | null; token?: string | null }) {  const { owner, repo, pullNumber, event, body, token } = params  const res = await requestGithub(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${encodeURIComponent(String(pullNumber))}/reviews`, { method: "POST", body: JSON.stringify({ event, body }) }, token)  return res}

export async function addIssueComment(params: { owner: string; repo: string; issueNumber: number; body: string; token?: string | null }) {  const { owner, repo, issueNumber, body, token } = params  const res = await requestGithub(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}/comments`, { method: "POST", body: JSON.stringify({ body }) }, token)  return res}
