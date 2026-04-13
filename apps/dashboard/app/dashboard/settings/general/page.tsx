"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Settings,
  Sun,
  Moon,
  Monitor,
  Globe,
  Clock,
  Save,
  CheckCircle,
  Loader2,
  Palette,
  Languages,
  CalendarDays,
  Eye,
  Layout,
  Type,
} from "lucide-react"
import { Theme, themeConfigs, type Theme as ThemeType } from "@/components/ui/theme"
import { useTheme } from "next-themes"

// Common languages with their native names
const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Espanol" },
  { code: "fr", name: "French", nativeName: "Francais" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "pt", name: "Portuguese", nativeName: "Portugues" },
  { code: "zh", name: "Chinese", nativeName: "Zhongwen" },
  { code: "ja", name: "Japanese", nativeName: "Nihongo" },
  { code: "ko", name: "Korean", nativeName: "Hangugeo" },
  { code: "ar", name: "Arabic", nativeName: "Al'arabiyya" },
  { code: "ru", name: "Russian", nativeName: "Russkii" },
  { code: "hi", name: "Hindi", nativeName: "Hindi" },
]

// Common timezones
const timezones = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)", offset: "+00:00" },
  { value: "America/New_York", label: "Eastern Time (US & Canada)", offset: "-05:00" },
  { value: "America/Chicago", label: "Central Time (US & Canada)", offset: "-06:00" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)", offset: "-07:00" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)", offset: "-08:00" },
  { value: "America/Sao_Paulo", label: "Brasilia Time", offset: "-03:00" },
  { value: "Europe/London", label: "London (GMT)", offset: "+00:00" },
  { value: "Europe/Paris", label: "Paris (CET)", offset: "+01:00" },
  { value: "Europe/Berlin", label: "Berlin (CET)", offset: "+01:00" },
  { value: "Europe/Moscow", label: "Moscow (MSK)", offset: "+03:00" },
  { value: "Asia/Dubai", label: "Dubai (GST)", offset: "+04:00" },
  { value: "Asia/Kolkata", label: "India (IST)", offset: "+05:30" },
  { value: "Asia/Singapore", label: "Singapore (SGT)", offset: "+08:00" },
  { value: "Asia/Shanghai", label: "China (CST)", offset: "+08:00" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)", offset: "+09:00" },
  { value: "Australia/Sydney", label: "Sydney (AEST)", offset: "+10:00" },
  { value: "Pacific/Auckland", label: "Auckland (NZST)", offset: "+12:00" },
]

// Date formats
const dateFormats = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY", example: "04/04/2026" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY", example: "04/04/2026" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD", example: "2026-04-04" },
  { value: "DD MMM YYYY", label: "DD MMM YYYY", example: "04 Apr 2026" },
  { value: "MMM DD, YYYY", label: "MMM DD, YYYY", example: "Apr 04, 2026" },
]

// Time formats
const timeFormats = [
  { value: "12h", label: "12-hour", example: "2:30 PM" },
  { value: "24h", label: "24-hour", example: "14:30" },
]

interface GeneralSettings {
  language: string
  timezone: string
  dateFormat: string
  timeFormat: string
  weekStartsOn: string
  reduceMotion: boolean
  compactMode: boolean
  showLineNumbers: boolean
  fontSize: string
  codeTheme: string
}

