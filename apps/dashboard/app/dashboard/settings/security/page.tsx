"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Shield,
  Key,
  Smartphone,
  Monitor,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  Trash2,
  Lock,
  Fingerprint,
  RefreshCw,
} from "lucide-react"
import { useDashboardUser } from "@/components/dashboard/dashboard-user-provider"

interface Session {
  id: string
  device: string
  browser: string
  location: string
  ip: string
  lastActive: string
  current: boolean
}

interface SecuritySettings {
  two_factor_enabled: boolean
  two_factor_method: "app" | "sms" | null
  login_alerts: boolean
  suspicious_activity_alerts: boolean
  session_timeout_minutes: number
}

const mockSessions: Session[] = [
  {
    id: "1",
    device: "Windows PC",
    browser: "Chrome 122",
    location: "San Francisco, CA",
    ip: "192.168.1.1",
    lastActive: "Active now",
    current: true,
  },
  {
    id: "2",
    device: "MacBook Pro",
    browser: "Safari 17",
    location: "New York, NY",
    ip: "192.168.1.2",
    lastActive: "2 hours ago",
    current: false,
  },
  {
    id: "3",
    device: "iPhone 15",
    browser: "Safari Mobile",
    location: "Los Angeles, CA",
    ip: "192.168.1.3",
    lastActive: "1 day ago",
    current: false,
  },
]

export default function SecuritySettingsPage() {
  const currentUser = useDashboardUser()
  const [settings, setSettings] = useState<SecuritySettings>({
    two_factor_enabled: false,
    two_factor_method: null,
    login_alerts: true,
    suspicious_activity_alerts: true,
    session_timeout_minutes: 30,
  })
  const [sessions, setSessions] = useState<Session[]>(mockSessions)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    new: "",
    confirm: "",
  })
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      setError("New passwords do not match")
      return
    }
    if (passwordForm.new.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setChangingPassword(true)
    setError(null)

    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      setSuccess("Password changed successfully")
      setPasswordForm({ current: "", new: "", confirm: "" })
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError("Failed to change password")
    } finally {
      setChangingPassword(false)
    }
  }

  const handleEnable2FA = async () => {
    // Simulate enabling 2FA
    setSettings(prev => ({
      ...prev,
      two_factor_enabled: true,
      two_factor_method: "app",
    }))
    setSuccess("Two-factor authentication enabled")
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleDisable2FA = async () => {
    setSettings(prev => ({
      ...prev,
      two_factor_enabled: false,
      two_factor_method: null,
    }))
  }

  const handleRevokeSession = async (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    setSuccess("Session revoked successfully")
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleRevokeAllSessions = async () => {
    setSessions(prev => prev.filter(s => s.current))
    setSuccess("All other sessions revoked")
    setTimeout(() => setSuccess(null), 3000)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="card-heading text-foreground">
          Security Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account security and authentication settings
        </p>
      </motion.div>

      {/* Success/Error Messages */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
        >
          <CheckCircle className="h-5 w-5 text-[color:var(--green-status)]" />
          <p className="text-green-700 dark:text-green-300">{success}</p>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
        >
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </motion.div>
      )}

      {/* Password Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-500" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your password regularly to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters with uppercase, lowercase, and numbers
              </p>
              <Button onClick={handleChangePassword} disabled={changingPassword}>
                {changingPassword ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                {changingPassword ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Two-Factor Authentication */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-purple-500" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-card-inner rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${settings.two_factor_enabled ? "bg-[color:var(--green-status)]/15" : "bg-gray-200 dark:bg-gray-700"}`}>
                  <Shield className={`h-6 w-6 ${settings.two_factor_enabled ? "text-[color:var(--green-status)]" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">
                    Two-Factor Authentication
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {settings.two_factor_enabled
                      ? `Enabled via ${settings.two_factor_method === "app" ? "Authenticator App" : "SMS"}`
                      : "Not enabled"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {settings.two_factor_enabled ? (
                  <>
                    <Badge variant="outline" className="text-[color:var(--green-status)] border-green-300">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Enabled
                    </Badge>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Disable
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Disable Two-Factor Authentication?</DialogTitle>
                          <DialogDescription>
                            This will make your account less secure. Are you sure you want to disable 2FA?
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline">Cancel</Button>
                          <Button variant="destructive" onClick={handleDisable2FA}>
                            Disable 2FA
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                ) : (
                  <Button onClick={handleEnable2FA}>
                    <Smartphone className="h-4 w-4 mr-2" />
                    Enable 2FA
                  </Button>
                )}
              </div>
            </div>

            {!settings.two_factor_enabled && (
              <div className="mt-4 p-4 border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-[color:var(--orange)] dark:text-yellow-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                      Recommended: Enable 2FA
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      Two-factor authentication adds an extra layer of security by requiring a code from your phone in addition to your password.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Security Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[color:var(--orange)]" />
              Security Alerts
            </CardTitle>
            <CardDescription>
              Get notified about security events on your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-card-inner rounded-lg">
              <div>
                <h4 className="font-medium text-foreground">Login Alerts</h4>
                <p className="text-sm text-muted-foreground">
                  Get notified when someone logs into your account
                </p>
              </div>
              <Switch
                checked={settings.login_alerts}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, login_alerts: checked }))}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-card-inner rounded-lg">
              <div>
                <h4 className="font-medium text-foreground">Suspicious Activity Alerts</h4>
                <p className="text-sm text-muted-foreground">
                  Get notified about unusual activity on your account
                </p>
              </div>
              <Switch
                checked={settings.suspicious_activity_alerts}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, suspicious_activity_alerts: checked }))}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Active Sessions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-green-500" />
                Active Sessions
              </CardTitle>
              <CardDescription>
                Manage devices where you're currently logged in
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleRevokeAllSessions}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out all other sessions
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    session.current
                      ? "bg-teal-500/10 border border-teal-500/30"
                      : "bg-card-inner"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-card-inner rounded-lg shadow-sm">
                      {session.device.includes("iPhone") || session.device.includes("Phone") ? (
                        <Smartphone className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Monitor className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-foreground">
                          {session.device}
                        </h4>
                        {session.current && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {session.browser}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {session.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {session.lastActive}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!session.current && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleRevokeSession(session.id)}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card variant="glass" className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 rounded-lg">
              <div>
                <h4 className="font-medium text-red-800 dark:text-red-200">Delete Account</h4>
                <p className="text-sm text-destructive">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button variant="destructive">
                      Yes, delete my account
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
