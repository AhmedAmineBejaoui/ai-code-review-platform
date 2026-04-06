import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { proxyBackendRequest } from "@/lib/backend-admin"
import crypto from "crypto"

// Types for GitHub webhook events
interface GitHubWebhookEvent {
  action: string
  repository?: {
    full_name: string
    id: number
    name: string
  }
  member?: {
    login: string
    email?: string
    type: string
  }
  collaborator?: {
    login: string
    email?: string
    type: string
  }
  organization?: {
    login: string
    id: number
  }
  sender: {
    login: string
    type: string
  }
}

// Verify GitHub webhook signature
function verifyGitHubSignature(payload: string, signature: string): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (!secret) {
    console.error("GITHUB_WEBHOOK_SECRET not configured")
    return false
  }

  const hmac = crypto.createHmac("sha256", secret)
  const digest = "sha256=" + hmac.update(payload, "utf8").digest("hex")
  
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
}

// POST /api/webhooks/github
export async function POST(request: NextRequest) {
  try {
    const headersList = headers()
    const signature = headersList.get("x-hub-signature-256")
    const githubEvent = headersList.get("x-github-event")
    const deliveryId = headersList.get("x-github-delivery")

    console.log(`[GitHub Webhook] Event: ${githubEvent}, Delivery: ${deliveryId}`)

    if (!signature) {
      return NextResponse.json({ error: "No signature provided" }, { status: 401 })
    }

    const payload = await request.text()
    
    // Verify webhook signature
    if (!verifyGitHubSignature(payload, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const event: GitHubWebhookEvent = JSON.parse(payload)

    // Handle different GitHub events
    switch (githubEvent) {
      case "member":
        await handleMemberEvent(event)
        break
        
      case "membership":
        await handleMembershipEvent(event)
        break
        
      case "collaborator":
        await handleCollaboratorEvent(event)
        break
        
      case "push":
        await handlePushEvent(event)
        break
        
      case "repository":
        await handleRepositoryEvent(event)
        break
        
      default:
        console.log(`[GitHub Webhook] Unhandled event type: ${githubEvent}`)
    }

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${githubEvent} event`,
      deliveryId 
    })

  } catch (error) {
    console.error("[GitHub Webhook] Error:", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}

// Handle member addition/removal from repository
async function handleMemberEvent(event: GitHubWebhookEvent) {
  const { action, repository, member } = event
  
  if (!repository || !member) return

  console.log(`[GitHub Webhook] Member ${action} in ${repository.full_name}: ${member.login}`)

  try {
    await proxyBackendRequest({
      path: "/api/v1/webhooks/github/member",
      method: "POST",
      data: {
        action, // added, removed, edited
        repository_full_name: repository.full_name,
        repository_id: repository.id,
        member: {
          github_login: member.login,
          email: member.email,
          type: member.type
        }
      },
      requireAuth: false // Webhook doesn't have user context
    })
  } catch (error) {
    console.error(`[GitHub Webhook] Failed to process member event:`, error)
  }
}

// Handle organization membership changes
async function handleMembershipEvent(event: GitHubWebhookEvent) {
  const { action, organization, member } = event
  
  if (!organization || !member) return

  console.log(`[GitHub Webhook] Org membership ${action}: ${member.login} in ${organization.login}`)

  try {
    await proxyBackendRequest({
      path: "/api/v1/webhooks/github/membership",
      method: "POST", 
      data: {
        action, // added, removed
        organization: {
          github_login: organization.login,
          id: organization.id
        },
        member: {
          github_login: member.login,
          email: member.email,
          type: member.type
        }
      },
      requireAuth: false
    })
  } catch (error) {
    console.error(`[GitHub Webhook] Failed to process membership event:`, error)
  }
}

// Handle collaborator changes
async function handleCollaboratorEvent(event: GitHubWebhookEvent) {
  const { action, repository, collaborator } = event
  
  if (!repository || !collaborator) return

  console.log(`[GitHub Webhook] Collaborator ${action} in ${repository.full_name}: ${collaborator.login}`)

  try {
    await proxyBackendRequest({
      path: "/api/v1/webhooks/github/collaborator",
      method: "POST",
      data: {
        action, // added, removed
        repository_full_name: repository.full_name,
        repository_id: repository.id,
        collaborator: {
          github_login: collaborator.login,
          email: collaborator.email,
          type: collaborator.type
        }
      },
      requireAuth: false
    })
  } catch (error) {
    console.error(`[GitHub Webhook] Failed to process collaborator event:`, error)
  }
}

// Handle new commits/branches
async function handlePushEvent(event: GitHubWebhookEvent) {
  const { repository } = event
  
  if (!repository) return

  console.log(`[GitHub Webhook] Push event in ${repository.full_name}`)

  try {
    await proxyBackendRequest({
      path: "/api/v1/webhooks/github/push",
      method: "POST",
      data: {
        repository_full_name: repository.full_name,
        repository_id: repository.id,
        // GitHub sends full push event payload
        ...event
      },
      requireAuth: false
    })
  } catch (error) {
    console.error(`[GitHub Webhook] Failed to process push event:`, error)
  }
}

// Handle repository changes (renamed, transferred, etc.)
async function handleRepositoryEvent(event: GitHubWebhookEvent) {
  const { action, repository } = event
  
  if (!repository) return

  console.log(`[GitHub Webhook] Repository ${action}: ${repository.full_name}`)

  try {
    await proxyBackendRequest({
      path: "/api/v1/webhooks/github/repository",
      method: "POST",
      data: {
        action, // created, deleted, archived, renamed, transferred
        repository: {
          full_name: repository.full_name,
          id: repository.id,
          name: repository.name
        }
      },
      requireAuth: false
    })
  } catch (error) {
    console.error(`[GitHub Webhook] Failed to process repository event:`, error)
  }
}

// GET endpoint for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    status: "GitHub webhook endpoint active",
    timestamp: new Date().toISOString()
  })
}