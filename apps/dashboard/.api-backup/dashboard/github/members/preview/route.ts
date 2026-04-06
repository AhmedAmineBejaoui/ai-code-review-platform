import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getGitHubToken, getGitHubHeaders } from "@/lib/github"

interface GitHubUser {
  login: string
  email?: string
  name?: string
  avatar_url: string
  type: "User" | "Bot"
  site_admin: boolean
}

interface GitHubCollaborator extends GitHubUser {
  permissions: {
    admin: boolean
    maintain: boolean
    push: boolean
    triage: boolean
    pull: boolean
  }
  role_name: string
}

interface GitHubRepository {
  full_name: string
  name: string
  owner: {
    login: string
    type: "User" | "Organization"
  }
  private: boolean
  permissions: {
    admin: boolean
    maintain: boolean
    push: boolean
  }
}

// Suggest role based on GitHub permissions and activity
function suggestRole(collaborator: GitHubCollaborator, isOwner: boolean): string {
  if (isOwner || collaborator.permissions.admin) {
    return "admin"
  }
  
  if (collaborator.permissions.maintain) {
    return "tech_lead"
  }
  
  if (collaborator.permissions.push) {
    return "senior_reviewer"
  }
  
  return "developer"
}

// POST /api/dashboard/github/members/preview
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { repository } = await request.json()
    
    if (!repository) {
      return NextResponse.json(
        { error: "Repository name required" },
        { status: 400 }
      )
    }

    // Get GitHub token
    const token = await getGitHubToken(userId)
    if (!token) {
      return NextResponse.json(
        { error: "GitHub token not found. Please connect your GitHub account." },
        { status: 401 }
      )
    }

    const headers = {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "AI-Code-Review-Platform"
    }

    // Fetch repository information
    const repoResponse = await fetch(`https://api.github.com/repos/${repository}`, { headers })
    if (!repoResponse.ok) {
      const error = await repoResponse.json()
      return NextResponse.json(
        { error: `Failed to fetch repository: ${error.message}` },
        { status: repoResponse.status }
      )
    }
    const repoData: GitHubRepository = await repoResponse.json()

    // Fetch collaborators
    let collaborators: GitHubCollaborator[] = []
    try {
      const collabResponse = await fetch(
        `https://api.github.com/repos/${repository}/collaborators?per_page=100`,
        { headers }
      )
      if (collabResponse.ok) {
        collaborators = await collabResponse.json()
      }
    } catch (error) {
      console.warn("Could not fetch collaborators:", error)
    }

    // Fetch organization members (if repository is owned by an organization)
    let organization = null
    let organizationMembers: GitHubUser[] = []
    
    if (repoData.owner.type === "Organization") {
      try {
        // Get organization info
        const orgResponse = await fetch(
          `https://api.github.com/orgs/${repoData.owner.login}`,
          { headers }
        )
        if (orgResponse.ok) {
          organization = await orgResponse.json()
        }

        // Get organization members (public members only due to API limitations)
        const membersResponse = await fetch(
          `https://api.github.com/orgs/${repoData.owner.login}/members?per_page=100`,
          { headers }
        )
        if (membersResponse.ok) {
          organizationMembers = await membersResponse.json()
        }
      } catch (error) {
        console.warn("Could not fetch organization data:", error)
      }
    }

    // Deduplicate members (collaborators + org members)
    const allMembers = new Map<string, any>()

    // Add collaborators (they have more detailed permissions)
    collaborators.forEach(collab => {
      allMembers.set(collab.login, {
        ...collab,
        source: "collaborator",
        permissions: collab.permissions
      })
    })

    // Add organization members (if not already a collaborator)
    organizationMembers.forEach(member => {
      if (!allMembers.has(member.login)) {
        allMembers.set(member.login, {
          ...member,
          source: "organization",
          permissions: {
            admin: false,
            maintain: false, 
            push: false,
            triage: false,
            pull: true
          }
        })
      }
    })

    // Generate suggested roles
    const suggestedRoles: { [key: string]: string } = {}
    allMembers.forEach((member, login) => {
      const isOwner = login === repoData.owner.login
      suggestedRoles[login] = suggestRole(member, isOwner)
    })

    const response = {
      repository: repoData,
      collaborators,
      organization,
      organization_members: organizationMembers,
      all_members: Array.from(allMembers.values()),
      suggested_roles: suggestedRoles
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("Members preview error:", error)
    return NextResponse.json(
      { error: "Failed to fetch members preview" },
      { status: 500 }
    )
  }
}