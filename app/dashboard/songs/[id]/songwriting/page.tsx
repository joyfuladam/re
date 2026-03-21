"use client"

import { useCallback, useEffect, useDeferredValue, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChordProEditor } from "@/components/songwriting/ChordProEditor"
import { ChordChartPreview } from "@/components/songwriting/ChordChartPreview"
import { SongwritingChatPanel } from "@/components/songwriting/SongwritingChatPanel"
import { normalizeSongwritingJson } from "@/lib/songwriting/chordpro-storage"
import {
  getStoredChartMode,
  setStoredChartMode,
  type SongwritingChartMode,
} from "@/lib/songwriting/chart-mode"
import { VisualChordChartEditor } from "@/components/songwriting/VisualChordChartEditor"
import { SongwritingMicRecorder } from "@/components/songwriting/SongwritingMicRecorder"
import { AudioWaveformPreview } from "@/components/songwriting/AudioWaveformPreview"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function SongwritingWorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const songId = typeof params?.id === "string" ? params.id : params?.id?.[0]

  const [title, setTitle] = useState("")
  const [workInfo, setWorkInfo] = useState<{
    id: string
    title: string
    compositionStatus: "in_progress" | "finalized"
  } | null>(null)
  const [chordpro, setChordpro] = useState("")
  const deferredPreview = useDeferredValue(chordpro)
  const [saving, setSaving] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [demos, setDemos] = useState<
    Array<{ id: string; filename: string; label: string | null; mimeType: string; category: string; createdAt: string }>
  >([])
  const [fileUploading, setFileUploading] = useState(false)
  const [micUploading, setMicUploading] = useState(false)
  const [deletingDemoId, setDeletingDemoId] = useState<string | null>(null)
  const demoBusy = fileUploading || micUploading
  const [demoLabel, setDemoLabel] = useState("Rough demo")
  const [chartMode, setChartMode] = useState<SongwritingChartMode>("chordpro")

  useEffect(() => {
    setChartMode(getStoredChartMode())
  }, [])

  const handleChartModeChange = (value: string) => {
    const m = value === "visual" ? "visual" : "chordpro"
    setChartMode(m)
    setStoredChartMode(m)
  }

  const loadSong = useCallback(async () => {
    if (!songId) return
    const res = await fetch(`/api/songs/${songId}`, { cache: "no-store" })
    if (!res.ok) {
      setLoading(false)
      return
    }
    const song = await res.json()
    setTitle(song.title ?? "")
    if (song.work?.id && song.work?.compositionStatus) {
      setWorkInfo({
        id: song.work.id,
        title: song.work.title ?? "",
        compositionStatus: song.work.compositionStatus,
      })
    } else {
      setWorkInfo(null)
    }
    setChordpro(normalizeSongwritingJson(song.songwritingLyricsJson).chordpro)
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
        body: JSON.stringify({ chordpro }),
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
    setFileUploading(true)
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
      setFileUploading(false)
    }
  }

  const deleteDemo = async (mediaId: string) => {
    if (!songId) return
    if (!confirm("Delete this demo? This cannot be undone.")) return
    setDeletingDemoId(mediaId)
    try {
      const res = await fetch(`/api/songs/${songId}/media?mediaId=${encodeURIComponent(mediaId)}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert((err as { error?: string }).error || "Delete failed")
        return
      }
      await loadDemos()
    } finally {
      setDeletingDemoId(null)
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
          {workInfo && (
            <p className="mt-1 text-sm text-muted-foreground">
              Composition (work):{" "}
              <Link href={`/dashboard/works/${workInfo.id}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                {workInfo.title || "Untitled"}
              </Link>
              {workInfo.compositionStatus === "in_progress" ? (
                <span className="text-amber-700 dark:text-amber-400"> · in progress</span>
              ) : (
                <span> · finalized</span>
              )}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/songs/new?songwriting=1">
            <Button variant="default" size="sm">
              New songwriting project
            </Button>
          </Link>
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
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Lyrics & chords</CardTitle>
                  <CardDescription>
                    Choose how you want to work. Saved to this recording.
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-1 sm:w-[220px]">
                  <Label htmlFor="chart-mode" className="text-xs text-muted-foreground">
                    Chart view
                  </Label>
                  <Select value={chartMode} onValueChange={handleChartModeChange}>
                    <SelectTrigger id="chart-mode">
                      <SelectValue placeholder="Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chordpro">ChordPro (source)</SelectItem>
                      <SelectItem value="visual">Visual chart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {chartMode === "chordpro" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <ChordProEditor value={chordpro} onChange={setChordpro} disabled={saving} />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Preview</p>
                    <ChordChartPreview chordpro={deferredPreview} />
                  </div>
                </div>
              ) : (
                <VisualChordChartEditor
                  chordpro={chordpro}
                  onChange={setChordpro}
                  disabled={saving}
                />
              )}
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
                  disabled={demoBusy}
                  onChange={(e) => void uploadDemo(e.target.files?.[0] ?? null)}
                />
                {fileUploading && <p className="text-sm text-muted-foreground">Uploading…</p>}
              </div>
              {songId && (
                <SongwritingMicRecorder
                  songId={songId}
                  demoLabel={demoLabel}
                  onUploaded={() => void loadDemos()}
                  onUploadingChange={setMicUploading}
                  disabled={demoBusy}
                />
              )}
              {demos.length > 0 && (
                <ul className="space-y-3 text-sm">
                  {demos.map((d) => (
                    <li key={d.id} className="space-y-2 rounded-md border px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{d.label || d.filename}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={demoBusy || deletingDemoId === d.id}
                          onClick={() => void deleteDemo(d.id)}
                        >
                          {deletingDemoId === d.id ? "Deleting…" : "Delete"}
                        </Button>
                      </div>
                      <AudioWaveformPreview src={`/api/media/${d.id}/file`} />
                      <audio controls className="h-8 w-full max-w-full" src={`/api/media/${d.id}/file`}>
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
