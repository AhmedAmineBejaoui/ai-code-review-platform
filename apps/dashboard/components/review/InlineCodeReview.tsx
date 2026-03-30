"use client"

import { motion } from "framer-motion"
import { CheckCircle, AlertTriangle, Info, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface CodeSuggestion {
  line: number
  severity: "error" | "warning" | "info"
  title: string
  description: string
}

const mockSuggestions: CodeSuggestion[] = [
  {
    line: 3,
    severity: "error",
    title: "SQL",
    description: "Missing input validation — amount",
  },
  {
    line: 6,
    severity: "warning",
    title: "Missing input validation",
    description: "amount parameter needs validation",
  },
  {
    line: 7,
    severity: "info",
    title: "Hard-coded currency string",
    description: "Consider using an enum constant",
  },
]

export function InlineCodeReview() {
  const issueCount = mockSuggestions.length

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Code Section */}
      <Card className="overflow-hidden">
        <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
            <span className="ml-2 font-mono text-sm font-medium text-gray-700">
              payment.service.ts
            </span>
            <Badge className="ml-auto bg-blue-600 text-white">PR #482</Badge>
          </div>
        </div>

        <div className="bg-gray-50 p-6 font-mono text-sm">
          {/* Line 1 */}
          <div className="mb-2 flex gap-3">
            <span className="w-8 text-right text-gray-400">1</span>
            <span className="text-gray-700">
              <span className="text-purple-600">async function</span>{" "}
              <span className="text-blue-600">processPayment</span>(userId:
              <span className="text-blue-600">string</span>) &#123;
            </span>
          </div>

          {/* Line 2 */}
          <div className="mb-2 flex gap-3">
            <span className="w-8 text-right text-gray-400">2</span>
            <span className="ml-4 text-gray-700">
              const user= <span className="text-purple-600">await</span> db.
              <span className="text-blue-600">findUser</span>(userId)
            </span>
          </div>

          {/* Line 3 - with error */}
          <div className="mb-2 flex gap-3 rounded bg-red-50">
            <span className="w-8 text-right text-gray-400">3</span>
            <span className="ml-4 text-gray-500">{/* TODO: validate amount */}</span>
            <AlertTriangle className="ml-auto h-4 w-4 text-red-500" />
          </div>

          {/* Line 4 */}
          <div className="mb-2 flex gap-3">
            <span className="w-8 text-right text-gray-400">4</span>
            <span className="ml-4 text-gray-700">
              const result= <span className="text-purple-600">await</span> stripe.
              <span className="text-blue-600">charge</span>(&#123;
            </span>
          </div>

          {/* Line 5 */}
          <div className="mb-2 flex gap-3">
            <span className="w-8 text-right text-gray-400">5</span>
            <span className="ml-8 text-gray-700">amount: amount,</span>
          </div>

          {/* Line 6 - with warning */}
          <div className="mb-2 flex gap-3 rounded bg-amber-50">
            <span className="w-8 text-right text-gray-400">6</span>
            <span className="ml-8 text-gray-700">currency: &quot;usd&quot;,</span>
            <Info className="ml-auto h-4 w-4 text-amber-500" />
          </div>

          {/* Line 7 */}
          <div className="mb-2 flex gap-3">
            <span className="w-8 text-right text-gray-400">7</span>
            <span className="ml-4 text-gray-700">&#125;)</span>
          </div>

          {/* Line 8 */}
          <div className="flex gap-3">
            <span className="w-8 text-right text-gray-400">8</span>
            <span className="ml-4 text-gray-700">
              <span className="text-purple-600">return</span> result
            </span>
          </div>
        </div>
      </Card>

      {/* Suggestions Panel */}
      <Card>
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Review Complete</h3>
          </div>
          <p className="mt-1 text-sm text-gray-600">{issueCount} issues found · 98s</p>
        </div>

        <div className="space-y-4 p-6">
          {/* SQL Error */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-lg border border-red-200 bg-red-50 p-4"
          >
            <div className="mb-2 flex items-start gap-2">
              <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <Badge variant="destructive" className="text-xs font-bold">
                    SQL
                  </Badge>
                  <span className="text-sm font-semibold text-red-900">Missing input validation</span>
                </div>
                <p className="text-sm text-red-800">
                  amount parameter needs validation to prevent SQL injection attacks
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    View Details
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    Ignore
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Missing Validation Warning */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="rounded-lg border border-amber-200 bg-amber-50 p-4"
          >
            <div className="mb-2 flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <Badge className="bg-amber-600 text-xs font-bold text-white">Missing</Badge>
                  <span className="text-sm font-semibold text-amber-900">
                    Missing input validation — amount
                  </span>
                </div>
                <p className="text-sm text-amber-800">
                  The amount parameter should be validated before being used in the charge operation
                </p>
              </div>
            </div>
          </motion.div>

          {/* Hard-coded String Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="rounded-lg border border-blue-200 bg-blue-50 p-4"
          >
            <div className="mb-2 flex items-start gap-2">
              <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <Badge className="bg-blue-600 text-xs font-bold text-white">ℹ</Badge>
                  <span className="text-sm font-semibold text-blue-900">
                    Hard-coded currency string — consider using an enum constant
                  </span>
                </div>
                <p className="text-sm text-blue-800">
                  Replace the hard-coded &quot;usd&quot; string with a constant or enum value for better maintainability
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </Card>
    </div>
  )
}
