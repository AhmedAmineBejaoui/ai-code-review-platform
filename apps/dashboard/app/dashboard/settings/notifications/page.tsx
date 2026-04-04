"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  GitPullRequest,
  AlertTriangle,
  CheckCircle,
  Clock,
  Volume2,
  VolumeX,
  Save,
  Loader2,
  Zap,
  Users,
  FileCode,
  Shield,
  TrendingUp,
} from "lucide-react"

interface NotificationSettings {
  // Email notifications
  email: {
    enabled: boolean
    new_review_assigned: boolean
    review_completed: boolean
    comment_replies: boolean
    mention: boolean
    weekly_digest: boolean
    daily_summary: boolean
    security_alerts: boolean
  }
  // Push notifications
  push: {
    enabled: boolean
    new_review_assigned: boolean
    review_completed: boolean
    comment_replies: boolean
    mention: boolean
    realtime_updates: boolean
  }
  // In-app notifications
  inApp: {
    enabled: boolean
    sound: boolean
    desktop: boolean
    show_preview: boolean
  }
  // Notification schedule
  schedule: {
    quiet_hours_enabled: boolean
    quiet_hours_start: string
    quiet_hours_end: string
    weekend_notifications: boolean
  }
}

const defaultSettings: NotificationSettings = {
  email: {
    enabled: true,
    new_review_assigned: true,
    review_completed: true,
    comment_replies: true,
    mention: true,
    weekly_digest: false,
    daily_summary: true,
    security_alerts: true,
  },
  push: {
    enabled: true,
    new_review_assigned: true,
    review_completed: false,
    comment_replies: true,
    mention: true,
    realtime_updates: true,
  },
  inApp: {
    enabled: true,
    sound: false,
    desktop: true,
    show_preview: true,
  },
  schedule: {
    quiet_hours_enabled: false,
    quiet_hours_start: "22:00",
    quiet_hours_end: "08:00",
    weekend_notifications: false,
  },
}

