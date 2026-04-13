"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Slack,
  Mail,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Save,
  Loader2,
  TestTube,
  Info,
  Copy,
  Eye,
  EyeOff,
  Settings,
} from "lucide-react"
import { toast } from "sonner"

interface SlackConfig {
  enabled: boolean
  webhookUrl: string
  channel: string
  notifyNewReviews: boolean
  notifyOverdue: boolean
  notifyChangesRequested: boolean
}

interface EmailConfig {
  provider: "sendgrid" | "smtp"
  enabled: boolean
  // SendGrid
  sendgridApiKey: string
  sendgridFromEmail: string
  // SMTP
  smtpHost: string
  smtpPort: number
  smtpUsername: string
  smtpPassword: string
  smtpFromEmail: string
}

interface TeamsConfig {
  enabled: boolean
  webhookUrl: string
  channel: string
}

const defaultSlackConfig: SlackConfig = {
  enabled: false,
  webhookUrl: "",
  channel: "#code-reviews",
  notifyNewReviews: true,
  notifyOverdue: true,
  notifyChangesRequested: true,
}

const defaultEmailConfig: EmailConfig = {
  provider: "sendgrid",
  enabled: false,
  sendgridApiKey: "",
  sendgridFromEmail: "noreply@ai-code-review.com",
  smtpHost: "smtp.gmail.com",
  smtpPort: 587,
  smtpUsername: "",
  smtpPassword: "",
  smtpFromEmail: "",
}

const defaultTeamsConfig: TeamsConfig = {
  enabled: false,
  webhookUrl: "",
  channel: "Code Reviews",
}

