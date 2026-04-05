"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
  Plus, Search, FileText, Lock, Globe, Edit, Copy, Trash2,
  Settings, List, Shield, Zap, Code, Database, CheckCircle,
  AlertTriangle, Clock, Target, Users
} from "lucide-react"
import { useDashboardUser } from "@/components/dashboard/dashboard-user-provider"
import { isReviewerLead } from "@/lib/roles"

interface ReviewTemplate {
  id: string
  name: string
  description: string
  category: string
  is_default: boolean
  is_public: boolean
  created_by: string
  created_by_name?: string
  usage_count: number
  checklist_items: Array<{
    id: string
    label: string
    description?: string
    checked: boolean
  }>
  guidelines: string
  auto_apply_rules: {
    severity?: string[]
    categories?: string[]
  }
  created_at: string
  updated_at: string
}

const TEMPLATE_CATEGORIES = [
  { value: "general", label: "General Code Review", icon: Code },
  { value: "security", label: "Security Review", icon: Shield },
  { value: "performance", label: "Performance Review", icon: Zap },
  { value: "critical_change", label: "Critical Change Review", icon: AlertTriangle },
  { value: "frontend", label: "Frontend Specific", icon: Globe },
  { value: "backend", label: "Backend Specific", icon: Database },
]

const DEFAULT_TEMPLATES = [
  {
    id: "default_general",
    name: "General Code Review",
    description: "Standard checklist for all code reviews",
    category: "general",
    is_default: true,
    is_public: true,
    created_by: "system",
    created_by_name: "System",
    usage_count: 156,
    checklist_items: [
      { id: "1", label: "Code follows project conventions", checked: false },
      { id: "2", label: "No obvious security vulnerabilities", checked: false },
      { id: "3", label: "Error handling is appropriate", checked: false },
      { id: "4", label: "Code is well-documented", checked: false },
      { id: "5", label: "Tests cover new functionality", checked: false },
    ],
    guidelines: "Review code for quality, security, and maintainability.",
    auto_apply_rules: {},
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "default_security",
    name: "Security Review",
    description: "Comprehensive security-focused review checklist",
    category: "security",
    is_default: true,
    is_public: true,
    created_by: "system",
    created_by_name: "System",
    usage_count: 89,
    checklist_items: [
      { id: "1", label: "Input validation is implemented", checked: false },
      { id: "2", label: "SQL injection protection in place", checked: false },
      { id: "3", label: "XSS prevention measures applied", checked: false },
      { id: "4", label: "Authentication & authorization checks", checked: false },
      { id: "5", label: "Sensitive data is properly encrypted", checked: false },
      { id: "6", label: "No hardcoded secrets or credentials", checked: false },
    ],
    guidelines: "Focus on security vulnerabilities and best practices.",
    auto_apply_rules: { categories: ["security"] },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  }
]

