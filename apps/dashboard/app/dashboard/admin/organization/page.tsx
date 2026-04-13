"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Github,
  Link2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Unplug,
  Users,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"

type CreateMode = "platform" | "github_import"

interface Organization {
  id: string
  name: string
  slug: string | null
  description: string | null
  memberCount: number
  createdAt: string | null
  updatedAt: string | null
  clerkOrgId: string | null
  githubOrgId: string | null
  githubOrgLogin: string | null
  source: string
  syncStatus: string
}

interface GithubOrganization {
  id: string
  login: string
  name: string
  description: string | null
  avatarUrl: string | null
  htmlUrl: string | null
}

interface Capabilities {
  canCreateGithubOrganizations: boolean
  githubCreationReason: string
}

interface OrganizationsResponse {
  organizations: Organization[]
  githubOrganizations: GithubOrganization[]
  capabilities: Capabilities
}

interface FormState {
  name: string
  slug: string
  description: string
  githubOrgLogin: string
}

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  description: "",
  githubOrgLogin: "",
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-"
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return "-"
  }

  return parsed.toLocaleDateString()
}

function getSyncBadgeVariant(syncStatus: string) {
  switch (syncStatus) {
    case "linked":
      return "success"
    case "clerk_only":
      return "secondary"
    case "github_only":
      return "warning"
    case "error":
      return "error"
    default:
      return "outline"
  }
}

