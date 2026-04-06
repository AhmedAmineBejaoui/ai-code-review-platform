import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { permissionValidator } from "@/lib/github-permissions"

interface GitHubRepository {
  full_name: string
  permissions: {
    admin: boolean
    maintain: boolean
    push: boolean
    pull: boolean
  }
  owner: {
    login: string
    type: "User" | "Organization"
  }
  private: boolean
}

interface GitHubUser {
  login: string
  type: "User" | "Organization"
}

// POST /api/dashboard/github/permissions/validate
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

    // Use the permission validator service
    const validationResult = await permissionValidator.validateImportPermissions(repository)
    
    return NextResponse.json(validationResult)
    
  } catch (error) {
    console.error("Permission validation error:", error)
    return NextResponse.json(
      { error: "Failed to validate permissions" },
      { status: 500 }
    )
  }
}