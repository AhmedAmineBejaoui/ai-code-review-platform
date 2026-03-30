"use client"

import { motion } from "framer-motion"
import { AlertTriangle, Shield, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

interface SecurityIssue {
  id: string
  title: string
  severity: "critical" | "high" | "medium" | "low"
  category: string
  repository: string
  status: "active" | "resolved"
  updatedAt: string
}

const mockIssues: SecurityIssue[] = [
  {
    id: "1",
    title: "Remote code execution (RCE) from untrusted input evaluated by eval/exec",
    severity: "critical",
    category: "core",
    repository: "backend/registry",
    status: "active",
    updatedAt: "8 hours ago",
  },
  {
    id: "2",
    title: "Command injection from untrusted input passed to OS command execution",
    severity: "high",
    category: "core",
    repository: "services/api",
    status: "active",
    updatedAt: "1 day ago",
  },
  {
    id: "3",
    title: "Path traversal from user-controlled file paths in filesystem and integrate operations",
    severity: "high",
    category: "security • vscode",
    repository: "extensions/fs",
    status: "active",
    updatedAt: "2 days ago",
  },
  {
    id: "4",
    title: "Cross site scripting (XSS) from unescaped user input in HTTP responses",
    severity: "high",
    category: "core",
    repository: "frontend/utils",
    status: "active",
    updatedAt: "3 days ago",
  },
  {
    id: "5",
    title: "Remote code execution (RCE) due to unpinned base image tag in Dockerfile",
    severity: "high",
    category: "core",
    repository: "docker/base",
    status: "active",
    updatedAt: "3 days ago",
  },
  {
    id: "6",
    title: "Detected a Generic API Key, potentially exposing access to various services and sensitive operations.",
    severity: "high",
    category: "core",
    repository: "services/auth",
    status: "active",
    updatedAt: "4 days ago",
  },
  {
    id: "7",
    title: "4 exposed secrets",
    severity: "medium",
    category: "core",
    repository: "config/env",
    status: "active",
    updatedAt: "5 days ago",
  },
]

const severityColors = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-amber-100 text-amber-800 border-amber-200",
  medium: "bg-blue-100 text-blue-800 border-blue-200",
  low: "bg-gray-100 text-gray-800 border-gray-200",
}

const severityIcons = {
  critical: "🔴",
  high: "🟠",
  medium: "🔵",
  low: "⚪",
}

export function SecurityIssueTable() {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Severity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Repository
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {mockIssues.map((issue, index) => (
              <motion.tr
                key={issue.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center">
                    {issue.severity === "critical" ? (
                      <Shield className="h-5 w-5 text-red-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">{issue.title}</span>
                    <span className="mt-1 text-xs text-gray-500">in {issue.repository}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <Badge
                    variant="outline"
                    className={`border ${severityColors[issue.severity]}`}
                  >
                    {severityIcons[issue.severity]} {issue.severity}
                  </Badge>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <Badge variant="outline" className="font-mono text-xs">
                    {issue.category}
                  </Badge>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={issue.status === "active" ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {issue.status}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {issue.updatedAt}
                    </div>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
