"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Plus,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Archive,
  Folder,
  RefreshCw,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AnalysesPageHeaderProps {
  filter?: string | null
  status?: string | null
  view?: string | null
  action?: string | null
}

const filterLabels: Record<string, { title: string; description: string; icon: React.ElementType }> = {
  today: {
    title: "Today's Analyses",
    description: "Code reviews from the last 24 hours",
    icon: Calendar,
  },
  week: {
    title: "This Week",
    description: "Code reviews from the past 7 days",
    icon: Clock,
  },
  pending: {
    title: "Pending Review",
    description: "Analyses awaiting human review",
    icon: AlertTriangle,
  },
  archived: {
    title: "Archived",
    description: "Completed and archived analyses",
    icon: Archive,
  },
}

const statusLabels: Record<string, { title: string; description: string; icon: React.ElementType }> = {
  in_progress: {
    title: "In Progress",
    description: "Analyses currently being processed",
    icon: RefreshCw,
  },
  completed: {
    title: "Completed",
    description: "Successfully completed analyses",
    icon: CheckCircle2,
  },
  attention: {
    title: "Needs Attention",
    description: "Analyses requiring immediate action",
    icon: AlertTriangle,
  },
}

export function AnalysesPageHeader({ filter, status, view, action }: AnalysesPageHeaderProps) {
  const [isNewAnalysisOpen, setIsNewAnalysisOpen] = useState(action === "new")
  const [newAnalysisUrl, setNewAnalysisUrl] = useState("")
  const [newAnalysisProject, setNewAnalysisProject] = useState("")

  let title = "All Analyses"
  let description = "View and manage all code review analyses"
  let Icon: React.ElementType = Filter

  if (filter && filterLabels[filter]) {
    title = filterLabels[filter].title
    description = filterLabels[filter].description
    Icon = filterLabels[filter].icon
  } else if (status && statusLabels[status]) {
    title = statusLabels[status].title
    description = statusLabels[status].description
    Icon = statusLabels[status].icon
  } else if (view === "projects") {
    title = "By Project"
    description = "Analyses organized by project"
    Icon = Folder
  }

  const handleNewAnalysis = () => {
    // This would trigger the actual analysis
    console.log("Starting new analysis:", { url: newAnalysisUrl, project: newAnalysisProject })
    setIsNewAnalysisOpen(false)
    setNewAnalysisUrl("")
    setNewAnalysisProject("")
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
    >
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {(filter || status || view) && (
          <Badge variant="secondary" className="text-sm">
            {filter || status || view}
          </Badge>
        )}
        
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>

        <Dialog open={isNewAnalysisOpen} onOpenChange={setIsNewAnalysisOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Analysis
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Start New Analysis</DialogTitle>
              <DialogDescription>
                Enter the repository URL or PR link to begin a new code review analysis.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="repo-url">Repository / PR URL</Label>
                <Input
                  id="repo-url"
                  placeholder="https://github.com/org/repo/pull/123"
                  value={newAnalysisUrl}
                  onChange={(e) => setNewAnalysisUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project">Project (Optional)</Label>
                <Select value={newAnalysisProject} onValueChange={setNewAnalysisProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api-gateway">API Gateway</SelectItem>
                    <SelectItem value="auth-service">Authentication Service</SelectItem>
                    <SelectItem value="dashboard-ui">Dashboard UI</SelectItem>
                    <SelectItem value="data-pipeline">Data Pipeline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Analysis Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="justify-start">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                    Full Review
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                    Quick Scan
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsNewAnalysisOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleNewAnalysis} disabled={!newAnalysisUrl}>
                Start Analysis
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  )
}
