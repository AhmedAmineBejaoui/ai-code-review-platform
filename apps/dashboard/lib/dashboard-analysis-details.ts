export interface DashboardAnalysisFinding {
  id: string
  source: string
  filePath: string
  lineStart: number | null
  lineEnd: number | null
  severity: string
  category: string
  message: string
  suggestion: string | null
  ruleId: string | null
}

export interface DashboardDiffLine {
  lineType: "context" | "add" | "remove" | "header"
  content: string
  oldLineNo: number | null
  newLineNo: number | null
}

export interface DashboardAnalysisDiffFile {
  id: string
  pathOld: string | null
  pathNew: string
  changeType: "added" | "modified" | "deleted" | "renamed"
  isBinary: boolean
  additionsCount: number
  deletionsCount: number
  lines: DashboardDiffLine[]
}

export interface DashboardAnalysisDetails {
  id: string
  repo: string
  prLabel: string
  commitSha: string | null
  author: string
  status: string
  summary: string
  createdAt: string
  updatedAt: string
  findings: DashboardAnalysisFinding[]
  files: DashboardAnalysisDiffFile[]
}

export async function fetchDashboardAnalysisDetails(analysisId: string): Promise<DashboardAnalysisDetails | null> {
  try {
    const response = await fetch(`/api/dashboard/analyses/${analysisId}`, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
    if (!response.ok) {
      return null
    }
    const payload = (await response.json()) as DashboardAnalysisDetails
    if (!payload || typeof payload.id !== "string" || typeof payload.repo !== "string") {
      return null
    }
    return payload
  } catch {
    return null
  }
}

