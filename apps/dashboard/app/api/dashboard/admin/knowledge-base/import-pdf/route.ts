import { NextResponse } from "next/server"
import { createRequire } from "node:module"
import { dirname, resolve } from "node:path"
import { pathToFileURL } from "node:url"

import { requireBackendAuth } from "@/lib/backend-admin"

export const runtime = "nodejs"
const nodeRequire = createRequire(import.meta.url)

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

type PdfParseCtor = {
  new (options: { data: Uint8Array | Buffer }): {
    getText: () => Promise<{ text?: string }>
    destroy: () => Promise<void>
  }
  setWorker: (workerSrc?: string) => string
}

type BackendErrorPayload = {
  error?: unknown
  detail?: unknown
  message?: unknown
}

type BackendIngestResponse = BackendErrorPayload & {
  doc_id?: string
  title?: string
  chunks?: number
  source_type?: string
}

let pdfWorkerConfigured = false

function extractErrorText(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = value.trim()
    return normalized.length > 0 ? normalized : null
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = extractErrorText(item)
      if (candidate) {
        return candidate
      }
    }
    return null
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    return (
      extractErrorText(record.error) ??
      extractErrorText(record.detail) ??
      extractErrorText(record.message) ??
      null
    )
  }
  return null
}

function errorMessage(error: unknown, fallback: string): string {
  return extractErrorText(error) ?? fallback
}

async function parseBackendError(response: Response): Promise<string> {
  const rawBody = await response.text()
  if (!rawBody) {
    return "KB ingestion failed."
  }
  try {
    const parsed = JSON.parse(rawBody) as BackendErrorPayload
    return extractErrorText(parsed.error) ?? extractErrorText(parsed.detail) ?? extractErrorText(parsed.message) ?? rawBody
  } catch {
    return rawBody
  }
}

async function extractPdfText(file: File): Promise<string> {
  // Force Node/CJS loading path to avoid Next ESM bundling issues with pdfjs-dist.
  const { PDFParse } = nodeRequire("pdf-parse") as { PDFParse: PdfParseCtor }
  if (!pdfWorkerConfigured) {
    const cjsEntry = nodeRequire.resolve("pdf-parse")
    const workerPath = resolve(dirname(cjsEntry), "..", "web", "pdf.worker.mjs")
    PDFParse.setWorker(pathToFileURL(workerPath).href)
    pdfWorkerConfigured = true
  }
  const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) })
  try {
    const result = await parser.getText()
    return (result.text || "").trim()
  } finally {
    await parser.destroy()
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await requireBackendAuth()
    if (!authContext.ok) {
      return authContext.response
    }

    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json({ error: "Invalid multipart payload" }, { status: 400 })
    }

    const repoId = String(formData.get("repoId") ?? "").trim()
    const pathOrUrl = String(formData.get("pathOrUrl") ?? "").trim()
    const notes = String(formData.get("notes") ?? "").trim()
    const files = formData
      .getAll("files")
      .filter((item): item is File => item instanceof File)

    if (!repoId) {
      return NextResponse.json({ error: "repoId is required" }, { status: 400 })
    }
    if (files.length === 0) {
      return NextResponse.json({ error: "At least one PDF file is required" }, { status: 400 })
    }

    const importedItems: Array<{ docId: string; title: string; chunks: number }> = []

    for (const file of files) {
      const normalizedName = file.name.trim()
      if (!normalizedName.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json({ error: `Unsupported file type for '${normalizedName}'. PDF only.` }, { status: 400 })
      }

      let extractedText = ""
      try {
        extractedText = await extractPdfText(file)
      } catch (error) {
        console.error("PDF import parsing failed", { fileName: normalizedName, error })
        return NextResponse.json(
          { error: `PDF parsing failed for '${normalizedName}': ${errorMessage(error, "Unknown parser error")}` },
          { status: 400 },
        )
      }
      if (!extractedText) {
        return NextResponse.json({ error: `No readable text extracted from '${normalizedName}'.` }, { status: 400 })
      }

      const ingestPayload = {
        repo_id: repoId,
        title: normalizedName,
        source_type: "pdf",
        path_or_url: pathOrUrl || normalizedName,
        content: notes ? `${notes}\n\n${extractedText}` : extractedText,
        tags: ["pdf", "dashboard_upload"],
        doc_version: 1,
      }

      let backendResponse: Response
      try {
        backendResponse = await fetch(`${BACKEND_API_BASE_URL}/v1/kb/ingest`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authContext.token}`,
            "X-User-Id": authContext.userId,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(ingestPayload),
          cache: "no-store",
        })
      } catch (error) {
        console.error("PDF import backend request failed", { repoId, fileName: normalizedName, error })
        return NextResponse.json(
          { error: `KB backend request failed: ${errorMessage(error, "Backend unavailable")}` },
          { status: 502 },
        )
      }

      if (!backendResponse.ok) {
        return NextResponse.json({ error: await parseBackendError(backendResponse) }, { status: backendResponse.status })
      }

      const payload = (await backendResponse.json()) as BackendIngestResponse
      importedItems.push({
        docId: String(payload.doc_id ?? ""),
        title: String(payload.title ?? normalizedName),
        chunks: Number(payload.chunks ?? 0) || 0,
      })
    }

    return NextResponse.json(
      {
        repoId,
        importedCount: importedItems.length,
        items: importedItems,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Unhandled PDF import route failure", error)
    return NextResponse.json(
      { error: `Unhandled PDF import error: ${errorMessage(error, "Unknown server error")}` },
      { status: 500 },
    )
  }
}
