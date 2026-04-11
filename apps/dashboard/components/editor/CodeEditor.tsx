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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

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

// ── Component ────────────────────────────────────────────────────────────────

export function CodeEditor({
  owner,
  repo,
  branch,
  filePath,
  onSaved,
  saveTrigger,
}: CodeEditorProps) {
  const [content, setContent] = useState("")
  const [originalContent, setOriginalContent] = useState("")
  const [status, setStatus] = useState<EditorStatus>("idle")
  const [statusMessage, setStatusMessage] = useState("")
  const [isDirty, setIsDirty] = useState(false)
  const [commitMessage, setCommitMessage] = useState("")
  const editorRef = useRef<unknown>(null)
  const lastExternalSaveTrigger = useRef<number | undefined>(saveTrigger)

  // Load file content when filePath changes
  useEffect(() => {
    if (!filePath || !owner || !repo) {
      setContent("")
      setOriginalContent("")
      setIsDirty(false)
      setStatus("idle")
      return
    }

    setStatus("loading")
    setStatusMessage("Loading file...")

    fetch("/api/dashboard/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "get_file",
        payload: { owner, repo, path: filePath, ref: branch },
      }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to load file")
        const fileContent = data.content ?? ""
        setContent(fileContent)
        setOriginalContent(fileContent)
        setIsDirty(false)
        setStatus("idle")
        setStatusMessage("")
        setCommitMessage("")
      })
      .catch((err) => {
        setStatus("error")
        setStatusMessage(err.message)
      })
  }, [filePath, owner, repo, branch])

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
            branch,
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

      if (!res.ok) throw new Error(data.error || "Failed to save")

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
  }, [filePath, isDirty, content, owner, repo, branch, commitMessage, onSaved])

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
      <div className="flex items-center justify-center h-full text-muted-foreground">
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

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-muted/30 min-h-[40px]">
        {/* File path */}
        <span className="text-xs text-muted-foreground truncate mr-auto">
          {filePath}
        </span>

        {/* Status indicator */}
        {status === "loading" && (
          <Badge variant="outline" className="text-xs gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading
          </Badge>
        )}
        {status === "saving" && (
          <Badge variant="outline" className="text-xs gap-1 text-blue-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving
          </Badge>
        )}
        {status === "saved" && (
          <Badge variant="outline" className="text-xs gap-1 text-green-500">
            <CheckCircle2 className="h-3 w-3" /> Saved
          </Badge>
        )}
        {status === "error" && (
          <Badge variant="destructive" className="text-xs gap-1">
            <AlertCircle className="h-3 w-3" /> Error
          </Badge>
        )}
        {status === "conflict" && (
          <Badge variant="destructive" className="text-xs gap-1">
            <AlertCircle className="h-3 w-3" /> Conflict
          </Badge>
        )}
        {isDirty && status !== "saving" && (
          <Badge variant="secondary" className="text-xs">
            Modified
          </Badge>
        )}

        {/* Language badge */}
        <Badge variant="outline" className="text-xs">
          {language}
        </Badge>
      </div>

      {/* Error / conflict message */}
      {(status === "error" || status === "conflict") && statusMessage && (
        <div
          className={`px-3 py-2 text-xs ${
            status === "conflict"
              ? "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
              : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          {statusMessage}
        </div>
      )}

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language={language}
          value={content}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: true },
            fontSize: 13,
            lineNumbers: "on",
            wordWrap: "on",
            tabSize: 2,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            bracketPairColorization: { enabled: true },
            renderWhitespace: "selection",
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            padding: { top: 8, bottom: 8 },
          }}
        />
      </div>

      {/* Commit bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-t bg-muted/30">
        <GitBranch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground shrink-0">{branch}</span>

        <Input
          placeholder="Commit message (optional)"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          className="h-7 text-xs flex-1"
          disabled={!isDirty || status === "saving"}
        />

        {isDirty && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleRevert}
            title="Revert changes"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
        )}

        <Button
          variant="default"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={handleSave}
          disabled={!isDirty || status === "saving" || status === "loading"}
        >
          {status === "saving" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Commit
        </Button>
      </div>
    </div>
  )
}
