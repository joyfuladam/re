"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Destination {
  id?: string
  serviceKey: string
  label: string
  url: string
  sortOrder?: number
}

interface SmartLink {
  id: string
  songId: string
  slug: string
  title: string
  description: string | null
  imageUrl: string | null
  isActive: boolean
  destinations: Destination[]
  clickStats?: Record<string, number>
}

const DEFAULT_SERVICES: { key: string; label: string; placeholder: string }[] = [
  { key: "spotify", label: "Spotify", placeholder: "https://open.spotify.com/..." },
  { key: "apple_music", label: "Apple Music", placeholder: "https://music.apple.com/..." },
  { key: "amazon_music", label: "Amazon Music", placeholder: "https://music.amazon.com/..." },
  { key: "deezer", label: "Deezer", placeholder: "https://www.deezer.com/..." },
  { key: "tidal", label: "TIDAL", placeholder: "https://tidal.com/..." },
  { key: "youtube_music", label: "YouTube Music", placeholder: "https://music.youtube.com/..." },
]

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function SmartLinkEditorCard({ songId, songTitle }: { songId: string; songTitle: string }) {
  const [smartLink, setSmartLink] = useState<SmartLink | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/smart-links/by-song/${songId}`)
        if (!res.ok) {
          setSmartLink(null)
          setLoading(false)
          return
        }
        const data = await res.json()
        setSmartLink(data)
      } catch (err) {
        console.error("Error loading smart link:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [songId])

  const handleCreate = async () => {
    setSaving(true)
    setError(null)
    try {
      const slug = generateSlug(songTitle) || songId.slice(0, 8)
      const res = await fetch("/api/smart-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songId,
          slug,
          title: songTitle,
          description: null,
          imageUrl: null,
          destinations: [],
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to create smart link")
        return
      }
      setSmartLink(data)
    } catch (err) {
      console.error("Error creating smart link:", err)
      setError("Failed to create smart link")
    } finally {
      setSaving(false)
    }
  }

  const handleFieldChange = (field: keyof SmartLink, value: string | boolean) => {
    if (!smartLink) return
    setSmartLink({ ...smartLink, [field]: value } as SmartLink)
  }

  const handleDestinationChange = (index: number, field: keyof Destination, value: string) => {
    if (!smartLink) return
    const next = [...smartLink.destinations]
    next[index] = { ...next[index], [field]: value }
    setSmartLink({ ...smartLink, destinations: next })
  }

  const handleAddDestination = () => {
    if (!smartLink) return
    setSmartLink({
      ...smartLink,
      destinations: [
        ...smartLink.destinations,
        { serviceKey: "spotify", label: "Spotify", url: "" },
      ],
    })
  }

  const handleRemoveDestination = (index: number) => {
    if (!smartLink) return
    const next = [...smartLink.destinations]
    next.splice(index, 1)
    setSmartLink({ ...smartLink, destinations: next })
  }

  const handleSave = async () => {
    if (!smartLink) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/smart-links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: smartLink.id,
          slug: smartLink.slug,
          title: smartLink.title,
          description: smartLink.description,
          imageUrl: smartLink.imageUrl,
          isActive: smartLink.isActive,
          destinations: smartLink.destinations.map((d, index) => ({
            id: d.id,
            serviceKey: d.serviceKey,
            label: d.label,
            url: d.url,
            sortOrder: index,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to save smart link")
        return
      }
      setSmartLink(data)
    } catch (err) {
      console.error("Error saving smart link:", err)
      setError("Failed to save smart link")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Smart Link</CardTitle>
          <CardDescription>Loading smart link configuration…</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </CardContent>
      </Card>
    )
  }

  if (!smartLink) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Smart Link</CardTitle>
          <CardDescription>
            Create a shareable landing page that links to this song on all major platforms.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </p>
          )}
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? "Creating…" : "Create Smart Link"}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/links/${smartLink.slug}`
      : `/links/${smartLink.slug}`

  return (
    <Card>
      <CardHeader>
        <CardTitle>Smart Link</CardTitle>
        <CardDescription>
          Configure the public landing page and streaming service buttons for this song.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {error}
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="smartlink-slug">Slug</Label>
          <Input
            id="smartlink-slug"
            value={smartLink.slug}
            onChange={(e) => handleFieldChange("slug", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Public URL:{" "}
            <Link href={publicUrl} className="underline">
              {publicUrl}
            </Link>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="smartlink-title">Title</Label>
          <Input
            id="smartlink-title"
            value={smartLink.title}
            onChange={(e) => handleFieldChange("title", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="smartlink-description">Description (optional)</Label>
          <Input
            id="smartlink-description"
            value={smartLink.description ?? ""}
            onChange={(e) => handleFieldChange("description", e.target.value)}
            placeholder="Short tagline or description"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="smartlink-image">Image URL (optional)</Label>
          <Input
            id="smartlink-image"
            value={smartLink.imageUrl ?? ""}
            onChange={(e) => handleFieldChange("imageUrl", e.target.value)}
            placeholder="https://example.com/cover.jpg"
          />
          <p className="text-xs text-muted-foreground">
            Album cover or promo artwork shown at the top of the smart link page.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Destinations</Label>
            <Button variant="outline" size="sm" onClick={handleAddDestination}>
              Add service
            </Button>
          </div>

          {smartLink.destinations.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No services configured yet. Add Spotify, Apple Music, and others here.
            </p>
          )}

          <div className="space-y-3">
            {smartLink.destinations.map((dest, index) => (
              <div
                key={dest.id || index}
                className="border rounded-md p-3 space-y-2 bg-muted/40"
              >
                <div className="flex items-center gap-2">
                  <Label className="text-xs w-20">Service</Label>
                  <select
                    className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={dest.serviceKey}
                    onChange={(e) =>
                      handleDestinationChange(index, "serviceKey", e.target.value)
                    }
                  >
                    {DEFAULT_SERVICES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                    <option value="custom">Custom</option>
                  </select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleRemoveDestination(index)}
                  >
                    ✕
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs w-20">Label</Label>
                  <Input
                    className="flex-1"
                    value={dest.label}
                    onChange={(e) =>
                      handleDestinationChange(index, "label", e.target.value)
                    }
                    placeholder="Spotify"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs w-20">URL</Label>
                  <Input
                    className="flex-1"
                    value={dest.url}
                    onChange={(e) =>
                      handleDestinationChange(index, "url", e.target.value)
                    }
                    placeholder={
                      DEFAULT_SERVICES.find((s) => s.key === dest.serviceKey)
                        ?.placeholder || "https://..."
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">
            {smartLink.clickStats && Object.keys(smartLink.clickStats).length > 0 ? (
              <div className="space-y-1">
                <div className="font-medium">Clicks by service</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(smartLink.clickStats).map(([service, count]) => (
                    <span
                      key={service}
                      className="inline-flex items-center rounded-full border px-2 py-0.5"
                    >
                      <span className="mr-1 font-medium">{count}</span>
                      <span className="uppercase text-[10px] tracking-wide text-muted-foreground">
                        {service}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <span>No clicks recorded yet.</span>
            )}
          </div>
          <div className="flex-shrink-0">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Smart Link"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

