import { auth } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"
import {
  resolveGithubTokenForUser,
  createBranch,
  createOrUpdateFile,
  createPullRequest,
  addIssueComment,
} from "../../../../lib/github-client"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const action = (body as any).action as string | undefined
    const payload = (body as any).payload as Record<string, unknown> | undefined
    if (!action) return NextResponse.json({ error: "Missing action" }, { status: 400 })

    const token = await resolveGithubTokenForUser(userId)
    if (!token) {
      return NextResponse.json({ error: "GitHub token not available. Connect your GitHub account in profile settings." }, { status: 403 })
    }

    switch (action) {
      case "create_branch": {
        const owner = String(payload?.owner ?? "").trim()
        const repo = String(payload?.repo ?? "").trim()
        const newBranch = String(payload?.newBranch ?? "").trim()
        const baseBranch = payload?.baseBranch ? String(payload.baseBranch) : undefined
        if (!owner || !repo || !newBranch) {
          return NextResponse.json({ error: "Missing fields: owner, repo, newBranch" }, { status: 400 })
        }
        const result = await createBranch({ owner, repo, newBranch, baseBranch, token })
        return NextResponse.json({ ok: true, result }, { status: 201 })
      }

      case "commit_file": {
        const owner = String(payload?.owner ?? "").trim()
        const repo = String(payload?.repo ?? "").trim()
        const path = String(payload?.path ?? "").trim()
        const content = typeof payload?.content === "string" ? payload.content : undefined
        const branch = String(payload?.branch ?? "").trim()
        const message = payload?.message ? String(payload.message) : undefined

        if (!owner || !repo || !path || !content || !branch) {
          return NextResponse.json({ error: "Missing fields: owner, repo, path, content, branch" }, { status: 400 })
        }

        const result = await createOrUpdateFile({ owner, repo, path, content, branch, message, token })
        return NextResponse.json({ ok: true, result }, { status: 200 })
      }

      case "create_pr": {
        const owner = String(payload?.owner ?? "").trim()
        const repo = String(payload?.repo ?? "").trim()
        const title = String(payload?.title ?? "").trim()
        const head = String(payload?.head ?? "").trim()
        const base = payload?.base ? String(payload.base) : undefined
        const bodyText = payload?.body ? String(payload.body) : undefined

        if (!owner || !repo || !title || !head) {
          return NextResponse.json({ error: "Missing fields: owner, repo, title, head" }, { status: 400 })
        }

        const result = await createPullRequest({ owner, repo, title, head, base, body: bodyText, token })
        return NextResponse.json({ ok: true, result }, { status: 201 })
      }

      case "add_comment": {
        const owner = String(payload?.owner ?? "").trim()
        const repo = String(payload?.repo ?? "").trim()
        const issueNumberRaw = payload?.issueNumber
        const bodyText = payload?.body ? String(payload.body) : undefined

        const issueNumber = typeof issueNumberRaw === "number" ? issueNumberRaw : issueNumberRaw ? Number(issueNumberRaw) : NaN
        if (!owner || !repo || !Number.isFinite(issueNumber) || !bodyText) {
          return NextResponse.json({ error: "Missing fields: owner, repo, issueNumber, body" }, { status: 400 })
        }

        const result = await addIssueComment({ owner, repo, issueNumber, body: bodyText, token })
        return NextResponse.json({ ok: true, result }, { status: 201 })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${String(action)}` }, { status: 400 })
    }
  } catch (e: any) {
    console.error("Error in github POST:", e?.message ?? e)
    const status = e?.status ?? 500
    const message = e?.message ?? "Internal server error"
    const details = e?.body ?? null
    return NextResponse.json({ error: message, details }, { status })
  }
}
