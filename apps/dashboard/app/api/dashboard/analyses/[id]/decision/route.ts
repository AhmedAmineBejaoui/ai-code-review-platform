import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { extractRoleFromClaims, normalizeRole, type AppRole } from "@/lib/roles"

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

type DecisionBody = {
  decision?: unknown
  comment?: unknown
}

function resolveUserRole(user: Awaited<ReturnType<typeof currentUser>>, claims: unknown): AppRole {
  const roleCandidate = user?.publicMetadata?.role ?? user?.unsafeMetadata?.role ?? user?.privateMetadata?.role
  if (typeof roleCandidate === "string" && roleCandidate.trim().length > 0) {
    return normalizeRole(roleCandidate)
  }
  return extractRoleFromClaims(claims)
}

export async function POST(request: Request, context: { params: { id: string } }) {
  const analysisId = context.params.id
  if (!analysisId || analysisId.trim().length === 0) {
    return NextResponse.json({ error: "Invalid analysis id" }, { status: 400 })
  }

  const { userId, getToken, sessionClaims } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [token, user] = await Promise.all([getToken(), currentUser()])
  if (!token) {
    return NextResponse.json({ error: "Missing Clerk token" }, { status: 401 })
  }

  const role = resolveUserRole(user, sessionClaims)
  if (role === "developer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: DecisionBody
  try {
    body = (await request.json()) as DecisionBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const decisionRaw = typeof body.decision === "string" ? body.decision.trim().toUpperCase() : ""
  if (decisionRaw !== "APPROVE" && decisionRaw !== "WARN" && decisionRaw !== "BLOCK") {
    return NextResponse.json({ error: "decision must be one of APPROVE, WARN, BLOCK" }, { status: 400 })
  }
  const comment =
    typeof body.comment === "string" && body.comment.trim().length > 0 ? body.comment.trim().slice(0, 2000) : null

  let backendResponse: Response
  try {
    backendResponse = await fetch(`${BACKEND_API_BASE_URL}/v1/analyses/${analysisId}/decision`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-User-Id": userId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        decision: decisionRaw,
        comment,
      }),
      cache: "no-store",
    })
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 })
  }

  const rawBackendBody = await backendResponse.text()
  let parsedBackendBody: unknown = {}
  if (rawBackendBody) {
    try {
      parsedBackendBody = JSON.parse(rawBackendBody)
    } catch {
      parsedBackendBody = { detail: rawBackendBody }
    }
  }

  return NextResponse.json(parsedBackendBody, { status: backendResponse.status })
}
