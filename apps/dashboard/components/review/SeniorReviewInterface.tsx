"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  CheckCircle, AlertTriangle, Shield, MessageSquare, Code, FileText,
  Clock, User, GitBranch, Info, XCircle, Send, Sparkles, Ban, AlertOctagon
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface SeniorReviewInterfaceProps {
  analysisId: string
  assignmentId?: string
}

interface AnalysisData {
  id: string
  repo: string
  branch: string
  pr_label: string
  author: string
  created_at: string
  status: string
  summary: {
    total_files: number
    additions: number
    deletions: number
    issues_found: number
    critical_issues: number
  }
  files: FileChange[]
}

interface FileChange {
  path: string
  status: "added" | "modified" | "deleted"
  additions: number
  deletions: number
  diff: string
  suggestions: Suggestion[]
}

interface Suggestion {
  line: number
  severity: "info" | "warning" | "error" | "critical"
  message: string
  category: string
}

export function SeniorReviewInterface({ analysisId, assignmentId }: SeniorReviewInterfaceProps) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<FileChange | null>(null)
  const [comment, setComment] = useState("")
  const [reviewComments, setReviewComments] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [blockDialogOpen, setBlockDialogOpen] = useState(false)
  const [blockReason, setBlockReason] = useState("")
  const [blockCategory, setBlockCategory] = useState<string>("security")

  useEffect(() => {
    // Mock data with critical issues
    const mockAnalysis: AnalysisData = {
      id: analysisId,
      repo: "backend/api",
      branch: "feature/authentication",
      pr_label: "PR #789",
      author: "bob@company.com",
      created_at: "2026-03-30T09:15:00Z",
      status: "pending_review",
      summary: {
        total_files: 7,
        additions: 345,
        deletions: 89,
        issues_found: 12,
        critical_issues: 2,
      },
      files: [
        {
          path: "src/auth/login.ts",
          status: "modified",
          additions: 123,
          deletions: 34,
          diff: `@@ -10,8 +10,15 @@
export async function authenticateUser(username: string, password: string) {
-  const user = await db.users.findOne({ username, password })
-  if (user) {
-    return generateToken(user)
-  }
-  return null
+  // Hash password before comparing
+  const hashedPassword = await bcrypt.hash(password, 10)
+  const user = await db.users.findOne({ 
+    username,
+    password: hashedPassword 
+  })
+  
+  if (user) {
+    const token = generateToken(user)
+    return { token, user }
+  }
+  throw new Error('Invalid credentials')
}`,
          suggestions: [
            {
              line: 14,
              severity: "critical",
              message: "CRITICAL: Password should be hashed BEFORE storing, not during authentication. This creates a new hash each time and will never match stored hashes.",
              category: "Security"
            },
            {
              line: 15,
              severity: "error",
              message: "Passwords stored in plain text in database. This is a major security vulnerability.",
              category: "Security"
            },
            {
              line: 20,
              severity: "warning",
              message: "Consider implementing rate limiting to prevent brute force attacks",
              category: "Security"
            }
          ]
        },
        {
          path: "src/auth/token.ts",
          status: "modified",
          additions: 67,
          deletions: 12,
          diff: `@@ -5,10 +5,20 @@
const SECRET_KEY = "my-secret-key-123"

export function generateToken(user: User): string {
-  return jwt.sign({ id: user.id }, SECRET_KEY)
+  return jwt.sign(
+    { 
+      id: user.id,
+      email: user.email,
+      role: user.role 
+    }, 
+    SECRET_KEY,
+    { expiresIn: '24h' }
+  )
}`,
          suggestions: [
            {
              line: 5,
              severity: "critical",
              message: "CRITICAL: Secret key is hardcoded. Must use environment variable and a strong, randomly generated secret.",
              category: "Security"
            },
            {
              line: 10,
              severity: "info",
              message: "Good: Added token expiration",
              category: "Security"
            }
          ]
        },
        {
          path: "src/utils/validation.ts",
          status: "added",
          additions: 45,
          deletions: 0,
          diff: `@@ -0,0 +1,45 @@
+export function validateEmail(email: string): boolean {
+  const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/
+  return regex.test(email)
+}
+
+export function validatePassword(password: string): boolean {
+  return password.length >= 8
+}`,
          suggestions: [
            {
              line: 7,
              severity: "warning",
              message: "Password validation is too weak. Consider requiring uppercase, lowercase, numbers, and special characters.",
              category: "Security"
            }
          ]
        }
      ]
    }

    setTimeout(() => {
      setAnalysis(mockAnalysis)
      if (mockAnalysis.files.length > 0) {
        setSelectedFile(mockAnalysis.files[0])
      }
      setLoading(false)
    }, 800)
  }, [analysisId])

  const handleAddComment = () => {
    if (comment.trim()) {
      setReviewComments([...reviewComments, comment])
      setComment("")
    }
  }

  const handleApprove = async () => {
    if (analysis && analysis.summary.critical_issues > 0) {
      const confirm = window.confirm(
        `⚠️ This PR has ${analysis.summary.critical_issues} critical issue(s). Are you sure you want to approve?`
      )
      if (!confirm) return
    }

    setSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    alert("✅ Review approved! The changes will be merged.")
    setSubmitting(false)
  }

  const handleRequestChanges = async () => {
    if (reviewComments.length === 0) {
      alert("Please add comments explaining what changes are required")
      return
    }
    setSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    alert("📝 Changes requested! The developer must address your comments before merging.")
    setSubmitting(false)
  }

  const handleBlock = async () => {
    if (!blockReason.trim()) {
      alert("Please provide a reason for blocking this PR")
      return
    }
    setSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setBlockDialogOpen(false)
    alert(`🛑 PR BLOCKED!\n\nCategory: ${blockCategory}\nReason: ${blockReason}\n\nThe developer cannot merge until issues are resolved.`)
    setSubmitting(false)
  }

  if (loading || !analysis) {
    return (
      <div className="container mx-auto py-6 space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-gray-200 rounded"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="space-y-4">
            <div className="h-48 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  const hasCriticalIssues = analysis.summary.critical_issues > 0

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with Senior Reviewer Badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">Code Review</h1>
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none">
              <Shield className="h-3 w-3 mr-1" />
              Senior Reviewer
            </Badge>
          </div>
          <p className="text-gray-600">
            {analysis.repo} • {analysis.pr_label} by {analysis.author}
          </p>
        </div>
        {assignmentId && (
          <Badge variant="outline" className="text-sm">
            Assignment: {assignmentId}
          </Badge>
        )}
      </motion.div>

      {/* Critical Issues Alert */}
      {hasCriticalIssues && (
        <Alert className="bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-800">
          <AlertOctagon className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-900 dark:text-red-100">
            <strong>⚠️ {analysis.summary.critical_issues} Critical Security Issue(s) Detected!</strong>
            <br />
            As a Senior Reviewer, you have the authority to block this PR. Review carefully before approving.
          </AlertDescription>
        </Alert>
      )}

      {/* Senior Reviewer Info */}
      <Alert className="bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800">
        <Shield className="h-4 w-4 text-purple-600" />
        <AlertDescription className="text-purple-900 dark:text-purple-100">
          <strong>Senior Reviewer Mode:</strong> You can approve, block PRs, and request mandatory changes. 
          Use blocking power responsibly for critical security or architectural issues.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Summary Card with Critical Issues */}
          <Card className={hasCriticalIssues ? "border-red-300 dark:border-red-800" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Change Summary
                {hasCriticalIssues && (
                  <Badge variant="destructive" className="ml-2">
                    {analysis.summary.critical_issues} Critical
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {analysis.summary.total_files}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Files</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    +{analysis.summary.additions}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Added</div>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    -{analysis.summary.deletions}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Deleted</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {analysis.summary.issues_found}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Issues</div>
                </div>
                <div className="text-center p-3 bg-red-100 dark:bg-red-950/40 rounded-lg border-2 border-red-300 dark:border-red-800">
                  <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                    {analysis.summary.critical_issues}
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-400 font-semibold">Critical</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Files Tabs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Changed Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedFile?.path} onValueChange={(path) => {
                const file = analysis.files.find(f => f.path === path)
                if (file) setSelectedFile(file)
              }}>
                <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
                  {analysis.files.map((file) => {
                    const hasCritical = file.suggestions.some(s => s.severity === "critical")
                    return (
                      <TabsTrigger key={file.path} value={file.path} className="flex items-center gap-2">
                        <Badge variant={
                          file.status === "added" ? "default" : 
                          file.status === "deleted" ? "destructive" : 
                          "secondary"
                        } className="text-xs">
                          {file.status === "added" ? "A" : file.status === "deleted" ? "D" : "M"}
                        </Badge>
                        {file.path.split("/").pop()}
                        {hasCritical && (
                          <AlertOctagon className="h-3 w-3 text-red-600 ml-1" />
                        )}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>

                {analysis.files.map((file) => (
                  <TabsContent key={file.path} value={file.path} className="mt-4">
                    <div className="space-y-4">
                      {/* File Info */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="font-mono text-sm text-gray-700 dark:text-gray-300">
                          {file.path}
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-green-600">+{file.additions}</span>
                          <span className="text-red-600">-{file.deletions}</span>
                        </div>
                      </div>

                      {/* AI Suggestions with Severity */}
                      {file.suggestions.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-purple-500" />
                            Security & Quality Analysis
                          </h4>
                          {file.suggestions
                            .sort((a, b) => {
                              const severityOrder = { critical: 0, error: 1, warning: 2, info: 3 }
                              return severityOrder[a.severity] - severityOrder[b.severity]
                            })
                            .map((suggestion, idx) => (
                            <Alert
                              key={idx}
                              className={
                                suggestion.severity === "critical" ? "border-red-500 bg-red-100 dark:bg-red-950/40 border-2" :
                                suggestion.severity === "error" ? "border-red-200 bg-red-50 dark:bg-red-950/20" :
                                suggestion.severity === "warning" ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20" :
                                "border-blue-200 bg-blue-50 dark:bg-blue-950/20"
                              }
                            >
                              <div className="flex items-start gap-2">
                                {suggestion.severity === "critical" && <AlertOctagon className="h-5 w-5 text-red-600 mt-0.5" />}
                                {suggestion.severity === "error" && <XCircle className="h-5 w-5 text-red-500 mt-0.5" />}
                                {suggestion.severity === "warning" && <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />}
                                {suggestion.severity === "info" && <Info className="h-5 w-5 text-blue-500 mt-0.5" />}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge 
                                      variant={suggestion.severity === "critical" ? "destructive" : "outline"}
                                      className={suggestion.severity === "critical" ? "font-bold" : ""}
                                    >
                                      {suggestion.category}
                                    </Badge>
                                    {suggestion.severity === "critical" && (
                                      <Badge variant="destructive">CRITICAL</Badge>
                                    )}
                                  </div>
                                  <AlertDescription className="text-sm">
                                    <strong>Line {suggestion.line}:</strong> {suggestion.message}
                                  </AlertDescription>
                                </div>
                              </div>
                            </Alert>
                          ))}
                        </div>
                      )}

                      {/* Diff View */}
                      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <pre className="text-sm font-mono whitespace-pre-wrap">
                          {file.diff}
                        </pre>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Review Actions */}
        <div className="space-y-4">
          {/* Review Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <GitBranch className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400">Branch:</span>
                <span className="font-mono font-medium">{analysis.branch}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400">Author:</span>
                <span className="font-medium">{analysis.author}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400">Created:</span>
                <span className="font-medium">
                  {new Date(analysis.created_at).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Add Comment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Add Comment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Provide detailed feedback..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <Button
                onClick={handleAddComment}
                variant="outline"
                size="sm"
                className="w-full"
                disabled={!comment.trim()}
              >
                <Send className="h-4 w-4 mr-2" />
                Add Comment
              </Button>

              {reviewComments.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Separator />
                  <h4 className="text-sm font-semibold">Your Comments ({reviewComments.length})</h4>
                  <ScrollArea className="h-32 rounded-md border p-2">
                    {reviewComments.map((c, idx) => (
                      <div key={idx} className="mb-2 p-2 bg-gray-50 dark:bg-gray-900 rounded text-sm">
                        {c}
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Senior Action Buttons */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-500" />
                Senior Review Actions
              </CardTitle>
              <CardDescription>
                You have full review authority
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleApprove}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={submitting}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve & Merge
              </Button>

              <Button
                onClick={handleRequestChanges}
                variant="outline"
                className="w-full"
                disabled={submitting || reviewComments.length === 0}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Request Changes
              </Button>

              <Separator />

              <Button
                onClick={() => setBlockDialogOpen(true)}
                variant="destructive"
                className="w-full"
                disabled={submitting}
              >
                <Ban className="h-4 w-4 mr-2" />
                Block This PR
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Use blocking for critical security, legal, or architectural issues
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Block Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Ban className="h-5 w-5" />
              Block Pull Request
            </DialogTitle>
            <DialogDescription>
              This will prevent the PR from being merged until issues are resolved. Provide a clear reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Block Category</Label>
              <RadioGroup value={blockCategory} onValueChange={setBlockCategory}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="security" id="security" />
                  <Label htmlFor="security" className="font-normal cursor-pointer">
                    Security Vulnerability
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="architecture" id="architecture" />
                  <Label htmlFor="architecture" className="font-normal cursor-pointer">
                    Architecture Violation
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="performance" id="performance" />
                  <Label htmlFor="performance" className="font-normal cursor-pointer">
                    Critical Performance Issue
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="legal" id="legal" />
                  <Label htmlFor="legal" className="font-normal cursor-pointer">
                    Legal/Compliance Issue
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other" className="font-normal cursor-pointer">
                    Other Critical Issue
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Detailed Reason *</Label>
              <Textarea
                id="reason"
                placeholder="Explain why this PR must be blocked..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>
            <Alert className="bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800">
              <AlertOctagon className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-sm text-red-900 dark:text-red-100">
                The developer will be notified immediately and must resolve all issues before resubmitting.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBlock}
              disabled={!blockReason.trim() || submitting}
            >
              <Ban className="h-4 w-4 mr-2" />
              Block PR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
