"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  Database,
  TrendingUp,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface RagImpactData {
  total_analyses: number
  analyses_with_rag: number
  analyses_without_rag: number
  with_rag: {
    avg_findings: number
    avg_blocker: number
    avg_warn: number
    avg_llm_findings: number
    avg_kb_chunks: number
  }
  without_rag: {
    avg_findings: number
    avg_blocker: number
    avg_warn: number
    avg_llm_findings: number
    avg_kb_chunks: number
  }
  impact: {
    findings_delta: number
    llm_findings_delta: number
  }
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  color,
  delay,
}: {
  title: string
  value: string | number
  sub?: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  delay?: number
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay ?? 0 }}>
      <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${color}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
              {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function EvaluationPage() {
  const [data, setData] = useState<RagImpactData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/dashboard/rag/impact?limit=200", { cache: "no-store" })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const payload = await res.json() as RagImpactData
      setData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  }

  const barData = data
    ? [
        {
          name: "Findings totaux",
          "Avec RAG": data.with_rag.avg_findings,
          "Sans RAG": data.without_rag.avg_findings,
        },
        {
          name: "BLOCKER",
          "Avec RAG": data.with_rag.avg_blocker,
          "Sans RAG": data.without_rag.avg_blocker,
        },
        {
          name: "WARNING",
          "Avec RAG": data.with_rag.avg_warn,
          "Sans RAG": data.without_rag.avg_warn,
        },
        {
          name: "Findings LLM",
          "Avec RAG": data.with_rag.avg_llm_findings,
          "Sans RAG": data.without_rag.avg_llm_findings,
        },
      ]
    : []

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent mb-1">
          Évaluation RAG
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Comparaison de la qualité des reviews avec et sans le système RAG (Retrieval-Augmented Generation).
        </p>
      </motion.div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
        >
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <div>
            <p className="font-medium text-red-900 dark:text-red-100">Impossible de charger les métriques</p>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </motion.div>
      )}

      {data && (
        <>
          {/* Stats overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              title="Analyses totales"
              value={data.total_analyses}
              icon={Database}
              color="bg-gradient-to-br from-blue-500 to-blue-600"
              delay={0.05}
            />
            <StatCard
              title="Avec RAG"
              value={data.analyses_with_rag}
              sub={`${data.total_analyses > 0 ? Math.round((data.analyses_with_rag / data.total_analyses) * 100) : 0}% du total`}
              icon={CheckCircle2}
              color="bg-gradient-to-br from-green-500 to-emerald-600"
              delay={0.1}
            />
            <StatCard
              title="Sans RAG"
              value={data.analyses_without_rag}
              icon={Database}
              color="bg-gradient-to-br from-gray-400 to-gray-500"
              delay={0.15}
            />
            <StatCard
              title="Delta Findings LLM"
              value={data.impact.llm_findings_delta >= 0 ? `+${data.impact.llm_findings_delta}` : data.impact.llm_findings_delta}
              sub="Avec RAG vs Sans RAG"
              icon={Sparkles}
              color={
                data.impact.llm_findings_delta > 0
                  ? "bg-gradient-to-br from-purple-500 to-violet-600"
                  : "bg-gradient-to-br from-orange-400 to-red-500"
              }
              delay={0.2}
            />
          </div>

          {/* Bar chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Moyennes comparatives : Avec RAG vs Sans RAG
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.2)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(17,24,39,0.9)",
                        border: "1px solid rgba(75,85,99,0.5)",
                        borderRadius: "8px",
                        color: "white",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Avec RAG" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Sans RAG" fill="#9ca3af" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Detail table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
              <CardHeader>
                <CardTitle className="text-base">Tableau récapitulatif</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Métrique</th>
                        <th className="text-right py-2 px-4 font-medium text-blue-600 dark:text-blue-400">Avec RAG</th>
                        <th className="text-right py-2 px-4 font-medium text-gray-500 dark:text-gray-400">Sans RAG</th>
                        <th className="text-right py-2 pl-4 font-medium text-gray-700 dark:text-gray-300">Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {[
                        { label: "Findings moyens / analyse", with: data.with_rag.avg_findings, without: data.without_rag.avg_findings },
                        { label: "BLOCKER moyen / analyse", with: data.with_rag.avg_blocker, without: data.without_rag.avg_blocker },
                        { label: "WARNING moyen / analyse", with: data.with_rag.avg_warn, without: data.without_rag.avg_warn },
                        { label: "Findings LLM moyen / analyse", with: data.with_rag.avg_llm_findings, without: data.without_rag.avg_llm_findings },
                        { label: "Chunks KB utilisés en moyenne", with: data.with_rag.avg_kb_chunks, without: 0 },
                      ].map((row) => {
                        const delta = round2(row.with - row.without)
                        return (
                          <tr key={row.label}>
                            <td className="py-2.5 pr-4 text-gray-700 dark:text-gray-300">{row.label}</td>
                            <td className="py-2.5 px-4 text-right font-mono text-blue-700 dark:text-blue-300">{row.with}</td>
                            <td className="py-2.5 px-4 text-right font-mono text-gray-500 dark:text-gray-400">{row.without}</td>
                            <td className="py-2.5 pl-4 text-right">
                              <Badge
                                variant="outline"
                                className={`font-mono text-xs ${
                                  delta > 0
                                    ? "border-green-300 text-green-700 dark:border-green-700 dark:text-green-300"
                                    : delta < 0
                                    ? "border-red-300 text-red-700 dark:border-red-700 dark:text-red-300"
                                    : ""
                                }`}
                              >
                                {delta > 0 ? "+" : ""}{delta}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                  Basé sur les {data.total_analyses} dernières analyses complétées.
                  Un delta positif indique que le RAG génère plus de findings contextualisés.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  )
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