export default function NotificationsSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const updateEmailSetting = (key: keyof NotificationSettings['email'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      email: { ...prev.email, [key]: value }
    }))
  }

  const updatePushSetting = (key: keyof NotificationSettings['push'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      push: { ...prev.push, [key]: value }
    }))
  }

  const updateInAppSetting = (key: keyof NotificationSettings['inApp'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      inApp: { ...prev.inApp, [key]: value }
    }))
  }

  const updateScheduleSetting = (key: keyof NotificationSettings['schedule'], value: boolean | string) => {
    setSettings(prev => ({
      ...prev,
      schedule: { ...prev.schedule, [key]: value }
    }))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent">
            Notification Settings
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Choose how and when you want to be notified
          </p>
        </div>
        <div className="flex items-center gap-3">
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center text-green-600 dark:text-green-400 text-sm"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Preferences saved
            </motion.div>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </motion.div>

      {/* Email Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle>Email Notifications</CardTitle>
                  <CardDescription>Receive updates via email</CardDescription>
                </div>
              </div>
              <Switch
                checked={settings.email.enabled}
                onCheckedChange={(checked) => updateEmailSetting('enabled', checked)}
              />
            </div>
          </CardHeader>
          {settings.email.enabled && (
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <NotificationItem
                  icon={<GitPullRequest className="h-4 w-4" />}
                  title="New Review Assigned"
                  description="When a new code review is assigned to you"
                  checked={settings.email.new_review_assigned}
                  onChange={(v) => updateEmailSetting('new_review_assigned', v)}
                />
                <NotificationItem
                  icon={<CheckCircle className="h-4 w-4" />}
                  title="Review Completed"
                  description="When someone completes reviewing your code"
                  checked={settings.email.review_completed}
                  onChange={(v) => updateEmailSetting('review_completed', v)}
                />
                <NotificationItem
                  icon={<MessageSquare className="h-4 w-4" />}
                  title="Comment Replies"
                  description="When someone replies to your comments"
                  checked={settings.email.comment_replies}
                  onChange={(v) => updateEmailSetting('comment_replies', v)}
                />
                <NotificationItem
                  icon={<Users className="h-4 w-4" />}
                  title="Mentions"
                  description="When someone mentions you in a comment"
                  checked={settings.email.mention}
                  onChange={(v) => updateEmailSetting('mention', v)}
                />
                <Separator />
                <NotificationItem
                  icon={<TrendingUp className="h-4 w-4" />}
                  title="Daily Summary"
                  description="Daily digest of your review activity"
                  checked={settings.email.daily_summary}
                  onChange={(v) => updateEmailSetting('daily_summary', v)}
                />
                <NotificationItem
                  icon={<FileCode className="h-4 w-4" />}
                  title="Weekly Digest"
                  description="Weekly summary of team activity"
                  checked={settings.email.weekly_digest}
                  onChange={(v) => updateEmailSetting('weekly_digest', v)}
                />
                <Separator />
                <NotificationItem
                  icon={<Shield className="h-4 w-4" />}
                  title="Security Alerts"
                  description="Important security-related notifications"
                  checked={settings.email.security_alerts}
                  onChange={(v) => updateEmailSetting('security_alerts', v)}
                  important
                />
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* Push Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Smartphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle>Push Notifications</CardTitle>
                  <CardDescription>Receive real-time push notifications</CardDescription>
                </div>
              </div>
              <Switch
                checked={settings.push.enabled}
                onCheckedChange={(checked) => updatePushSetting('enabled', checked)}
              />
            </div>
          </CardHeader>
          {settings.push.enabled && (
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <NotificationItem
                  icon={<GitPullRequest className="h-4 w-4" />}
                  title="New Review Assigned"
                  description="Instant notification for new assignments"
                  checked={settings.push.new_review_assigned}
                  onChange={(v) => updatePushSetting('new_review_assigned', v)}
                />
                <NotificationItem
                  icon={<CheckCircle className="h-4 w-4" />}
                  title="Review Completed"
                  description="When your code review is completed"
                  checked={settings.push.review_completed}
                  onChange={(v) => updatePushSetting('review_completed', v)}
                />
                <NotificationItem
                  icon={<MessageSquare className="h-4 w-4" />}
                  title="Comment Replies"
                  description="Real-time reply notifications"
                  checked={settings.push.comment_replies}
                  onChange={(v) => updatePushSetting('comment_replies', v)}
                />
                <NotificationItem
                  icon={<Users className="h-4 w-4" />}
                  title="Mentions"
                  description="When someone mentions you"
                  checked={settings.push.mention}
                  onChange={(v) => updatePushSetting('mention', v)}
                />
                <NotificationItem
                  icon={<Zap className="h-4 w-4" />}
                  title="Real-time Updates"
                  description="Live updates for ongoing reviews"
                  checked={settings.push.realtime_updates}
                  onChange={(v) => updatePushSetting('realtime_updates', v)}
                />
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* In-App Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Bell className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle>In-App Notifications</CardTitle>
                  <CardDescription>Notification behavior within the application</CardDescription>
                </div>
              </div>
              <Switch
                checked={settings.inApp.enabled}
                onCheckedChange={(checked) => updateInAppSetting('enabled', checked)}
              />
            </div>
          </CardHeader>
          {settings.inApp.enabled && (
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <NotificationItem
                  icon={settings.inApp.sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  title="Notification Sound"
                  description="Play a sound for new notifications"
                  checked={settings.inApp.sound}
                  onChange={(v) => updateInAppSetting('sound', v)}
                />
                <NotificationItem
                  icon={<Bell className="h-4 w-4" />}
                  title="Desktop Notifications"
                  description="Show browser desktop notifications"
                  checked={settings.inApp.desktop}
                  onChange={(v) => updateInAppSetting('desktop', v)}
                />
                <NotificationItem
                  icon={<MessageSquare className="h-4 w-4" />}
                  title="Show Preview"
                  description="Show notification content preview"
                  checked={settings.inApp.show_preview}
                  onChange={(v) => updateInAppSetting('show_preview', v)}
                />
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* Notification Schedule */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <CardTitle>Notification Schedule</CardTitle>
                  <CardDescription>Control when you receive notifications</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Quiet Hours</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Pause non-urgent notifications during specific hours
                </p>
              </div>
              <Switch
                checked={settings.schedule.quiet_hours_enabled}
                onCheckedChange={(checked) => updateScheduleSetting('quiet_hours_enabled', checked)}
              />
            </div>

            {settings.schedule.quiet_hours_enabled && (
              <div className="grid grid-cols-2 gap-4 pl-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Start Time
                  </label>
                  <Select
                    value={settings.schedule.quiet_hours_start}
                    onValueChange={(v) => updateScheduleSetting('quiet_hours_start', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }).map((_, i) => (
                        <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                          {`${i.toString().padStart(2, '0')}:00`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    End Time
                  </label>
                  <Select
                    value={settings.schedule.quiet_hours_end}
                    onValueChange={(v) => updateScheduleSetting('quiet_hours_end', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }).map((_, i) => (
                        <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                          {`${i.toString().padStart(2, '0')}:00`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Weekend Notifications</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receive notifications on weekends
                </p>
              </div>
              <Switch
                checked={settings.schedule.weekend_notifications}
                onCheckedChange={(checked) => updateScheduleSetting('weekend_notifications', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

function NotificationItem({
  icon,
  title,
  description,
  checked,
  onChange,
  important = false,
}: {
  icon: React.ReactNode
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
  important?: boolean
}) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
      important
        ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800"
        : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
    }`}>
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded ${
          important
            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
        }`}>
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h4>
            {important && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                Recommended
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
