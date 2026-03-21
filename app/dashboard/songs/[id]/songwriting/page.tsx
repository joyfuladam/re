"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LyricsChordEditor, type LyricLine } from "@/components/songwriting/LyricsChordEditor"
import { SongwritingChatPanel } from "@/components/songwriting/SongwritingChatPanel"

function parseLines(raw: unknown): LyricLine[] {
  if (!Array.isArray(raw)) return [{ chords: "", text: "" }]
  return raw.map((row) => {
    if (row && typeof row === "object" && "text" in row) {
      const o = row as { chords?: unknown; text?: unknown }
      return {
        chords: typeof o.chords === "string" ? o.chords : "",
        text: typeof o.text === "string" ? o.text : "",
      }
    }
    return { chords: "", text: "" }
  })
}

export default function SongwritingWorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const songId = typeof params?.id === "string" ? params.id : params?.id?.[0]

  const [title, setTitle] = useState("")
  const [lines, setLines] = useState<LyricLine[]>([{ chords: "", text: "" }])
  const [saving, setSaving] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [demos, setDemos] = useState<
    Array<{ id: string; filename: string; label: string | null; mimeType: string; category: string; createdAt: string }>
  >([])
  const [uploading, setUploading] = useState(false)
  const [demoLabel, setDemoLabel] = useState("Rough demo")

  const loadSong = useCallback(async () => {
    if (!songId) return
    const res = await fetch(`/api/songs/${songId}`, { cache: "no-store" })
    if (!res.ok) {
      setLoading(false)
      return
    }
    const song = await res.json()
    setTitle(song.title ?? "")
    setLines(parseLines(song.songwritingLyricsJson))
    setLoading(false)
  }, [songId])

  const loadDemos = useCallback(async () => {
    if (!songId) return
    const res = await fetch(`/api/songs/${songId}/media?context=songwriting`, { cache: "no-store" })
    if (!res.ok) return
    const all = await res.json()
    const audio = Array.isArray(all) ? all.filter((m: { category: string }) => m.category === "audio") : []
    setDemos(audio)
  }, [songId])

  const ensureThread = useCallback(async () => {
    if (!songId) return
    const res = await fetch(`/api/songs/${songId}/songwriting-thread`, { method: "POST", cache: "no-store" })
    if (res.ok) {
      const data = await res.json()
      if (typeof data.threadId === "string") setThreadId(data.threadId)
    }
  }, [songId])

  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/login")
      return
    }
    if (!songId) return
    void loadSong()
    void loadDemos()
    void ensureThread()
  }, [session, status, router, songId, loadSong, loadDemos, ensureThread])

  const saveLyrics = async () => {
    if (!songId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/songs/${songId}/songwriting`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert((err as { error?: string }).error || "Save failed")
      }
    } finally {
      setSaving(false)
    }
  }

  const uploadDemo = async (file: File | null) => {
    if (!file || !songId) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("category", "audio")
      fd.append("label", demoLabel.trim() || "Rough demo (songwriting)")
      fd.append("file", file)
      const res = await fetch(`/api/songs/${songId}/media`, {
        method: "POST",
        headers: { "x-songwriting-demo": "1" },
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert((err as { error?: string }).error || "Upload failed")
        return
      }
      await loadDemos()
    } finally {
      setUploading(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">Loading…</div>
    )
  }

  if (!songId) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Songwriting</h1>
          <p className="text-muted-foreground">{title || "Recording"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/dashboard/songs/${songId}`}>
            <Button variant="outline" size="sm">
              Back to recording
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lyrics & chords</CardTitle>
              <CardDescription>Collaborative chord chart — saved to this recording.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <LyricsChordEditor lines={lines} onChange={setLines} disabled={saving} />
              <Button type="button" onClick={() => void saveLyrics()} disabled={saving}>
                {saving ? "Saving…" : "Save lyrics"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rough demos</CardTitle>
              <CardDescription>Audio sketches for this song. Visible on this recording&apos;s media library too.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="demo-label">Label</Label>
                <Input
                  id="demo-label"
                  value={demoLabel}
                  onChange={(e) => setDemoLabel(e.target.value)}
                  placeholder="Rough demo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo-file">Upload audio</Label>
                <Input
                  id="demo-file"
                  type="file"
                  accept="audio/*"
                  disabled={uploading}
                  onChange={(e) => void uploadDemo(e.target.files?.[0] ?? null)}
                />
                {uploading && <p className="text-sm text-muted-foreground">Uploading…</p>}
              </div>
              {demos.length > 0 && (
                <ul className="space-y-2 text-sm">
                  {demos.map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
                      <span className="font-medium">{d.label || d.filename}</span>
                      <audio controls className="h-8 max-w-full" src={`/api/media/${d.id}/file`}>
                        <track kind="captions" />
                      </audio>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          {threadId ? (
            <SongwritingChatPanel threadId={threadId} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Preparing chat…
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