export default function OrganizationPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [githubOrganizations, setGithubOrganizations] = useState<GithubOrganization[]>([])
  const [capabilities, setCapabilities] = useState<Capabilities>({
    canCreateGithubOrganizations: false,
    githubCreationReason: "",
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<CreateMode>("github_import")
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const linkedCount = useMemo(
    () => organizations.filter((org) => org.syncStatus === "linked").length,
    [organizations],
  )

  useEffect(() => {
    void loadOrganizations()
  }, [])

  async function loadOrganizations(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError(null)

    try {
      const response = await fetch("/api/dashboard/admin/organizations", {
        cache: "no-store",
      })

      const payload = (await response.json().catch(() => null)) as OrganizationsResponse | { error?: string } | null

      if (!response.ok) {
        throw new Error(payload && "error" in payload && payload.error ? payload.error : `Failed to load organizations: ${response.status}`)
      }

      setOrganizations(Array.isArray(payload?.organizations) ? payload.organizations : [])
      setGithubOrganizations(Array.isArray(payload?.githubOrganizations) ? payload.githubOrganizations : [])
      setCapabilities(
        payload?.capabilities ?? {
          canCreateGithubOrganizations: false,
          githubCreationReason: "",
        },
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load organizations")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  function resetDialogState() {
    setDialogOpen(false)
    setEditingOrg(null)
    setDialogMode("github_import")
    setFormData(EMPTY_FORM)
    setFormError(null)
    setSubmitting(false)
  }

  function openCreateDialog(mode: CreateMode) {
    setEditingOrg(null)
    setDialogMode(mode)
    setFormData(EMPTY_FORM)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEditDialog(org: Organization) {
    setEditingOrg(org)
    setDialogMode(org.githubOrgLogin ? "github_import" : "platform")
    setFormData({
      name: org.name,
      slug: org.slug ?? "",
      description: org.description ?? "",
      githubOrgLogin: org.githubOrgLogin ?? "",
    })
    setFormError(null)
    setDialogOpen(true)
  }

  function applyGithubOrganization(login: string) {
    const selected = githubOrganizations.find((org) => org.login === login)
    setFormData((current) => {
      if (!selected) {
        return {
          ...current,
          githubOrgLogin: "",
        }
      }

      const nextName =
        editingOrg || dialogMode === "platform"
          ? current.name
          : current.name || selected.name || selected.login

      const nextSlug =
        editingOrg || dialogMode === "platform"
          ? current.slug
          : current.slug || slugify(selected.login)

      const nextDescription =
        editingOrg || dialogMode === "platform"
          ? current.description
          : current.description || selected.description || ""

      return {
        ...current,
        githubOrgLogin: login,
        name: nextName,
        slug: nextSlug,
        description: nextDescription,
      }
    })
  }

  async function handleCreate() {
    setSubmitting(true)
    setFormError(null)

    try {
      const response = await fetch("/api/dashboard/admin/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: dialogMode,
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          githubOrgLogin: formData.githubOrgLogin || undefined,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to create organization")
      }

      resetDialogState()
      await loadOrganizations({ silent: true })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create organization")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdate() {
    if (!editingOrg) {
      return
    }

    setSubmitting(true)
    setFormError(null)

    try {
      const response = await fetch(`/api/dashboard/admin/organizations/${editingOrg.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          githubOrgLogin: formData.githubOrgLogin || "",
        }),
      })

      const payload = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to update organization")
      }

      resetDialogState()
      await loadOrganizations({ silent: true })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to update organization")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(org: Organization) {
    const confirmed = window.confirm(
      `Delete organization '${org.name}'?\n\nThe platform organization will be archived and the linked Clerk organization will also be removed if it exists. The GitHub organization will not be deleted.`,
    )
    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/dashboard/admin/organizations/${org.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error || "Failed to delete organization")
      }

      await loadOrganizations({ silent: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete organization")
    }
  }

  const selectedGithubOrg = githubOrganizations.find((org) => org.login === formData.githubOrgLogin) ?? null

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Loader2 className="mr-3 h-5 w-5 animate-spin text-orange" />
        <span className="text-muted-foreground">Loading organization workspace...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="flex items-center gap-3 text-4xl font-semibold tracking-[-0.05em] text-foreground">
            <Building2 className="h-8 w-8 text-orange" />
            Organization Management
          </h1>
          <p className="text-muted-foreground">
            Create real organizations in the platform, sync them with Clerk, and link an existing GitHub organization.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => void loadOrganizations({ silent: true })} disabled={refreshing}>
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => openCreateDialog("github_import")}>
            <Github className="h-4 w-4" />
            Import GitHub Org
          </Button>
          <Button className="gap-2" onClick={() => openCreateDialog("platform")}>
            <Plus className="h-4 w-4" />
            Create Platform Org
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">Platform organizations</div>
            <div className="mt-2 text-3xl font-semibold">{organizations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">Linked to GitHub</div>
            <div className="mt-2 text-3xl font-semibold">{linkedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">Available GitHub orgs</div>
            <div className="mt-2 text-3xl font-semibold">{githubOrganizations.length}</div>
          </CardContent>
        </Card>
      </div>

      <Alert className="border-orange/30 bg-orange/5">
        <AlertTriangle className="text-orange" />
        <AlertTitle>Real organization flow</AlertTitle>
        <AlertDescription>
          <p>{capabilities.githubCreationReason || "GitHub organizations are linked from existing GitHub data."}</p>
          <p>
            The implemented flow is: create platform organization, create or reuse Clerk organization, then link an existing GitHub organization.
          </p>
        </AlertDescription>
      </Alert>

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Organization management failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
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
              <div className="space-y-4 py-10 text-center">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                <div className="space-y-1">
                  <h3 className="text-lg font-medium">No organizations yet</h3>
                  <p className="text-muted-foreground">
                    Start with a platform organization or import an existing GitHub organization and bind it to Clerk.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button variant="outline" onClick={() => openCreateDialog("github_import")}>
                    <Github className="mr-2 h-4 w-4" />
                    Import GitHub Org
                  </Button>
                  <Button onClick={() => openCreateDialog("platform")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Platform Org
                  </Button>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Clerk</TableHead>
                    <TableHead>GitHub</TableHead>
                    <TableHead>Sync</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{org.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {org.slug || "-"}
                          </div>
                          {org.description ? (
                            <div className="max-w-md text-xs text-muted-foreground">
                              {org.description}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {org.clerkOrgId ? (
                          <Badge variant="outlinePrimary" size="sm">
                            <ShieldCheck className="h-3 w-3" />
                            {org.clerkOrgId}
                          </Badge>
                        ) : (
                          <Badge variant="outline" size="sm">
                            <Unplug className="h-3 w-3" />
                            Not linked
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {org.githubOrgLogin ? (
                          <Badge variant="outline" size="sm">
                            <Github className="h-3 w-3" />
                            {org.githubOrgLogin}
                          </Badge>
                        ) : (
                          <Badge variant="outline" size="sm">
                            <Unplug className="h-3 w-3" />
                            Not linked
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSyncBadgeVariant(org.syncStatus)} size="sm">
                          <Link2 className="h-3 w-3" />
                          {org.syncStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {org.memberCount}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(org.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(org)}>
                            <Pencil className="mr-2 h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => void handleDelete(org)}
                          >
                            <Trash2 className="mr-2 h-3 w-3" />
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

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : resetDialogState())}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingOrg
                ? `Edit organization: ${editingOrg.name}`
                : dialogMode === "github_import"
                  ? "Import GitHub organization"
                  : "Create platform organization"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {!editingOrg ? (
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setDialogMode("github_import")}
                  className={`rounded-xl border p-4 text-left transition ${
                    dialogMode === "github_import"
                      ? "border-orange bg-orange/10"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    <Github className="h-4 w-4 text-orange" />
                    Import existing GitHub org
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Best option when the organization already exists on GitHub and must be linked to Clerk.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setDialogMode("platform")}
                  className={`rounded-xl border p-4 text-left transition ${
                    dialogMode === "platform"
                      ? "border-orange bg-orange/10"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    <Building2 className="h-4 w-4 text-orange" />
                    Create platform + Clerk org
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Creates the internal organization and the Clerk organization now. GitHub can stay optional.
                  </p>
                </button>
              </div>
            ) : null}

            <Alert className="border-border bg-muted/30">
              <CheckCircle2 className="text-orange" />
              <AlertTitle>Scenario applied</AlertTitle>
              <AlertDescription>
                {editingOrg
                  ? "You are editing the local platform record and its Clerk synchronization metadata."
                  : dialogMode === "github_import"
                    ? "GitHub organization -> Clerk organization -> platform organization."
                    : "Platform organization -> Clerk organization, with optional GitHub link."}
              </AlertDescription>
            </Alert>

            {formError ? (
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertTitle>Action failed</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="github-org">GitHub organization</Label>
              <Select
                value={formData.githubOrgLogin || "__none__"}
                onValueChange={(value) => applyGithubOrganization(value === "__none__" ? "" : value)}
              >
                <SelectTrigger id="github-org">
                  <SelectValue placeholder="Select a GitHub organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    {dialogMode === "github_import" && !editingOrg ? "No selection" : "No GitHub link"}
                  </SelectItem>
                  {githubOrganizations.map((org) => (
                    <SelectItem key={org.login} value={org.login}>
                      {org.name} ({org.login})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {dialogMode === "github_import" && !editingOrg
                  ? "Required for GitHub import. Selecting an organization pre-fills the local record."
                  : "Optional. Use this to link the platform organization to an existing GitHub organization."}
              </p>
            </div>

            {selectedGithubOrg ? (
              <Card className="border-border/60 bg-muted/20">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 font-medium">
                      <Github className="h-4 w-4 text-orange" />
                      {selectedGithubOrg.name}
                    </div>
                    <div className="text-sm text-muted-foreground">{selectedGithubOrg.login}</div>
                    {selectedGithubOrg.description ? (
                      <div className="text-sm text-muted-foreground">{selectedGithubOrg.description}</div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="org-name">Name</Label>
                <Input
                  id="org-name"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      name: event.target.value,
                      slug: current.slug || slugify(event.target.value),
                    }))
                  }
                  placeholder="Organization name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug">Slug</Label>
                <Input
                  id="org-slug"
                  value={formData.slug}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      slug: slugify(event.target.value),
                    }))
                  }
                  placeholder="organization-slug"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="org-description">Description</Label>
              <Textarea
                id="org-description"
                value={formData.description}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="What is this organization used for?"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetDialogState} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={editingOrg ? handleUpdate : handleCreate} disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingOrg ? "Save changes" : "Create organization"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