export default function TemplatesPage() {
  const currentUser = useDashboardUser()
  const [templates, setTemplates] = useState<ReviewTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<ReviewTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ReviewTemplate | null>(null)

  const hasPermission = isReviewerLead(currentUser.role)

  useEffect(() => {
    if (!hasPermission) return

    const fetchTemplates = async () => {
      try {
        setLoading(true)
        // Mock API call - would fetch from /api/v1/reviews/templates
        await new Promise(resolve => setTimeout(resolve, 1000))
        setTemplates(DEFAULT_TEMPLATES)
      } catch (err) {
        console.error("Failed to fetch templates:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [hasPermission])

  useEffect(() => {
    let filtered = templates

    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(template => template.category === selectedCategory)
    }

    setFilteredTemplates(filtered)
  }, [templates, searchTerm, selectedCategory])

  // Check permissions after hooks
  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Shield className="h-12 w-12 text-yellow-500 mx-auto" />
              <div>
                <h3 className="font-semibold text-lg">Access Restricted</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Template management is only available to Lead Reviewers.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getCategoryIcon = (category: string) => {
    const categoryConfig = TEMPLATE_CATEGORIES.find(cat => cat.value === category)
    return categoryConfig?.icon || FileText
  }

  const handleCreateTemplate = () => {
    setEditingTemplate({
      id: "",
      name: "",
      description: "",
      category: "general",
      is_default: false,
      is_public: false,
      created_by: currentUser.id,
      created_by_name: currentUser.name,
      usage_count: 0,
      checklist_items: [
        { id: "1", label: "New checklist item", description: "", checked: false }
      ],
      guidelines: "",
      auto_apply_rules: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    setIsCreateDialogOpen(true)
  }

  const handleEditTemplate = (template: ReviewTemplate) => {
    setEditingTemplate({ ...template })
    setIsCreateDialogOpen(true)
  }

  const handleDuplicateTemplate = (template: ReviewTemplate) => {
    const duplicated = {
      ...template,
      id: "",
      name: `${template.name} (Copy)`,
      is_default: false,
      created_by: currentUser.id,
      created_by_name: currentUser.name,
      usage_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    setEditingTemplate(duplicated)
    setIsCreateDialogOpen(true)
  }

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return

    try {
      // Mock save - would call API
      if (editingTemplate.id) {
        // Update existing
        setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? editingTemplate : t))
      } else {
        // Create new
        const newTemplate = { ...editingTemplate, id: `custom_${Date.now()}` }
        setTemplates(prev => [...prev, newTemplate])
      }

      setIsCreateDialogOpen(false)
      setEditingTemplate(null)
    } catch (err) {
      console.error("Failed to save template:", err)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      try {
        // Mock delete - would call API
        setTemplates(prev => prev.filter(t => t.id !== templateId))
      } catch (err) {
        console.error("Failed to delete template:", err)
      }
    }
  }

  const addChecklistItem = () => {
    if (!editingTemplate) return

    const newItem = {
      id: Date.now().toString(),
      label: "New checklist item",
      description: "",
      checked: false
    }

    setEditingTemplate({
      ...editingTemplate,
      checklist_items: [...editingTemplate.checklist_items, newItem]
    })
  }

  const updateChecklistItem = (itemId: string, updates: Partial<ReviewTemplate['checklist_items'][0]>) => {
    if (!editingTemplate) return

    setEditingTemplate({
      ...editingTemplate,
      checklist_items: editingTemplate.checklist_items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      )
    })
  }

  const removeChecklistItem = (itemId: string) => {
    if (!editingTemplate) return

    setEditingTemplate({
      ...editingTemplate,
      checklist_items: editingTemplate.checklist_items.filter(item => item.id !== itemId)
    })
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-200 rounded"></div>
          <div className="h-10 w-32 bg-gray-200 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Review Templates</h1>
          <p className="text-gray-600 mt-1">
            Create and manage reusable review checklists and guidelines
          </p>
        </div>
        <Button onClick={handleCreateTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {TEMPLATE_CATEGORIES.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => {
          const CategoryIcon = getCategoryIcon(template.category)
          const canEdit = template.created_by === currentUser.id || !template.is_default

          return (
            <Card key={template.id} className="relative group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <CategoryIcon className="h-5 w-5 text-blue-600" />
                    <Badge variant={template.is_default ? "default" : "secondary"}>
                      {TEMPLATE_CATEGORIES.find(cat => cat.value === template.category)?.label}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-1">
                    {template.is_public ? (
                      <Globe className="h-4 w-4 text-green-600" aria-label="Public" />
                    ) : (
                      <Lock className="h-4 w-4 text-gray-400" aria-label="Private" />
                    )}
                  </div>
                </div>
                <div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="text-sm">
                  <div className="flex items-center text-gray-600 mb-2">
                    <List className="h-4 w-4 mr-1" />
                    {template.checklist_items.length} checklist items
                  </div>
                  <div className="space-y-1">
                    {template.checklist_items.slice(0, 3).map(item => (
                      <div key={item.id} className="flex items-center text-xs text-gray-500">
                        <CheckCircle className="h-3 w-3 mr-2" />
                        {item.label}
                      </div>
                    ))}
                    {template.checklist_items.length > 3 && (
                      <div className="text-xs text-gray-400 pl-5">
                        +{template.checklist_items.length - 3} more items
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Used {template.usage_count} times</span>
                  <span>by {template.created_by_name || "Unknown"}</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <Button variant="outline" size="sm">
                    Use Template
                  </Button>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicateTemplate(template)}
                      title="Duplicate"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTemplate(template)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!template.is_default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                            title="Delete"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredTemplates.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
              <p className="text-gray-500">
                {searchTerm || selectedCategory !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "Create your first template to get started"
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Template Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.id ? "Edit Template" : "Create New Template"}
            </DialogTitle>
          </DialogHeader>

          {editingTemplate && (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input
                    id="template-name"
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    placeholder="Enter template name"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="template-category">Category</Label>
                  <Select
                    value={editingTemplate.category}
                    onValueChange={(value) => setEditingTemplate({ ...editingTemplate, category: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_CATEGORIES.map(category => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  value={editingTemplate.description}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  placeholder="Describe what this template is used for"
                  className="mt-2"
                />
              </div>

              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingTemplate.is_public}
                    onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, is_public: checked })}
                  />
                  <Label>Make template public (visible to team)</Label>
                </div>
              </div>

              <Separator />

              {/* Checklist Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base font-medium">Checklist Items</Label>
                  <Button onClick={addChecklistItem} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-3">
                  {editingTemplate.checklist_items.map((item, index) => (
                    <div key={item.id} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={item.label}
                          onChange={(e) => updateChecklistItem(item.id, { label: e.target.value })}
                          placeholder="Checklist item"
                        />
                        <Input
                          value={item.description || ""}
                          onChange={(e) => updateChecklistItem(item.id, { description: e.target.value })}
                          placeholder="Optional description"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeChecklistItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Guidelines */}
              <div>
                <Label htmlFor="template-guidelines">Guidelines (Markdown)</Label>
                <Textarea
                  id="template-guidelines"
                  value={editingTemplate.guidelines}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, guidelines: e.target.value })}
                  placeholder="Provide detailed guidelines for using this template..."
                  rows={6}
                  className="mt-2 font-mono"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false)
                    setEditingTemplate(null)
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveTemplate}>
                  {editingTemplate.id ? "Update Template" : "Create Template"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
