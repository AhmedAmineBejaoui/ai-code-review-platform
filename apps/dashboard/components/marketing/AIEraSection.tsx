"use client"

import { motion } from "framer-motion"
import { Zap, Bug, ShieldCheck } from "lucide-react"
import { Card } from "@/components/ui/card"

const features = [
  {
    icon: Zap,
    title: "Keep velocity high",
    description: "Shorter review cycles, fewer blockers, faster merges.",
    color: "from-green-400 to-emerald-500",
    bgColor: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    icon: Bug,
    title: "Kill bugs fast",
    description: "Logic errors and edge cases caught before they create rework.",
    color: "from-red-400 to-rose-500",
    bgColor: "bg-red-50",
    iconColor: "text-red-600",
  },
  {
    icon: ShieldCheck,
    title: "Stop vulnerabilities early",
    description: "Security checks from the first line of code to the final merge.",
    color: "from-blue-400 to-indigo-500",
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
  },
]

export function AIEraSection() {
  return (
    <section className="bg-gradient-to-b from-white to-gray-50 px-6 py-24 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Code Review for the AI Era
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Traditional reviews weren't built for AI-scale code. Sourcery is.
          </p>

          {/* Progress Dots */}
          <div className="mt-8 flex items-center justify-center gap-2">
            <div className="h-3 w-3 rounded-full bg-gray-300" />
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <div className="h-3 w-3 rounded-full bg-gray-300" />
          </div>
        </motion.div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="relative h-full overflow-hidden border-none p-8 shadow-lg transition-shadow hover:shadow-xl">
                  {/* Gradient accent */}
                  <div className={`absolute left-0 top-0 h-1 w-full bg-gradient-to-r ${feature.color}`} />

                  <div className="flex flex-col items-center text-center">
                    <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${feature.bgColor}`}>
                      <Icon className={`h-8 w-8 ${feature.iconColor}`} />
                    </div>

                    <h3 className="mb-3 text-xl font-bold text-gray-900">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
