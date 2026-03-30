"use client"

import { motion } from "framer-motion"
import { GitPullRequest, Shield, CheckCircle, AlertCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function ReviewEverywhereSection() {
  return (
    <section id="features" className="px-6 py-24 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Review Everywhere You Work
          </h2>
          <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" />
        </motion.div>

        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          {/* On PRs Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="relative overflow-hidden border-t-4 border-t-amber-500 p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100">
                  <GitPullRequest className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">On PRs</h3>
              </div>

              <p className="mb-6 text-gray-600">
                Instant code reviews with clear summaries and fixes.
              </p>

              <ul className="mb-8 space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                  <span className="text-gray-700">Catch bugs and potential issues immediately</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                  <span className="text-gray-700">Enforce your code standards</span>
                </li>
              </ul>

              {/* Code Preview Mock */}
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                  <span className="ml-2 text-xs text-gray-600">src/components/Canvas/index.tsx</span>
                </div>
                <div className="bg-gradient-to-b from-green-50 to-white p-4 font-mono text-xs">
                  <div className="mb-2 flex items-start gap-2">
                    <span className="text-gray-400">1558</span>
                    <span className="text-green-600">+</span>
                  </div>
                  <div className="mb-2 flex items-start gap-2">
                    <span className="text-gray-400">1559</span>
                    <span className="text-green-600">+</span>
                    <span className="ml-4 text-gray-700">const handleSelection = () =&gt; &#123;</span>
                  </div>
                  <div className="mb-2 flex items-start gap-2">
                    <span className="text-gray-400">1560</span>
                    <span className="text-green-600">+</span>
                    <span className="ml-8 text-gray-700">
                      const <span className="text-blue-600">activeObject</span> = canvas?.
                      <span className="text-purple-600">getActiveObject</span>();
                    </span>
                  </div>
                  <div className="mb-4 flex items-start gap-2">
                    <span className="text-gray-400">1561</span>
                    <span className="text-green-600">+</span>
                    <span className="ml-4 text-gray-700">&#125;;</span>
                  </div>

                  {/* AI Comment */}
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
                        <span className="text-xs font-bold text-white">AI</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-700">sourcery-ai</span>
                      <span className="text-xs text-gray-500">bot 2 days ago</span>
                    </div>
                    <p className="mb-2 text-xs font-medium text-gray-800">
                      suggestion (code_refinement): Refactor &apos;handleDrop&apos; to avoid redundant code and improve maintainability.
                    </p>
                    <p className="text-xs text-gray-600">
                      The &apos;handleDrop&apos; function contains multiple responsibilities and repeated code blocks...
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Across Repos Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="relative overflow-hidden border-t-4 border-t-indigo-500 p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100">
                  <Shield className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Across Repos</h3>
              </div>

              <p className="mb-6 text-gray-600">
                Continuous security scans with detailed explanations and fixes.
              </p>

              <ul className="mb-8 space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-indigo-600" />
                  <span className="text-gray-700">High signal, low noise security scans</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-indigo-600" />
                  <span className="text-gray-700">Find and fix issues across all your repos</span>
                </li>
              </ul>

              {/* Security Alert Mock */}
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <div className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Remote code execution (RCE) from untrusted input evaluated by eval
                    </h4>
                  </div>
                  <div className="mb-3 flex items-center gap-2">
                    <Badge variant="destructive" className="text-xs">
                      Critical
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      core
                    </Badge>
                    <span className="text-xs text-gray-500">Last updated 8 hours ago</span>
                  </div>

                  <div className="space-y-3 text-xs text-gray-700">
                    <div>
                      <h5 className="mb-1 font-semibold">Risk:</h5>
                      <p className="text-gray-600">
                        RCE lets attackers execute arbitrary code, access sensitive data, pivot the environment, or fully compromise the process when untrusted input reaches eval.
                      </p>
                    </div>
                    <div>
                      <h5 className="mb-1 font-semibold">Fix:</h5>
                      <p className="text-gray-600">
                        Remove eval usage. If parsing literals, use ast.literal_eval(). For calculations or logic, implement explicit handlers or a sandboxed like RestrictedPython with minimal, immutable globals.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
