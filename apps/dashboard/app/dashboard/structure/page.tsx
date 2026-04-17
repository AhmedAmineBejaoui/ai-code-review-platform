"use client"

import React from "react"
import { OrganizationHierarchyNav } from "@/components/dashboard/OrganizationHierarchyNav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building, Users, GitBranch, Code, Plus, Settings } from "lucide-react"

interface Props {
  organizationId?: string
}

export default function OrganizationStructurePage({ organizationId = "org_2nBb5U9NKUwBW6G46YXzGgTnQRP" }: Props) {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building className="h-8 w-8 text-primary" />
            Organization Structure
          </h1>
          <p className="text-muted-foreground mt-2">
            Navigate through your organization hierarchy: Projects → Teams → Repositories → Branches
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Project
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-4">
          <OrganizationHierarchyNav 
            organizationId={organizationId}
            className="sticky top-6"
          />
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Projects</p>
                    <p className="text-2xl font-bold">--</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Teams</p>
                    <p className="text-2xl font-bold">--</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium">Repositories</p>
                    <p className="text-2xl font-bold">--</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Active</p>
                    <p className="text-2xl font-bold">--</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Structure Overview</CardTitle>
              <CardDescription>
                Select an item from the navigation to view details, manage settings, or perform actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground space-y-4">
                <Building className="h-16 w-16 mx-auto opacity-50" />
                <div>
                  <h3 className="text-lg font-medium">Welcome to Organization Structure</h3>
                  <p className="text-sm">
                    Use the navigation on the left to explore your projects, teams, repositories and branches.
                    You can create new items, manage permissions, and view detailed information for each component.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 max-w-2xl mx-auto">
                  <div className="p-4 border rounded-lg">
                    <Code className="h-6 w-6 text-blue-600 mb-2" />
                    <h4 className="font-medium mb-1">Projects</h4>
                    <p className="text-xs text-muted-foreground">
                      Organize your work into logical projects with teams and repositories
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <Users className="h-6 w-6 text-green-600 mb-2" />
                    <h4 className="font-medium mb-1">Teams</h4>
                    <p className="text-xs text-muted-foreground">
                      Manage team members, roles and permissions within projects
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <GitBranch className="h-6 w-6 text-orange-600 mb-2" />
                    <h4 className="font-medium mb-1">Repositories</h4>
                    <p className="text-xs text-muted-foreground">
                      Connect GitHub repos to teams and manage code organization
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <Building className="h-6 w-6 text-purple-600 mb-2" />
                    <h4 className="font-medium mb-1">Branches</h4>
                    <p className="text-xs text-muted-foreground">
                      Monitor branches, commits and development activity
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}