export default function IntegrationsSettingsPage() {
  const [slackConfig, setSlackConfig] = useState<SlackConfig>(defaultSlackConfig)
  const [emailConfig, setEmailConfig] = useState<EmailConfig>(defaultEmailConfig)
  const [teamsConfig, setTeamsConfig] = useState<TeamsConfig>(defaultTeamsConfig)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleTestSlack = async () => {
    if (!slackConfig.webhookUrl) {
      toast.error("Please enter a Slack webhook URL first")
      return
    }

    setTesting("slack")
    try {
      // Send test message to Slack webhook
      const response = await fetch(slackConfig.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Test notification from AI Code Review Platform",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "*Test Notification* :white_check_mark:\nYour Slack integration is working correctly!",
              },
            },
          ],
        }),
      })

      if (response.ok) {
        toast.success("Test message sent to Slack successfully!")
      } else {
        toast.error("Failed to send test message. Check your webhook URL.")
      }
    } catch (error) {
      toast.error("Failed to connect to Slack. Check your webhook URL.")
    } finally {
      setTesting(null)
    }
  }

  const handleTestTeams = async () => {
    if (!teamsConfig.webhookUrl) {
      toast.error("Please enter a Teams webhook URL first")
      return
    }

    setTesting("teams")
    try {
      const response = await fetch(teamsConfig.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "@type": "MessageCard",
          "@context": "http://schema.org/extensions",
          themeColor: "0076D7",
          summary: "Test Notification",
          sections: [
            {
              activityTitle: "Test Notification",
              activitySubtitle: "AI Code Review Platform",
              facts: [
                { name: "Status", value: "Connected" },
              ],
              markdown: true,
            },
          ],
        }),
      })

      if (response.ok) {
        toast.success("Test message sent to Teams successfully!")
      } else {
        toast.error("Failed to send test message. Check your webhook URL.")
      }
    } catch (error) {
      toast.error("Failed to connect to Teams. Check your webhook URL.")
    } finally {
      setTesting(null)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save to notification preferences
      const response = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slack: slackConfig,
          teams: teamsConfig,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save")
      }

      toast.success("Integration settings saved successfully!")
    } catch (error) {
      toast.error("Failed to save integration settings")
    } finally {
      setSaving(false)
    }
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
            Integrations
          </h1>
          <p className="mt-2 text-muted-foreground">
            Configure external notification channels
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saving ? "Saving..." : "Save All"}
        </Button>
      </motion.div>

      {/* Admin Notice */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Administrator Configuration Required</AlertTitle>
        <AlertDescription>
          Email and some integration settings require server-side configuration via environment variables.
          Contact your administrator to enable these features.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="slack" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="slack" className="flex items-center gap-2">
            <Slack className="h-4 w-4" />
            Slack
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
        </TabsList>

        {/* Slack Tab */}
        <TabsContent value="slack">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-border bg-card/80 backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-orange/10 p-2">
                      <Slack className="h-5 w-5 text-orange" />
                    </div>
                    <div>
                      <CardTitle>Slack Integration</CardTitle>
                      <CardDescription>Send notifications to a Slack channel</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {slackConfig.enabled && slackConfig.webhookUrl && (
                      <Badge variant="secondary" className="bg-teal/10 text-teal">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    )}
                    <Switch
                      checked={slackConfig.enabled}
                      onCheckedChange={(checked) =>
                        setSlackConfig(prev => ({ ...prev, enabled: checked }))
                      }
                    />
                  </div>
                </div>
              </CardHeader>
              {slackConfig.enabled && (
                <CardContent className="space-y-6">
                  {/* Setup Instructions */}
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>How to set up Slack Webhook</AlertTitle>
                    <AlertDescription className="mt-2">
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-teal hover:underline inline-flex items-center gap-1">Slack API Apps <ExternalLink className="h-3 w-3" /></a></li>
                        <li>Create a new app or select an existing one</li>
                        <li>Go to "Incoming Webhooks" and enable it</li>
                        <li>Click "Add New Webhook to Workspace"</li>
                        <li>Select the channel and copy the webhook URL</li>
                      </ol>
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="slack-webhook">Webhook URL</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            id="slack-webhook"
                            type={showSecrets["slack-webhook"] ? "text" : "password"}
                            placeholder="https://hooks.slack.com/services/..."
                            value={slackConfig.webhookUrl}
                            onChange={(e) =>
                              setSlackConfig(prev => ({ ...prev, webhookUrl: e.target.value }))
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => toggleSecret("slack-webhook")}
                          >
                            {showSecrets["slack-webhook"] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <Button
                          variant="outline"
                          onClick={handleTestSlack}
                          disabled={testing === "slack" || !slackConfig.webhookUrl}
                        >
                          {testing === "slack" ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <TestTube className="h-4 w-4 mr-2" />
                          )}
                          Test
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slack-channel">Default Channel</Label>
                      <Input
                        id="slack-channel"
                        placeholder="#code-reviews"
                        value={slackConfig.channel}
                        onChange={(e) =>
                          setSlackConfig(prev => ({ ...prev, channel: e.target.value }))
                        }
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Notification Types</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">New Review Assignments</p>
                            <p className="text-xs text-muted-foreground">When a new review is assigned</p>
                          </div>
                          <Switch
                            checked={slackConfig.notifyNewReviews}
                            onCheckedChange={(checked) =>
                              setSlackConfig(prev => ({ ...prev, notifyNewReviews: checked }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Overdue Reviews</p>
                            <p className="text-xs text-muted-foreground">When a review becomes overdue</p>
                          </div>
                          <Switch
                            checked={slackConfig.notifyOverdue}
                            onCheckedChange={(checked) =>
                              setSlackConfig(prev => ({ ...prev, notifyOverdue: checked }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Changes Requested</p>
                            <p className="text-xs text-muted-foreground">When changes are requested on your code</p>
                          </div>
                          <Switch
                            checked={slackConfig.notifyChangesRequested}
                            onCheckedChange={(checked) =>
                              setSlackConfig(prev => ({ ...prev, notifyChangesRequested: checked }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </motion.div>
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-border bg-card/80 backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-teal/10 p-2">
                      <MessageSquare className="h-5 w-5 text-teal" />
                    </div>
                    <div>
                      <CardTitle>Microsoft Teams Integration</CardTitle>
                      <CardDescription>Send notifications to a Teams channel</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {teamsConfig.enabled && teamsConfig.webhookUrl && (
                      <Badge variant="secondary" className="bg-teal/10 text-teal">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    )}
                    <Switch
                      checked={teamsConfig.enabled}
                      onCheckedChange={(checked) =>
                        setTeamsConfig(prev => ({ ...prev, enabled: checked }))
                      }
                    />
                  </div>
                </div>
              </CardHeader>
              {teamsConfig.enabled && (
                <CardContent className="space-y-6">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>How to set up Teams Webhook</AlertTitle>
                    <AlertDescription className="mt-2">
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>Open Microsoft Teams and go to the channel</li>
                        <li>Click the "..." menu and select "Connectors"</li>
                        <li>Search for "Incoming Webhook" and click "Configure"</li>
                        <li>Give it a name and copy the webhook URL</li>
                      </ol>
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="teams-webhook">Webhook URL</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            id="teams-webhook"
                            type={showSecrets["teams-webhook"] ? "text" : "password"}
                            placeholder="https://outlook.office.com/webhook/..."
                            value={teamsConfig.webhookUrl}
                            onChange={(e) =>
                              setTeamsConfig(prev => ({ ...prev, webhookUrl: e.target.value }))
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => toggleSecret("teams-webhook")}
                          >
                            {showSecrets["teams-webhook"] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <Button
                          variant="outline"
                          onClick={handleTestTeams}
                          disabled={testing === "teams" || !teamsConfig.webhookUrl}
                        >
                          {testing === "teams" ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <TestTube className="h-4 w-4 mr-2" />
                          )}
                          Test
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="teams-channel">Channel Name</Label>
                      <Input
                        id="teams-channel"
                        placeholder="Code Reviews"
                        value={teamsConfig.channel}
                        onChange={(e) =>
                          setTeamsConfig(prev => ({ ...prev, channel: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </motion.div>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-border bg-card/80 backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-teal/10 p-2">
                      <Mail className="h-5 w-5 text-teal" />
                    </div>
                    <div>
                      <CardTitle>Email Configuration</CardTitle>
                      <CardDescription>Server-side email provider settings</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[color:var(--orange)] border-amber-300">
                    <Settings className="h-3 w-3 mr-1" />
                    Admin Only
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert variant="default" className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                  <AlertCircle className="h-4 w-4 text-[color:var(--orange)]" />
                  <AlertTitle className="text-amber-800 dark:text-amber-200">Administrator Configuration</AlertTitle>
                  <AlertDescription className="text-amber-700 dark:text-amber-300">
                    Email settings are configured through environment variables on the server.
                    Please contact your system administrator to enable or modify email notifications.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4 opacity-60">
                  <h4 className="text-sm font-medium">Required Environment Variables</h4>
                  
                  <div className="rounded-lg border border-border bg-background/60 p-4 font-mono text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground"># SendGrid Configuration</span>
                      <Button variant="ghost" size="sm" onClick={() => {
                        navigator.clipboard.writeText("EMAIL_ENABLED=true\nEMAIL_PROVIDER=sendgrid\nSENDGRID_API_KEY=your_api_key\nSENDGRID_FROM_EMAIL=noreply@example.com")
                        toast.success("Copied to clipboard")
                      }}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p>EMAIL_ENABLED=true</p>
                    <p>EMAIL_PROVIDER=sendgrid</p>
                    <p>SENDGRID_API_KEY=your_api_key</p>
                    <p>SENDGRID_FROM_EMAIL=noreply@example.com</p>
                  </div>

                  <Separator />

                  <div className="rounded-lg border border-border bg-background/60 p-4 font-mono text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground"># SMTP Configuration</span>
                      <Button variant="ghost" size="sm" onClick={() => {
                        navigator.clipboard.writeText("EMAIL_ENABLED=true\nEMAIL_PROVIDER=smtp\nSMTP_HOST=smtp.gmail.com\nSMTP_PORT=587\nSMTP_USERNAME=your_email\nSMTP_PASSWORD=your_password")
                        toast.success("Copied to clipboard")
                      }}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p>EMAIL_ENABLED=true</p>
                    <p>EMAIL_PROVIDER=smtp</p>
                    <p>SMTP_HOST=smtp.gmail.com</p>
                    <p>SMTP_PORT=587</p>
                    <p>SMTP_USERNAME=your_email</p>
                    <p>SMTP_PASSWORD=your_password</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ExternalLink className="h-4 w-4" />
                  <a
                    href="https://sendgrid.com/docs/for-developers/sending-email/api-getting-started/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    SendGrid API Documentation
                  </a>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
