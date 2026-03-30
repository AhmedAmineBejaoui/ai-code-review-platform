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
  CheckCircle, AlertTriangle, Star, MessageSquare, Code, FileText,
  Clock, User, GitBranch, Info, ArrowUp, Send, Sparkles
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

interface JuniorReviewInterfaceProps {
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
  severity: "info" | "warning" | "error"
  message: string
  category: string
}

export function JuniorReviewInterface({ analysisId, assignmentId }: JuniorReviewInterfaceProps) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<FileChange | null>(null)
  const [comment, setComment] = useState("")
  const [reviewComments, setReviewComments] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockAnalysis: AnalysisData = {
      id: analysisId,
      repo: "frontend/webapp",
      branch: "feature/user-dashboard",
      pr_label: "PR #456",
      author: "alice@company.com",
      created_at: "2026-03-30T10:30:00Z",
      status: "pending_review",
      summary: {
        total_files: 5,
        additions: 234,
        deletions: 45,
        issues_found: 8,
      },
      files: [
        {
          path: "src/components/Dashboard.tsx",
          status: "modified",
          additions: 89,
          deletions: 12,
          diff: `@@ -15,7 +15,12 @@
export function Dashboard() {
-  const [data, setData] = useState([])
+  const [data, setData] = useState<DashboardData[]>([])
+  const [loading, setLoading] = useState(false)
  
-  useEffect(() => {
-    fetchData()
-  }, [])
+  useEffect(() => {
+    setLoading(true)
+    fetchData().finally(() => setLoading(false))
+  }, [])`,
          suggestions: [
            {
              line: 18,
              severity: "info",
              message: "Good: Added TypeScript types for better type safety",
              category: "Best Practice"
            },
            {
              line: 22,
              severity: "info",
              message: "Good: Added loading state management",
              category: "UX"
            }
          ]
        },
        {
          path: "src/utils/api.ts",
          status: "modified",
          additions: 45,
          deletions: 8,
          diff: `@@ -10,5 +10,15 @@
export async function fetchData() {
-  const response = await fetch('/api/data')
-  return response.json()
+  try {
+    const response = await fetch('/api/data')
+    if (!response.ok) {
+      throw new Error('Failed to fetch data')
+    }
+    return response.json()
+  } catch (error) {
+    console.error('API Error:', error)
+    throw error
+  }
}`,
          suggestions: [
            {
              line: 15,
              severity: "warning",
              message: "Consider using a proper error handling service instead of console.error",
              category: "Error Handling"
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
    setSubmitting(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    alert("✅ Review approved! The developer will be notified.")
    setSubmitting(false)
  }

  const handleSuggestChanges = async () => {
    if (reviewComments.length === 0) {
      alert("Please add at least one comment before suggesting changes")
      return
    }
    setSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    alert("💡 Suggestions sent! The developer will review your comments.")
    setSubmitting(false)
  }

  const handleEscalate = async () => {
    setSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    alert("⬆️ Review escalated to senior reviewer!")
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with Junior Reviewer Badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">Code Review</h1>
            <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-none">
              <Star className="h-3 w-3 mr-1" />
              Junior Reviewer
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

      {/* Junior Reviewer Info Alert */}
      <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900 dark:text-blue-100">
          <strong>Junior Reviewer Mode:</strong> You can approve changes and suggest improvements. 
          If you find critical issues, use the &quot;Escalate to Senior&quot; button.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Change Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {analysis.summary.total_files}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Files Changed</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    +{analysis.summary.additions}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Additions</div>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    -{analysis.summary.deletions}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Deletions</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {analysis.summary.issues_found}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Issues Found</div>
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
                <TabsList className="w-full justify-start overflow-x-auto">
                  {analysis.files.map((file) => (
                    <TabsTrigger key={file.path} value={file.path} className="flex items-center gap-2">
                      <Badge variant={
                        file.status === "added" ? "default" : 
                        file.status === "deleted" ? "destructive" : 
                        "secondary"
                      } className="text-xs">
                        {file.status === "added" ? "A" : file.status === "deleted" ? "D" : "M"}
                      </Badge>
                      {file.path.split("/").pop()}
                    </TabsTrigger>
                  ))}
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

                      {/* AI Suggestions */}
                      {file.suggestions.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-purple-500" />
                            AI Analysis
                          </h4>
                          {file.suggestions.map((suggestion, idx) => (
                            <Alert
                              key={idx}
                              className={
                                suggestion.severity === "error" ? "border-red-200 bg-red-50 dark:bg-red-950/20" :
                                suggestion.severity === "warning" ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20" :
                                "border-blue-200 bg-blue-50 dark:bg-blue-950/20"
                              }
                            >
                              <Badge variant="outline" className="mb-2">
                                {suggestion.category}
                              </Badge>
                              <AlertDescription className="text-sm">
                                <strong>Line {suggestion.line}:</strong> {suggestion.message}
                              </AlertDescription>
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
                placeholder="Share your thoughts or suggestions..."
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

              {/* Review Comments List */}
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

          {/* Action Buttons */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review Actions</CardTitle>
              <CardDescription>
                Choose an action for this review
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleApprove}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={submitting}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Changes
              </Button>

              <Button
                onClick={handleSuggestChanges}
                variant="outline"
                className="w-full"
                disabled={submitting || reviewComments.length === 0}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Suggest Changes
              </Button>

              <Separator />

              <Button
                onClick={handleEscalate}
                variant="outline"
                className="w-full text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                disabled={submitting}
              >
                <ArrowUp className="h-4 w-4 mr-2" />
                Escalate to Senior
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Escalate if you find critical security or architectural issues
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
