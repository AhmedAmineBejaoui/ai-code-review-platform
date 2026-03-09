export type DashboardRole = "admin" | "reviewer" | "developer"

export interface DashboardPrSummary {
  analysisId: string
  repo: string
  prNumber: number | null
  commitSha: string | null
  status: string
  summary: string
  createdAt: string
  authorLabel: string | null
}

export interface DashboardRepoOverview {
  repoId: string
  summary: string
  highlights: string[]
  indexedCommit?: string | null
  updatedAt?: string | null
  source: string
  fallbackUsed: boolean
}

export interface DashboardInsightsResponse {
  role: DashboardRole
  prSummaries: DashboardPrSummary[]
  repoOverviews: DashboardRepoOverview[]
  warnings: string[]
  generatedAt: string
}

export function emptyDashboardInsights(role: DashboardRole = "developer"): DashboardInsightsResponse {
  return {
    role,
    prSummaries: [],
    repoOverviews: [],
    warnings: [],
    generatedAt: new Date(0).toISOString(),
  }
}

export async function fetchDashboardInsights(): Promise<DashboardInsightsResponse> {
  try {
    const response = await fetch("/api/dashboard/insights", {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
    if (!response.ok) {
      return emptyDashboardInsights()
    }
    const payload = (await response.json()) as Partial<DashboardInsightsResponse>
    if (!payload || typeof payload !== "object") {
      return emptyDashboardInsights()
    }
    return {
      role:
        payload.role === "admin" || payload.role === "reviewer" || payload.role === "developer"
          ? payload.role
          : "developer",
      prSummaries: Array.isArray(payload.prSummaries) ? payload.prSummaries : [],
      repoOverviews: Array.isArray(payload.repoOverviews) ? payload.repoOverviews : [],
      warnings: Array.isArray(payload.warnings) ? payload.warnings.filter((item): item is string => typeof item === "string") : [],
      generatedAt: typeof payload.generatedAt === "string" ? payload.generatedAt : new Date().toISOString(),
    }
  } catch {
    return emptyDashboardInsights()
  }
}
