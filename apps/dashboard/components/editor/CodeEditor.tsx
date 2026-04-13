"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
import {
  Save,
  GitBranch,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Undo2,
  X,
} from "lucide-react"
import { extractApiErrorMessage } from "@/lib/display"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin mr-2" />
      Loading editor...
    </div>
  ),
})

// ── Types ────────────────────────────────────────────────────────────────────

interface CodeEditorProps {
  owner: string
  repo: string
  branch: string
  filePath: string | null
  onSaved?: () => void
  saveTrigger?: number
  onBranchResolved?: (branch: string) => void
}

type EditorStatus = "idle" | "loading" | "saving" | "saved" | "error" | "conflict"

// ── Language detection ───────────────────────────────────────────────────────

function detectLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? ""
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    rb: "ruby",
    php: "php",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    r: "r",
    sql: "sql",
    html: "html",
    css: "css",
    scss: "scss",
    less: "less",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    md: "markdown",
    mdx: "markdown",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    dockerfile: "dockerfile",
    toml: "ini",
    ini: "ini",
    cfg: "ini",
    env: "plaintext",
    txt: "plaintext",
    gitignore: "plaintext",
    lock: "plaintext",
  }
  return langMap[ext] ?? "plaintext"
}

function getFileName(path: string): string {
  const parts = path.split("/")
  return parts[parts.length - 1] || path
}