export default function GeneralSettingsPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [settings, setSettings] = useState<GeneralSettings>({
    language: "en",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    dateFormat: "MMM DD, YYYY",
    timeFormat: "12h",
    weekStartsOn: "sunday",
    reduceMotion: false,
    compactMode: false,
    showLineNumbers: true,
    fontSize: "medium",
    codeTheme: "github-dark",
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error("Failed to save settings:", err)
    } finally {
      setSaving(false)
    }
  }

  const updateSettings = (updates: Partial<GeneralSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }

  const getCurrentTime = () => {
    const now = new Date()
    try {
      return now.toLocaleString("en-US", {
        timeZone: settings.timezone,
        hour: "numeric",
        minute: "2-digit",
        hour12: settings.timeFormat === "12h",
      })
    } catch {
      return now.toLocaleTimeString()
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <h1 className="card-heading text-foreground">
              General Settings
            </h1>
            <p className="mt-2 text-muted-foreground">
              Customize your display preferences, language, and regional settings
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : success ? (
              <CheckCircle className="mr-2 h-4 w-4" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? "Saving..." : success ? "Saved!" : "Save Changes"}
          </Button>
        </motion.div>

        <div className="space-y-6">
          {/* Theme Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-border bg-card/80 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange to-teal shadow-lg">
                    <Palette className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Theme Settings</CardTitle>
                    <CardDescription>Choose your preferred color theme</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Color Theme</Label>
                  <div className="grid grid-cols-3 gap-4">
                    {(["light", "dark", "system"] as const).map((themeOption) => {
                      const icons = { light: Sun, dark: Moon, system: Monitor }
                      const Icon = icons[themeOption]
                      const isSelected = theme === themeOption
                      
                      return (
                        <motion.button
                          key={themeOption}
                          onClick={() => setTheme(themeOption)}
                          className={`relative flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                            isSelected
                              ? "border-orange-accent bg-orange/10"
                              : "border-border hover:border-orange-accent/70"
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                            isSelected
                            ? "bg-orange text-white"
                            : "bg-background text-muted-foreground"
                          }`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <span className={`text-sm font-medium capitalize ${
                            isSelected ? "text-orange" : "text-muted-foreground"
                          }`}>
                            {themeOption}
                          </span>
                          {isSelected && (
                            <motion.div
                              layoutId="theme-indicator"
                              className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange"
                            >
                              <CheckCircle className="h-3 w-3 text-white" />
                            </motion.div>
                          )}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <Eye className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Reduce Motion</p>
                        <p className="text-xs text-muted-foreground">Minimize animations</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.reduceMotion}
                      onCheckedChange={(checked) => updateSettings({ reduceMotion: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <Layout className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Compact Mode</p>
                        <p className="text-xs text-muted-foreground">Denser UI layout</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.compactMode}
                      onCheckedChange={(checked) => updateSettings({ compactMode: checked })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Font Size</Label>
                  <Select
                    value={settings.fontSize}
                    onValueChange={(value) => updateSettings({ fontSize: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select font size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium (Default)</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                      <SelectItem value="x-large">Extra Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Language Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-border bg-card/80 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal to-orange shadow-lg">
                    <Languages className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Language</CardTitle>
                    <CardDescription>Set your preferred language for the interface</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Display Language</Label>
                  <Select
                    value={settings.language}
                    onValueChange={(value) => updateSettings({ language: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span>{lang.name}</span>
                            <span className="text-muted-foreground">({lang.nativeName})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    This will change the language used throughout the application
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Time Zone & Regional Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-border bg-card/80 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange to-teal shadow-lg">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Time Zone & Regional</CardTitle>
                    <CardDescription>Configure your time zone and date/time preferences</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Time Zone</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(value) => updateSettings({ timezone: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          <div className="flex items-center gap-2">
                            <span className="w-16 font-mono text-xs text-muted-foreground">
                              {tz.offset}
                            </span>
                            <span>{tz.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background/60 p-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Current time in selected timezone: <span className="font-medium">{getCurrentTime()}</span>
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Date Format</Label>
                    <Select
                      value={settings.dateFormat}
                      onValueChange={(value) => updateSettings({ dateFormat: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        {dateFormats.map((format) => (
                          <SelectItem key={format.value} value={format.value}>
                            <div className="flex items-center justify-between gap-4">
                              <span>{format.label}</span>
                            <span className="text-xs text-muted-foreground">{format.example}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Time Format</Label>
                    <Select
                      value={settings.timeFormat}
                      onValueChange={(value) => updateSettings({ timeFormat: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeFormats.map((format) => (
                          <SelectItem key={format.value} value={format.value}>
                            <div className="flex items-center justify-between gap-4">
                              <span>{format.label}</span>
                            <span className="text-xs text-muted-foreground">{format.example}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Week Starts On</Label>
                  <Select
                    value={settings.weekStartsOn}
                    onValueChange={(value) => updateSettings({ weekStartsOn: value })}
                  >
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sunday">Sunday</SelectItem>
                      <SelectItem value="monday">Monday</SelectItem>
                      <SelectItem value="saturday">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Code Editor Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-border bg-card/80 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal to-orange shadow-lg">
                    <Type className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Code Display</CardTitle>
                    <CardDescription>Configure how code is displayed in reviews</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <Type className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Show Line Numbers</p>
                      <p className="text-xs text-muted-foreground">Display line numbers in code blocks</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.showLineNumbers}
                    onCheckedChange={(checked) => updateSettings({ showLineNumbers: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Code Theme</Label>
                  <Select
                    value={settings.codeTheme}
                    onValueChange={(value) => updateSettings({ codeTheme: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select code theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="github-dark">GitHub Dark</SelectItem>
                      <SelectItem value="github-light">GitHub Light</SelectItem>
                      <SelectItem value="dracula">Dracula</SelectItem>
                      <SelectItem value="monokai">Monokai</SelectItem>
                      <SelectItem value="nord">Nord</SelectItem>
                      <SelectItem value="one-dark">One Dark</SelectItem>
                      <SelectItem value="solarized-dark">Solarized Dark</SelectItem>
                      <SelectItem value="solarized-light">Solarized Light</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
    </div>
  )
}
