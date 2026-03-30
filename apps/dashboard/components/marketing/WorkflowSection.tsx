"use client"

import { motion } from "framer-motion"
import { CheckCircle, Circle } from "lucide-react"

const steps = [
  { id: 1, name: "Start", status: "completed" },
  { id: 2, name: "CodeReviewRequest", status: "completed" },
  { id: 3, name: "AssignReviewer", status: "active" },
  { id: 4, name: "ReviewCode", status: "pending" },
  { id: 5, name: "ProvideFeedback", status: "pending" },
  { id: 6, name: "ImplementChanges", status: "pending" },
  { id: 7, name: "FinalApproval", status: "pending" },
  { id: 8, name: "End", status: "pending" },
]

export function WorkflowSection() {
  return (
    <section className="px-6 py-24 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Streamlined Review Workflow
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            From request to merge, every step is optimized for speed and quality.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-16"
        >
          {/* Workflow visualization */}
          <div className="relative overflow-x-auto pb-4">
            <div className="flex items-center justify-between gap-2 min-w-max px-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  {/* Step node */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                        step.status === "completed"
                          ? "border-green-500 bg-green-50"
                          : step.status === "active"
                            ? "border-blue-500 bg-blue-50 shadow-lg shadow-blue-200"
                            : "border-gray-300 bg-white"
                      }`}
                    >
                      {step.status === "completed" ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : step.status === "active" ? (
                        <Circle className="h-6 w-6 fill-blue-500 text-blue-500" />
                      ) : (
                        <Circle className="h-6 w-6 text-gray-300" />
                      )}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium ${
                        step.status === "completed"
                          ? "text-green-600"
                          : step.status === "active"
                            ? "text-blue-600"
                            : "text-gray-400"
                      }`}
                    >
                      {step.name}
                    </span>
                  </div>

                  {/* Connector line */}
                  {index < steps.length - 1 && (
                    <div
                      className={`mx-2 h-0.5 w-16 ${
                        step.status === "completed" ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Code review preview */}
          <div className="mt-16 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
                <span className="ml-4 text-sm font-medium text-gray-700">payment.service.ts</span>
                <span className="ml-auto rounded-md bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  PR #482
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-2">
              {/* Code section */}
              <div className="border-r border-gray-200 bg-gray-50 p-6 font-mono text-sm">
                <div className="mb-2 flex gap-2 text-gray-500">
                  <span>1</span>
                  <span className="text-gray-700">
                    <span className="text-purple-600">async function</span> processPayment(userId:
                    <span className="text-blue-600">string</span>) &#123;
                  </span>
                </div>
                <div className="mb-2 flex gap-2 text-gray-500">
                  <span>2</span>
                  <span className="ml-4 text-gray-700">
                    const user= <span className="text-blue-600">await</span> db.
                    <span className="text-purple-600">findUser</span>(userId)
                  </span>
                </div>
                <div className="mb-2 flex gap-2 text-gray-500">
                  <span>3</span>
                  <span className="ml-4 text-gray-400">// TODO: validate amount</span>
                </div>
                <div className="mb-2 flex gap-2 text-gray-500">
                  <span>4</span>
                  <span className="ml-4 text-gray-700">
                    const result= <span className="text-blue-600">await</span> stripe.
                    <span className="text-purple-600">charge</span>(&#123;
                  </span>
                </div>
                <div className="mb-2 flex gap-2 text-gray-500">
                  <span>5</span>
                  <span className="ml-8 text-gray-700">amount: amount,</span>
                </div>
                <div className="mb-2 flex gap-2 text-gray-500">
                  <span>6</span>
                  <span className="ml-8 text-gray-700">currency: "usd",</span>
                </div>
                <div className="mb-2 flex gap-2 text-gray-500">
                  <span>7</span>
                  <span className="ml-4 text-gray-700">&#125;)</span>
                </div>
                <div className="flex gap-2 text-gray-500">
                  <span>8</span>
                  <span className="ml-4 text-gray-700">
                    <span className="text-purple-600">return</span> result
                  </span>
                </div>
              </div>

              {/* Issues section */}
              <div className="bg-white p-6">
                <div className="mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-900">Review Complete</h4>
                </div>
                <p className="mb-4 text-sm text-gray-600">5 issues found · 98s</p>

                <div className="space-y-3">
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">SQL</span>
                      <span className="text-xs font-semibold text-red-900">Missing input validation</span>
                    </div>
                    <p className="text-xs text-red-800">amount parameter needs validation</p>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded bg-amber-600 px-2 py-0.5 text-xs font-bold text-white">Missing</span>
                      <span className="text-xs font-semibold text-amber-900">Hard-coded currency string</span>
                    </div>
                    <p className="text-xs text-amber-800">Consider using an enum constant</p>
                  </div>

                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">ℹ</span>
                      <span className="text-xs font-semibold text-blue-900">Prompt for AI agents</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
