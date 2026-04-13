"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
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
  RotateCcw,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import {
  ensurePushSubscription,
  fetchPushPublicKey,
  getNotificationPermission,
  hasActivePushSubscription,
  isPushNotificationsSupported,
  registerNotificationServiceWorker,
  requestNotificationPermission,
  unregisterPushSubscription,
} from "@/lib/push-notifications"

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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalSettings, setOriginalSettings] = useState<NotificationSettings>(defaultSettings)
  const [pushSupported, setPushSupported] = useState(false)
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default")
  const [pushPublicKey, setPushPublicKey] = useState<string | null>(null)
  const [pushConfigured, setPushConfigured] = useState(false)

  // Load preferences from backend
  const loadPreferences = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/notifications/preferences")
      if (!response.ok) {
        throw new Error("Failed to load preferences")
      }
      const data = await response.json()
      // Merge with defaults to ensure all fields exist
      const merged: NotificationSettings = {
        email: { ...defaultSettings.email, ...data.email },
        push: { ...defaultSettings.push, ...data.push },
        inApp: { ...defaultSettings.inApp, ...data.inApp },
        schedule: { ...defaultSettings.schedule, ...data.schedule },
      }
      setSettings(merged)
      setOriginalSettings(merged)
    } catch (err) {
      console.error("Failed to load notification preferences:", err)
      setError("Failed to load preferences. Using defaults.")
      setSettings(defaultSettings)
      setOriginalSettings(defaultSettings)
      toast.error("Failed to load notification preferences")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadBrowserPushState = useCallback(async () => {
    const supported = isPushNotificationsSupported()
    setPushSupported(supported)
    setPushPermission(getNotificationPermission())

    if (!supported) {
      setPushPublicKey(null)
      setPushConfigured(false)
      return
    }

    await registerNotificationServiceWorker()
    const keyResponse = await fetchPushPublicKey()
    const publicKey = keyResponse?.enabled ? keyResponse.public_key : null
    setPushPublicKey(publicKey ?? null)
    setPushConfigured(await hasActivePushSubscription())
  }, [])

  const syncPushSubscriptionState = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      if (!pushSupported) {
        return false
      }

      if (!enabled) {
        const removed = await unregisterPushSubscription()
        setPushConfigured(false)
        return removed
      }

      if (!pushPublicKey) {
        return false
      }

      let permission = getNotificationPermission()
      if (permission !== "granted") {
        permission = await requestNotificationPermission()
        setPushPermission(permission)
      }
      if (permission !== "granted") {
        return false
      }

      const subscribed = await ensurePushSubscription(pushPublicKey)
      setPushConfigured(subscribed || (await hasActivePushSubscription()))
      return subscribed
    },
    [pushPublicKey, pushSupported],
  )

  useEffect(() => {
    loadPreferences()
    void loadBrowserPushState()
  }, [loadPreferences, loadBrowserPushState])

  // Track changes
  useEffect(() => {
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(originalSettings))
  }, [settings, originalSettings])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      if (settings.inApp.desktop && getNotificationPermission() !== "granted") {
        const permission = await requestNotificationPermission()
        setPushPermission(permission)
        if (permission !== "granted") {
          setSettings((prev) => ({
            ...prev,
            inApp: { ...prev.inApp, desktop: false },
          }))
          throw new Error("desktop_notifications_permission_denied")
        }
      }

      if (settings.push.enabled) {
        const pushReady = await syncPushSubscriptionState(true)
        if (!pushReady) {
          setSettings((prev) => ({
            ...prev,
            push: { ...prev.push, enabled: false },
          }))
          throw new Error("push_subscription_unavailable")
        }
      } else if (pushConfigured) {
        await syncPushSubscriptionState(false)
      }

      const response = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        throw new Error("Failed to save preferences")
      }

      setOriginalSettings(settings)
      setSuccess(true)
      setHasChanges(false)
      toast.success("Notification preferences saved successfully")
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error("Failed to save notification preferences:", err)
      setError("Failed to save preferences. Please verify browser notification permissions.")
      toast.error("Failed to save notification preferences")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/notifications/preferences/reset", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to reset preferences")
      }

      const data = await response.json()
      const merged: NotificationSettings = {
        email: { ...defaultSettings.email, ...data.preferences?.email },
        push: { ...defaultSettings.push, ...data.preferences?.push },
        inApp: { ...defaultSettings.inApp, ...data.preferences?.inApp },
        schedule: { ...defaultSettings.schedule, ...data.preferences?.schedule },
      }
      setSettings(merged)
      setOriginalSettings(merged)
      setHasChanges(false)
      if (!merged.push.enabled) {
        await syncPushSubscriptionState(false)
      }
      toast.success("Preferences reset to defaults")
    } catch (err) {
      console.error("Failed to reset preferences:", err)
      toast.error("Failed to reset preferences")
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

  const handlePushEnabledChange = async (enabled: boolean) => {
    if (enabled) {
      if (!pushSupported) {
        toast.error("Push notifications are not supported in this browser.")
        return
      }
      const ready = await syncPushSubscriptionState(true)
      if (!ready) {
        toast.error("Push permission denied or subscription failed.")
        setSettings((prev) => ({
          ...prev,
          push: { ...prev.push, enabled: false },
        }))
        return
      }
    } else {
      await syncPushSubscriptionState(false)
    }

    setSettings((prev) => ({
      ...prev,
      push: { ...prev.push, enabled },
    }))
  }

  const handleDesktopEnabledChange = async (enabled: boolean) => {
    if (enabled) {
      const permission = await requestNotificationPermission()
      setPushPermission(permission)
      if (permission !== "granted") {
        toast.error("Desktop notification permission was not granted.")
        setSettings((prev) => ({
          ...prev,
          inApp: { ...prev.inApp, desktop: false },
        }))
        return
      }
    }

    updateInAppSetting("desktop", enabled)
  }

  // Show loading skeleton
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} variant="default">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
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
          <h1 className="card-heading text-foreground">
            Notification Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Choose how and when you want to be notified
          </p>
        </div>
        <div className="flex items-center gap-3">
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center text-[color:var(--green-status)] text-sm"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Preferences saved
            </motion.div>
          )}
          {hasChanges && (
            <Badge variant="outline" className="text-[color:var(--orange)] border-amber-300">
              Unsaved changes
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={saving}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to defaults
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </motion.div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Email Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-500/15 rounded-lg">
                  <Mail className="h-5 w-5 text-teal-400" />
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
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Smartphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle>Push Notifications</CardTitle>
                  <CardDescription>
                    Receive real-time push notifications
                    {pushPermission !== "granted" ? ` (permission: ${pushPermission})` : ""}
                  </CardDescription>
                </div>
              </div>
              <Switch
                checked={settings.push.enabled}
                onCheckedChange={(checked) => {
                  void handlePushEnabledChange(checked)
                }}
              />
            </div>
          </CardHeader>
          {settings.push.enabled && !pushConfigured && (
            <CardContent className="pt-0">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Push is enabled in preferences but not fully subscribed in your browser yet.
                </AlertDescription>
              </Alert>
            </CardContent>
          )}
          {!pushSupported && (
            <CardContent className="pt-0">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This browser does not support Web Push notifications.
                </AlertDescription>
              </Alert>
            </CardContent>
          )}
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
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[color:var(--green-status)]/15 rounded-lg">
                  <Bell className="h-5 w-5 text-[color:var(--green-status)]" />
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
                  onChange={(v) => {
                    void handleDesktopEnabledChange(v)
                  }}
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
        <Card variant="glass">
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
            <div className="flex items-center justify-between p-4 bg-card-inner rounded-lg">
              <div>
                <h4 className="font-medium text-foreground">Quiet Hours</h4>
                <p className="text-sm text-muted-foreground">
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
                  <label className="text-sm font-medium text-secondary-foreground">
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
                  <label className="text-sm font-medium text-secondary-foreground">
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

            <div className="flex items-center justify-between p-4 bg-card-inner rounded-lg">
              <div>
                <h4 className="font-medium text-foreground">Weekend Notifications</h4>
                <p className="text-sm text-muted-foreground">
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
            ? "bg-amber-100 dark:bg-amber-900/30 text-[color:var(--orange)] dark:text-amber-400"
            : "bg-gray-100 dark:bg-gray-800 text-muted-foreground"
        }`}>
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-foreground">{title}</h4>
            {important && (
              <Badge variant="outline" className="text-xs text-[color:var(--orange)] border-amber-300">
                Recommended
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