function statusChip(status: EditorStatus): {
  label: string
  color: string
  border: string
  background: string
} {
  if (status === "loading" || status === "saving") {
    return {
      label: status === "loading" ? "Loading" : "Committing",
      color: "#9bb1d8",
      border: "rgba(143,177,255,0.35)",
      background: "rgba(143,177,255,0.1)",
    }
  }
  if (status === "saved") {
    return {
      label: "Saved",
      color: "#8ce6ad",
      border: "rgba(76,175,80,0.4)",
      background: "rgba(76,175,80,0.12)",
    }
  }
  if (status === "conflict") {
    return {
      label: "Conflict",
      color: "#ffb4b0",
      border: "rgba(255,95,87,0.45)",
      background: "rgba(255,95,87,0.12)",
    }
  }
  return {
    label: "Error",
    color: "#ffb4b0",
    border: "rgba(255,95,87,0.45)",
    background: "rgba(255,95,87,0.12)",
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function CodeEditor({
  owner,
  repo,
  branch,
  filePath,
  onSaved,
  saveTrigger,
  onBranchResolved,
}: CodeEditorProps) {
  const [content, setContent] = useState("")
  const [originalContent, setOriginalContent] = useState("")
  const [status, setStatus] = useState<EditorStatus>("idle")
  const [statusMessage, setStatusMessage] = useState("")
  const [isDirty, setIsDirty] = useState(false)
  const [commitMessage, setCommitMessage] = useState("")
  const [effectiveBranch, setEffectiveBranch] = useState(branch)
  const editorRef = useRef<unknown>(null)
  const lastExternalSaveTrigger = useRef<number | undefined>(saveTrigger)

  useEffect(() => {
    setEffectiveBranch(branch)
  }, [branch])

  const ghPost = useCallback(
    async (action: string, payload: Record<string, unknown>) => {
      const response = await fetch("/api/dashboard/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      })
      const data = await response.json().catch(() => ({}))
      return { response, data }
    },
    [],
  )

  // Load file content when filePath changes
  useEffect(() => {
    if (!filePath || !owner || !repo) {
      setContent("")
      setOriginalContent("")
      setIsDirty(false)
      setStatus("idle")
      return
    }

    let cancelled = false
    setStatus("loading")
    setStatusMessage("Loading file...")

    const tryLoadFromBranch = async (candidateBranch: string) => {
      const { response, data } = await ghPost("get_file", {
        owner,
        repo,
        path: filePath,
        ref: candidateBranch,
      })
      return { response, data, branch: candidateBranch }
    }

    const load = async () => {
      try {
        const firstTry = await tryLoadFromBranch(branch)

        let successfulLoad = firstTry
        if (!firstTry.response.ok && firstTry.response.status === 404) {
          const listBranches = await ghPost("list_branches", { owner, repo })
          if (!listBranches.response.ok) {
            throw new Error(
              extractApiErrorMessage(listBranches.data, "Failed to resolve repository branches"),
            )
          }

          const branchNames = Array.isArray(listBranches.data?.result)
            ? listBranches.data.result
                .map((item: unknown) =>
                  typeof (item as { name?: unknown })?.name === "string"
                    ? (item as { name: string }).name.trim()
                    : "",
                )
                .filter((name: string) => name.length > 0)
            : []

          const fallbackCandidates = Array.from(
            new Set([
              ...branchNames,
              "main",
              "master",
            ]),
          ).filter((candidate) => candidate !== branch)

          let loadedFromFallback = false
          for (const candidate of fallbackCandidates) {
            const tryCandidate = await tryLoadFromBranch(candidate)
            if (tryCandidate.response.ok) {
              successfulLoad = tryCandidate
              loadedFromFallback = true
              break
            }
          }

          if (!loadedFromFallback && !successfulLoad.response.ok) {
            throw new Error(extractApiErrorMessage(firstTry.data, "Failed to load file"))
          }
        } else if (!firstTry.response.ok) {
          throw new Error(extractApiErrorMessage(firstTry.data, "Failed to load file"))
        }

        if (cancelled) return

        const fileContent =
          typeof successfulLoad.data?.content === "string"
            ? successfulLoad.data.content
            : ""
        setContent(fileContent)
        setOriginalContent(fileContent)
        setIsDirty(false)
        setStatus("idle")
        setStatusMessage("")
        setCommitMessage("")

        setEffectiveBranch(successfulLoad.branch)
        if (successfulLoad.branch !== branch) {
          onBranchResolved?.(successfulLoad.branch)
        }
      } catch (err) {
        if (cancelled) return
        setStatus("error")
        setStatusMessage(
          err instanceof Error ? err.message : "Failed to load file",
        )
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [filePath, owner, repo, branch, ghPost, onBranchResolved])

  // Track changes
  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      const newContent = value ?? ""
      setContent(newContent)
      setIsDirty(newContent !== originalContent)
    },
    [originalContent],
  )

  // Save file (commit to GitHub)
  const handleSave = useCallback(async () => {
    if (!filePath || !isDirty) return

    setStatus("saving")
    setStatusMessage("Committing to GitHub...")

    try {
      const res = await fetch("/api/dashboard/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "commit_file",
          payload: {
            owner,
            repo,
            path: filePath,
            content,
            branch: effectiveBranch,
            message:
              commitMessage.trim() ||
              `Update ${filePath.split("/").pop()} via AI Code Review Platform`,
          },
        }),
      })

      const data = await res.json()

      if (res.status === 409) {
        setStatus("conflict")
        setStatusMessage(
          "Merge conflict detected. The file was modified on GitHub. Please refresh and merge your changes.",
        )
        return
      }

      if (!res.ok) throw new Error(extractApiErrorMessage(data, "Failed to save"))

      setOriginalContent(content)
      setIsDirty(false)
      setStatus("saved")
      setStatusMessage("Committed successfully!")
      setCommitMessage("")
      onSaved?.()

      window.setTimeout(() => {
        setStatus((current) => (current === "saved" ? "idle" : current))
      }, 3000)
    } catch (err) {
      setStatus("error")
      setStatusMessage(
        err instanceof Error ? err.message : "Failed to save file",
      )
    }
  }, [filePath, isDirty, content, owner, repo, effectiveBranch, commitMessage, onSaved])

  const handleEditorBeforeMount = useCallback((monaco: unknown) => {
    const instance = monaco as {
      editor: {
        defineTheme: (
          themeName: string,
          themeData: {
            base: string
            inherit: boolean
            colors: Record<string, string>
            rules: Array<{ token: string; foreground?: string; fontStyle?: string }>
          },
        ) => void
      }
    }

    instance.editor.defineTheme("ai-carbon-dark", {
      base: "vs-dark",
      inherit: true,
      colors: {
        "editor.background": "#101113",
        "editor.foreground": "#d7dce5",
        "editorLineNumber.foreground": "#515763",
        "editorLineNumber.activeForeground": "#8e97a8",
        "editorLineHighlightBackground": "#171a20",
        "editorCursor.foreground": "#90a8ff",
        "editor.selectionBackground": "#2d3d5980",
        "editor.inactiveSelectionBackground": "#27354d66",
        "editorWhitespace.foreground": "#2a2f38",
        "editorIndentGuide.background1": "#20252f",
        "editorIndentGuide.activeBackground1": "#343d4e",
        "editorGutter.addedBackground": "#2f8f4f",
        "editorGutter.deletedBackground": "#a23f3f",
        "editorGutter.modifiedBackground": "#3b6ca8",
        "editorOverviewRuler.border": "#00000000",
      },
      rules: [
        { token: "comment", foreground: "6f7787", fontStyle: "italic" },
        { token: "keyword", foreground: "ff8a65" },
        { token: "string", foreground: "9acb7f" },
        { token: "number", foreground: "d8c47a" },
        { token: "function", foreground: "8ab4ff" },
        { token: "type", foreground: "5dd0ff" },
      ],
    })
  }, [])

  // Keyboard shortcut: Ctrl+S
  const handleEditorMount = useCallback(
    (editor: unknown) => {
      editorRef.current = editor
      const monacoEditor = editor as {
        addCommand: (keyBinding: number, handler: () => void) => void
      }
      const monaco = (
        window as Window & {
          monaco?: {
            KeyMod: { CtrlCmd: number }
            KeyCode: { KeyS: number }
          }
        }
      ).monaco
      if (monaco) {
        monacoEditor.addCommand(
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
          () => handleSave(),
        )
      }
    },
    [handleSave],
  )

  // Allow parent components to trigger a real GitHub commit.
  useEffect(() => {
    if (saveTrigger === undefined) return
    if (saveTrigger === lastExternalSaveTrigger.current) return
    lastExternalSaveTrigger.current = saveTrigger
    void handleSave()
  }, [saveTrigger, handleSave])

  // Revert changes
  const handleRevert = useCallback(() => {
    setContent(originalContent)
    setIsDirty(false)
    setStatus("idle")
    setStatusMessage("")
  }, [originalContent])

  if (!filePath) {
    return (
      <div
        className="flex h-full items-center justify-center rounded-md border"
        style={{ borderColor: "#232832", background: "#0f1012", color: "#7f8ca3" }}
      >
        <div className="text-center">
          <p className="text-lg font-medium">No file selected</p>
          <p className="text-sm mt-1">
            Select a file from the explorer to start editing
          </p>
        </div>
      </div>
    )
  }

  const language = detectLanguage(filePath)
  const fileName = getFileName(filePath)
  const statusInfo =
    status === "error" || status === "conflict" || status === "loading" || status === "saving" || status === "saved"
      ? statusChip(status)
      : null

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-md border"
      style={{ borderColor: "#232832", background: "#0f1012", color: "#d7dce5" }}
    >
      <div
        className="flex h-7 items-center border-b px-3"
        style={{ borderColor: "#232832", background: "#15171a" }}
      >
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ff5f57" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#febc2e" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#28c840" }} />
        </div>
        <span className="ml-auto text-[10px]" style={{ color: "#606878" }}>
          {owner}/{repo}
        </span>
      </div>

      <div
        className="flex h-9 items-end border-b px-2"
        style={{ borderColor: "#232832", background: "#101214" }}
      >
        <div
          className="flex h-8 items-center gap-2 rounded-t-md border border-b-0 px-3"
          style={{ borderColor: "#2b313c", background: "#121418" }}
        >
          <span className="text-[11px] font-medium" style={{ color: "#c6cedd" }}>
            {fileName}
          </span>
          <X className="h-3.5 w-3.5" style={{ color: "#555d6a" }} />
        </div>
        <div className="ml-auto flex items-center gap-1 pb-1">
          <span
            className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px]"
            style={{ borderColor: "#2f3643", background: "#171b22", color: "#8fa2c8" }}
          >
            <GitBranch className="h-3 w-3" />
            {effectiveBranch}
          </span>
          <span
            className="rounded border px-2 py-0.5 text-[10px]"
            style={{ borderColor: "#2f3643", background: "#171b22", color: "#95a4c6" }}
          >
            {language}
          </span>
          {isDirty && status !== "saving" && (
            <span
              className="rounded border px-2 py-0.5 text-[10px]"
              style={{ borderColor: "rgba(255,188,46,0.45)", background: "rgba(255,188,46,0.12)", color: "#ffd27b" }}
            >
              Modified
            </span>
          )}
          {statusInfo && (
            <span
              className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px]"
              style={{
                borderColor: statusInfo.border,
                background: statusInfo.background,
                color: statusInfo.color,
              }}
            >
              {(status === "loading" || status === "saving") && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              {status === "saved" && <CheckCircle2 className="h-3 w-3" />}
              {(status === "error" || status === "conflict") && (
                <AlertCircle className="h-3 w-3" />
              )}
              {statusInfo.label}
            </span>
          )}
        </div>
      </div>

      {/* Error / conflict message */}
      {(status === "error" || status === "conflict") && statusMessage && (
        <div
          className="border-b px-3 py-2 text-xs"
          style={{
            borderColor:
              status === "conflict"
                ? "rgba(255,188,46,0.35)"
                : "rgba(255,95,87,0.35)",
            background:
              status === "conflict"
                ? "rgba(255,188,46,0.1)"
                : "rgba(255,95,87,0.1)",
            color: status === "conflict" ? "#ffd27b" : "#ffb4b0",
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0 border-b" style={{ borderColor: "#232832" }}>
        <MonacoEditor
          height="100%"
          beforeMount={handleEditorBeforeMount}
          language={language}
          value={content}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          theme="ai-carbon-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            fontLigatures: true,
            lineNumbers: "on",
            lineNumbersMinChars: 4,
            wordWrap: "off",
            tabSize: 2,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            renderWhitespace: "selection",
            renderLineHighlight: "line",
            cursorStyle: "line-thin",
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: true,
            guides: { indentation: true, bracketPairs: true },
            padding: { top: 10, bottom: 10 },
          }}
        />
      </div>

      {/* Commit bar */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ background: "#14171c" }}
      >
        <GitBranch className="h-3.5 w-3.5 shrink-0" style={{ color: "#7f8ca3" }} />
        <span className="text-xs shrink-0" style={{ color: "#7f8ca3" }}>{effectiveBranch}</span>

        <input
          placeholder="Commit message (optional)"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          className="h-8 flex-1 rounded border px-2 text-xs outline-none"
          style={{
            borderColor: "#2e3440",
            background: "#101317",
            color: "#d7dce5",
          }}
          disabled={!isDirty || status === "saving"}
        />

        {isDirty && (
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded border px-2 text-xs"
            style={{
              borderColor: "#364052",
              background: "#171d27",
              color: "#9eb0d3",
            }}
            onClick={handleRevert}
            title="Revert changes"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Revert
          </button>
        )}

        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded border px-3 text-xs font-medium disabled:opacity-50"
          style={{
            borderColor: "#1e5e35",
            background: "#1e7a43",
            color: "#e7fff0",
          }}
          onClick={handleSave}
          disabled={!isDirty || status === "saving" || status === "loading"}
        >
          {status === "saving" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Commit
        </button>
      </div>
    </div>
  )
}
