"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const CTA_OPTIONS = [
  "Listen Now",
  "Pre-Save",
  "Learn More",
  "Shop Now",
  "Sign Up",
  "Download",
  "Subscribe",
]

interface SongMediaItem {
  id: string
  category: string
  filename: string
  mimeType: string
  label: string | null
}

interface AdDraft {
  id: string
  name: string
  headline: string
  primaryText: string
  callToAction: string | null
  destinationUrl: string | null
  imageMediaId: string | null
  videoMediaId: string | null
  format: string
  status: string
}

export default function AdBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const songId = typeof params.id === "string" ? params.id : params.id?.[0]

  const [songTitle, setSongTitle] = useState<string>("")
  const [media, setMedia] = useState<SongMediaItem[]>([])
  const [drafts, setDrafts] = useState<AdDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [format, setFormat] = useState<"image" | "video">("image")
  const [draftName, setDraftName] = useState("")
  const [headline, setHeadline] = useState("")
  const [primaryText, setPrimaryText] = useState("")
  const [callToAction, setCallToAction] = useState<string | null>(null)
  const [destinationUrl, setDestinationUrl] = useState("")
  const [imageMediaId, setImageMediaId] = useState<string | null>(null)
  const [videoMediaId, setVideoMediaId] = useState<string | null>(null)
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  const [previewPlatform, setPreviewPlatform] = useState<"facebook" | "instagram">("facebook")

  const fetchData = useCallback(async () => {
    if (!songId) return
    setLoading(true)
    try {
      const [songRes, mediaRes, adsRes] = await Promise.all([
        fetch(`/api/songs/${songId}`),
        fetch(`/api/songs/${songId}/media`),
        fetch(`/api/songs/${songId}/ads`),
      ])
      if (!songRes.ok || !mediaRes.ok || !adsRes.ok) {
        setError("Failed to load data")
        return
      }
      const songData = await songRes.json()
      setSongTitle(songData.title || "Song")
      setMedia(await mediaRes.json())
      setDrafts(await adsRes.json())
    } catch {
      setError("Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [songId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const loadDraft = (draft: AdDraft) => {
    setEditingDraftId(draft.id)
    setDraftName(draft.name)
    setHeadline(draft.headline)
    setPrimaryText(draft.primaryText)
    setCallToAction(draft.callToAction || null)
    setDestinationUrl(draft.destinationUrl || "")
    setImageMediaId(draft.imageMediaId || null)
    setVideoMediaId(draft.videoMediaId || null)
    setFormat((draft.format as "image" | "video") || "image")
  }

  const clearForm = () => {
    setEditingDraftId(null)
    setDraftName("")
    setHeadline("")
    setPrimaryText("")
    setCallToAction(null)
    setDestinationUrl("")
    setImageMediaId(null)
    setVideoMediaId(null)
  }

  const handleSave = async () => {
    if (!songId) return
    if (!draftName.trim() || !headline.trim() || !primaryText.trim()) {
      setError("Name, headline, and primary text are required")
      return
    }
    if (format === "image" && !imageMediaId) {
      setError("Select an image for the ad")
      return
    }
    if (format === "video" && !videoMediaId) {
      setError("Select a video for the ad")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const url = editingDraftId
        ? `/api/songs/${songId}/ads/${editingDraftId}`
        : `/api/songs/${songId}/ads`
      const method = editingDraftId ? "PATCH" : "POST"
      const body =
        method === "POST"
          ? {
              name: draftName.trim(),
              headline: headline.trim(),
              primaryText: primaryText.trim(),
              callToAction: callToAction || null,
              destinationUrl: destinationUrl.trim() || null,
              imageMediaId: format === "image" ? imageMediaId : null,
              videoMediaId: format === "video" ? videoMediaId : null,
              format,
            }
          : {
              name: draftName.trim(),
              headline: headline.trim(),
              primaryText: primaryText.trim(),
              callToAction: callToAction || null,
              destinationUrl: destinationUrl.trim() || null,
              imageMediaId: format === "image" ? imageMediaId : null,
              videoMediaId: format === "video" ? videoMediaId : null,
              format,
            }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error?.message || data.error || "Save failed")
        return
      }
      await fetchData()
      clearForm()
    } catch {
      setError("Save failed")
    } finally {
      setSaving(false)
    }
  }

  const images = media.filter((m) => m.category === "images")
  const videos = media.filter((m) => m.category === "videos")
  const selectedImageUrl = imageMediaId ? `/api/media/${imageMediaId}/file` : null
  const selectedVideoUrl = videoMediaId ? `/api/media/${videoMediaId}/file` : null

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading…</p>
      </div>
    )
  }

  if (error && !songId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive">{error}</p>
        <Link href="/dashboard/songs">
          <Button variant="outline" className="mt-4">
            Back to Songs
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/dashboard/songs/${songId}`}>
          <Button variant="ghost">← Back to song</Button>
        </Link>
        <h1 className="text-2xl font-bold">Ad Builder — {songTitle}</h1>
      </div>

      {error && (
        <div className="mb-4 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Ad creative</CardTitle>
            <CardDescription>
              Choose format, asset, and copy. Preview updates as you type.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as "image" | "video")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image ad</SelectItem>
                  <SelectItem value="video">Video ad</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {format === "image" && (
              <div className="space-y-2">
                <Label>Image</Label>
                <div className="flex flex-wrap gap-2">
                  {images.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setImageMediaId(m.id)}
                      className={`w-20 h-20 rounded border-2 overflow-hidden ${
                        imageMediaId === m.id ? "border-primary" : "border-muted"
                      }`}
                    >
                      <img
                        src={`/api/media/${m.id}/file`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                  {images.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Upload images in the song Media Library first.
                    </p>
                  )}
                </div>
              </div>
            )}

            {format === "video" && (
              <div className="space-y-2">
                <Label>Video</Label>
                <div className="flex flex-wrap gap-2">
                  {videos.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setVideoMediaId(m.id)}
                      className={`rounded border-2 p-2 text-sm ${
                        videoMediaId === m.id ? "border-primary" : "border-muted"
                      }`}
                    >
                      {m.label || m.filename}
                    </button>
                  ))}
                  {videos.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Upload videos in the song Media Library first.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="draft-name">Draft name</Label>
              <Input
                id="draft-name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="e.g. Release week image ad"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="headline">Headline (max 40 chars)</Label>
              <Input
                id="headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value.slice(0, 40))}
                placeholder="New single out now"
                maxLength={40}
              />
              <p className="text-xs text-muted-foreground">{headline.length}/40</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary">Primary text</Label>
              <textarea
                id="primary"
                value={primaryText}
                onChange={(e) => setPrimaryText(e.target.value.slice(0, 125))}
                placeholder="Main ad copy…"
                maxLength={125}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground">{primaryText.length}/125</p>
            </div>

            <div className="space-y-2">
              <Label>Call to action</Label>
              <Select
                value={callToAction || ""}
                onValueChange={(v) => setCallToAction(v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select CTA" />
                </SelectTrigger>
                <SelectContent>
                  {CTA_OPTIONS.map((cta) => (
                    <SelectItem key={cta} value={cta}>
                      {cta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Destination URL</Label>
              <Input
                id="url"
                type="url"
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : editingDraftId ? "Update draft" : "Save draft"}
              </Button>
              {editingDraftId && (
                <Button variant="outline" onClick={clearForm}>
                  New draft
                </Button>
              )}
            </div>

            {drafts.length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <Label>Existing drafts</Label>
                <ul className="space-y-1">
                  {drafts.map((d) => (
                    <li key={d.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => loadDraft(d)}
                        className="text-sm text-primary hover:underline"
                      >
                        {d.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Mock-up of how the ad may appear (Meta push not implemented yet).
            </CardDescription>
            <div className="flex gap-2">
              <Button
                variant={previewPlatform === "facebook" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewPlatform("facebook")}
              >
                Facebook
              </Button>
              <Button
                variant={previewPlatform === "instagram" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewPlatform("instagram")}
              >
                Instagram
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`mx-auto rounded-lg overflow-hidden border bg-muted/30 ${
                previewPlatform === "instagram" ? "max-w-sm" : "max-w-md"
              }`}
            >
              <div className="p-2 flex items-center gap-2 border-b bg-background">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <span className="text-sm font-medium">
                  {previewPlatform === "facebook" ? "Page name" : "Account"}
                </span>
                <span className="text-xs text-muted-foreground">Sponsored</span>
              </div>
              {(format === "image" && selectedImageUrl) || (format === "video" && selectedVideoUrl) ? (
                format === "image" && selectedImageUrl ? (
                  <img
                    src={selectedImageUrl}
                    alt=""
                    className="w-full aspect-square object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square bg-muted flex items-center justify-center text-sm text-muted-foreground">
                    Video: {selectedVideoUrl ? "Selected" : "—"}
                  </div>
                )
              ) : (
                <div className="w-full aspect-square bg-muted flex items-center justify-center text-sm text-muted-foreground">
                  Select an {format} in the Media Library
                </div>
              )}
              <div className="p-3 space-y-1 bg-background">
                <p className="text-sm font-medium">{headline || "Headline"}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {primaryText || "Primary text…"}
                </p>
                {callToAction && (
                  <div className="pt-2">
                    <span className="text-sm text-primary font-medium">{callToAction}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
