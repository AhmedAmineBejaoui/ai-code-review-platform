export interface DashboardAnalysisItem {
  id: string
  repo: string
  prLabel: string
  commitSha: string | null
  author: string
  status: string
  createdAt: string
  updatedAt: string
  durationLabel: string
  blockerCount: number
  warnCount: number
  infoCount: number
}

type DashboardAnalysesResponse = {
  items?: DashboardAnalysisItem[]
}

export async function fetchDashboardAnalyses(): Promise<DashboardAnalysisItem[]> {
  try {
    const response = await fetch("/api/dashboard/analyses", {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
    if (!response.ok) {
      return []
    }
    const payload = (await response.json()) as DashboardAnalysesResponse
    if (!payload || !Array.isArray(payload.items)) {
      return []
    }
    return payload.items
      .filter((item) => item && typeof item.id === "string" && typeof item.repo === "string")
      .map((item) => ({
        id: item.id,
        repo: item.repo,
        prLabel: typeof item.prLabel === "string" ? item.prLabel : "Commit",
        commitSha: typeof item.commitSha === "string" ? item.commitSha : null,
        author: typeof item.author === "string" ? item.author : "Unknown",
        status: typeof item.status === "string" ? item.status : "QUEUED",
        createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
        updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : "",
        durationLabel: typeof item.durationLabel === "string" ? item.durationLabel : "-",
        blockerCount: typeof item.blockerCount === "number" ? item.blockerCount : 0,
        warnCount: typeof item.warnCount === "number" ? item.warnCount : 0,
        infoCount: typeof item.infoCount === "number" ? item.infoCount : 0,
      }))
  } catch {
    return []
  }
}

