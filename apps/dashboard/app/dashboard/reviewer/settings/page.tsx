"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Theme } from "@/components/ui/theme"
import {
  Settings, User, Bell, Zap, Code, Mail, Smartphone,
  CheckCircle, Clock, Target, Shield, Save, AlertCircle, Palette
} from "lucide-react"
import { useDashboardUser } from "@/components/dashboard/dashboard-user-provider"

interface ReviewerSettings {
  // Profile & Capacity
  reviewer_level: string
  reviewer_capacity: number
  reviewer_specialties: string[]
  availability_status: string

  // Auto-Assignment
  auto_assign_enabled: boolean
  priority_levels: string[]
  match_specialties_only: boolean
  preferred_repos: string[]

  // Notifications
  notification_preferences: {
    email: {
      new_assignment: boolean
      overdue_reminder: boolean
      comment_replies: boolean
      daily_digest: boolean
    }
    push: {
      realtime_comments: boolean
      session_invites: boolean
      metrics_updates: boolean
    }
    in_app: {
      all_notifications: boolean
    }
  }

  // Review Defaults
  default_template_id: string | null
  preferred_diff_view: string
  auto_start_timer: boolean
  default_comment_type: string
}

const SPECIALTIES = [
  "Frontend", "Backend", "Security", "Performance", "Database",
  "DevOps", "Mobile", "API Design", "Testing", "Documentation"
]

const PRIORITY_LEVELS = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" }
]

const AVAILABILITY_OPTIONS = [
  { value: "available", label: "Available", color: "bg-green-500" },
  { value: "away", label: "Away", color: "bg-yellow-500" },
  { value: "do_not_disturb", label: "Do Not Disturb", color: "bg-red-500" }
]

