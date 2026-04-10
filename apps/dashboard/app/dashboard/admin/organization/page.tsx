"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Building2, Users, Settings, Plus, Edit, Trash2 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface Organization {
  id: string
  name: string
  slug: string
  description: string | null
  memberCount: number
  createdAt: string
  updatedAt: string
}

export default function OrganizationPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
  })

  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/dashboard/admin/organizations", {
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`Failed to load organizations: ${response.status}`)
      }

      const data = await response.json()
      setOrganizations(data.organizations || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load organizations")
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const response = await fetch("/api/dashboard/admin/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to create organization")
      }

      setShowCreateDialog(false)
      setFormData({ name: "", slug: "", description: "" })
      loadOrganizations()
    } catch (err) {
      console.error("Create organization failed:", err)
    }
  }

  const handleUpdate = async () => {
    if (!editingOrg) return

    try {
      const response = await fetch(`/api/dashboard/admin/organizations/${editingOrg.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to update organization")
      }

      setEditingOrg(null)
      setFormData({ name: "", slug: "", description: "" })
      loadOrganizations()
    } catch (err) {
      console.error("Update organization failed:", err)
    }
  }

  const handleDelete = async (orgId: string) => {
    if (!confirm("Are you sure you want to delete this organization?")) return

    try {
      const response = await fetch(`/api/dashboard/admin/organizations/${orgId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete organization")
      }

      loadOrganizations()
    } catch (err) {
      console.error("Delete organization failed:", err)
    }
  }

  const openEditDialog = (org: Organization) => {
    setEditingOrg(org)
    setFormData({
      name: org.name,
      slug: org.slug,
      description: org.description || "",
    })
  }

  const closeDialog = () => {
    setShowCreateDialog(false)
    setEditingOrg(null)
    setFormData({ name: "", slug: "", description: "" })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading organizations...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <Building2 className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
                Error Loading Organizations
              </h3>
              <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
              <Button onClick={loadOrganizations} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="h-8 w-8 text-blue-500" />
            Organization Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage organizations and their settings
          </p>
        </div>

        <Dialog open={showCreateDialog || editingOrg !== null} onOpenChange={closeDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingOrg ? "Edit Organization" : "Create New Organization"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Organization name"
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="organization-slug"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Organization description"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button onClick={editingOrg ? handleUpdate : handleCreate}>
                  {editingOrg ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organizations ({organizations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {organizations.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Organizations</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first organization.
                </p>
                <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Organization
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{org.slug}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {org.description || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {org.memberCount}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(org.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(org)}
                            className="gap-1"
                          >
                            <Edit className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(org.id)}
                            className="gap-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}