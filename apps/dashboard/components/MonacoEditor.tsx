"use client"

import React, { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"

// Dynamic import to avoid SSR issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false }) as any

// Note: this component expects the following npm deps to be installed in apps/dashboard:
// @monaco-editor/react, monaco-editor, yjs, y-websocket, y-monaco

export default function MonacoYEditor({ room = "default-room", initial = "" }: { room?: string; initial?: string }) {
  const editorRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    let ydoc: any = null
    let provider: any = null
    let monacoBinding: any = null

    async function init() {
      try {
        setStatus("loading")
        const Y = (await import("yjs")).default || (await import("yjs"))
        const { WebsocketProvider } = await import("y-websocket")
        const { MonacoBinding } = await import("y-monaco")

        ydoc = new Y.Doc()
        provider = new WebsocketProvider((process.env.NEXT_PUBLIC_Y_WEBSOCKET_URL as string) || "wss://demos.yjs.dev", room, ydoc)
        const ytext = ydoc.getText("monaco")

        // Wait for editor to be ready
        const editor = editorRef.current?.editor || null
        if (!editor) {
          setStatus("editor-unavailable")
          return
        }

        // Apply initial content if empty
        if (ytext.length === 0 && initial) {
          ytext.insert(0, initial)
        }

        monacoBinding = new MonacoBinding(ytext, editor.getModel(), new Set([editor]), provider.awareness)
        setStatus("connected")
        setReady(true)
      } catch (err: any) {
        console.error("MonacoYEditor init error", err)
        setStatus(`error: ${err?.message ?? String(err)}`)
      }
    }

    init()

    return () => {
      mounted = false
      try {
        if (provider) provider.disconnect()
        if (ydoc) ydoc.destroy()
      } catch (_e) {
        // ignore
      }
    }
  }, [room])

  return (
    <div>
      <div style={{ height: 420, border: "1px solid #e5e7eb" }}>
        <MonacoEditor
          height="420"
          defaultLanguage="typescript"
          defaultValue={initial}
          onMount={(editor: any) => {
            editorRef.current = { editor }
          }}
        />
      </div>
      <div style={{ marginTop: 8 }}>
        <strong>Real-time status:</strong> {status}
      </div>
    </div>
  )
}