export default function ReviewerSettingsPage() {
  const currentUser = useDashboardUser()
  const [settings, setSettings] = useState<ReviewerSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const fetchSettings = async () => {
    try {
      setLoading(true)
      // Mock data - would come from API
      const mockSettings: ReviewerSettings = {
        reviewer_level: currentUser.role || "reviewer_junior",
        reviewer_capacity: 5,
        reviewer_specialties: ["Frontend", "Security"],
        availability_status: "available",
        auto_assign_enabled: true,
        priority_levels: ["critical", "high", "medium"],
        match_specialties_only: true,
        preferred_repos: [],
        notification_preferences: {
          email: {
            new_assignment: true,
            overdue_reminder: true,
            comment_replies: true,
            daily_digest: false
          },
          push: {
            realtime_comments: true,
            session_invites: true,
            metrics_updates: false
          },
          in_app: {
            all_notifications: true
          }
        },
        default_template_id: null,
        preferred_diff_view: "unified",
        auto_start_timer: true,
        default_comment_type: "comment"
      }
      setSettings(mockSettings)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings")
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return

    try {
      setSaving(true)
      // Mock save - would call API
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const updateSettings = (updates: Partial<ReviewerSettings>) => {
    if (settings) {
      setSettings({ ...settings, ...updates })
    }
  }

  const updateNotificationPreference = (
    category: keyof ReviewerSettings['notification_preferences'],
    key: string,
    value: boolean
  ) => {
    if (settings) {
      setSettings({
        ...settings,
        notification_preferences: {
          ...settings.notification_preferences,
          [category]: {
            ...settings.notification_preferences[category],
            [key]: value
          }
        }
      })
    }
  }

  const toggleSpecialty = (specialty: string) => {
    if (!settings) return

    const newSpecialties = settings.reviewer_specialties.includes(specialty)
      ? settings.reviewer_specialties.filter(s => s !== specialty)
      : [...settings.reviewer_specialties, specialty]

    updateSettings({ reviewer_specialties: newSpecialties })
  }

  const togglePriorityLevel = (level: string) => {
    if (!settings) return

    const newLevels = settings.priority_levels.includes(level)
      ? settings.priority_levels.filter(l => l !== level)
      : [...settings.priority_levels, level]

    updateSettings({ priority_levels: newLevels })
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-96 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!settings) return null

  const currentAvailability = AVAILABILITY_OPTIONS.find(opt => opt.value === settings.availability_status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Configure your reviewer preferences and notifications
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {success && (
            <div className="flex items-center text-green-600 text-sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              Settings saved successfully
            </div>
          )}
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center text-red-700">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile & Capacity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600" />
              Profile & Capacity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-medium">Reviewer Level</Label>
              <div className="mt-2">
                <Badge variant="secondary" className="capitalize">
                  {settings.reviewer_level.replace('reviewer_', '')}
                </Badge>
                <p className="text-xs text-gray-500 mt-1">Read-only: Contact admin to change level</p>
              </div>
            </div>

            <div>
              <Label htmlFor="capacity" className="text-sm font-medium">
                Maximum Concurrent Reviews
              </Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                max="20"
                value={settings.reviewer_capacity}
                onChange={(e) => updateSettings({ reviewer_capacity: parseInt(e.target.value) || 1 })}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Specialties</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {SPECIALTIES.map(specialty => (
                  <div
                    key={specialty}
                    onClick={() => toggleSpecialty(specialty)}
                    className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                      settings.reviewer_specialties.includes(specialty)
                        ? "bg-blue-50 border-blue-200 text-blue-800"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <span className="text-sm font-medium">{specialty}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Availability Status</Label>
              <Select
                value={settings.availability_status}
                onValueChange={(value) => updateSettings({ availability_status: value })}
              >
                <SelectTrigger className="mt-2">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-3 ${currentAvailability?.color}`} />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {AVAILABILITY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-3 ${option.color}`} />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Auto-Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2 text-yellow-600" />
              Auto-Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Enable Auto-Assignment</Label>
                <p className="text-xs text-gray-500 mt-1">Automatically receive new reviews</p>
              </div>
              <Switch
                checked={settings.auto_assign_enabled}
                onCheckedChange={(checked) => updateSettings({ auto_assign_enabled: checked })}
              />
            </div>

            {settings.auto_assign_enabled && (
              <>
                <div>
                  <Label className="text-sm font-medium">Accept Priority Levels</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {PRIORITY_LEVELS.map(level => (
                      <div
                        key={level.value}
                        onClick={() => togglePriorityLevel(level.value)}
                        className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                          settings.priority_levels.includes(level.value)
                            ? "bg-green-50 border-green-200 text-green-800"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <span className="text-sm font-medium">{level.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Match Specialties Only</Label>
                    <p className="text-xs text-gray-500 mt-1">Only receive reviews matching your specialties</p>
                  </div>
                  <Switch
                    checked={settings.match_specialties_only}
                    onCheckedChange={(checked) => updateSettings({ match_specialties_only: checked })}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2 text-green-600" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center mb-3">
                <Mail className="h-4 w-4 mr-2 text-blue-600" />
                <Label className="text-sm font-medium">Email Notifications</Label>
              </div>
              <div className="space-y-3">
                {Object.entries(settings.notification_preferences.email).map(([key, enabled]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => updateNotificationPreference('email', key, checked)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center mb-3">
                <Smartphone className="h-4 w-4 mr-2 text-purple-600" />
                <Label className="text-sm font-medium">Push Notifications</Label>
              </div>
              <div className="space-y-3">
                {Object.entries(settings.notification_preferences.push).map(([key, enabled]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => updateNotificationPreference('push', key, checked)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">All In-App Notifications</Label>
                <p className="text-xs text-gray-500 mt-1">Show all notifications in the app</p>
              </div>
              <Switch
                checked={settings.notification_preferences.in_app.all_notifications}
                onCheckedChange={(checked) => updateNotificationPreference('in_app', 'all_notifications', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Review Defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Code className="h-5 w-5 mr-2 text-indigo-600" />
              Review Defaults
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-medium">Default Template</Label>
              <Select
                value={settings.default_template_id || "none"}
                onValueChange={(value) => updateSettings({ default_template_id: value === "none" ? null : value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No default template</SelectItem>
                  <SelectItem value="general">General Code Review</SelectItem>
                  <SelectItem value="security">Security Review</SelectItem>
                  <SelectItem value="performance">Performance Review</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Preferred Diff View</Label>
              <Select
                value={settings.preferred_diff_view}
                onValueChange={(value) => updateSettings({ preferred_diff_view: value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unified">Unified</SelectItem>
                  <SelectItem value="split">Split</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Auto-start Timer</Label>
                <p className="text-xs text-gray-500 mt-1">Start timer when opening a review</p>
              </div>
              <Switch
                checked={settings.auto_start_timer}
                onCheckedChange={(checked) => updateSettings({ auto_start_timer: checked })}
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Default Comment Type</Label>
              <Select
                value={settings.default_comment_type}
                onValueChange={(value) => updateSettings({ default_comment_type: value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comment">Comment</SelectItem>
                  <SelectItem value="suggestion">Suggestion</SelectItem>
                  <SelectItem value="question">Question</SelectItem>
                  <SelectItem value="praise">Praise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2 text-gray-600" />
            Integrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <Mail className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium">Slack</h4>
                  <p className="text-sm text-gray-500">Get notifications in Slack</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Connect
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <Code className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium">VS Code</h4>
                  <p className="text-sm text-gray-500">Deep links to reviews</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Install Extension
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Palette className="h-5 w-5 mr-2 text-pink-600" />
            Theme Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-sm font-medium mb-3 block">Choose Your Theme</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Quick Toggle</h4>
                <Theme variant="button" size="md" showLabel />
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Switch Style</h4>
                <Theme variant="switch" size="md" showLabel />
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Dropdown</h4>
                <Theme variant="dropdown" size="md" showLabel />
              </div>
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium mb-3 block">Advanced Theme Options</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Tabs Style</h4>
                <Theme variant="tabs" size="md" showLabel />
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Grid Layout</h4>
                <Theme variant="grid" size="sm" />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-3 block">Extended Themes</Label>
            <div className="space-y-4">
              <Theme 
                variant="radial" 
                size="md" 
                showLabel 
                themes={["light", "dark", "system", "sunset", "forest", "ocean"]} 
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}