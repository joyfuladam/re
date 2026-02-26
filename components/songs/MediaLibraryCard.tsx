"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileUpload } from "@/components/ui/file-upload"
import { MAX_FILE_SIZE_BYTES } from "@/lib/media-types"

export interface SongMediaItem {
  id: string
  songId: string
  category: string
  filename: string
  storagePath: string
  mimeType: string
  fileSize: number
  label: string | null
  createdAt: string
}

interface MediaLibraryCardProps {
  songId: string
  media: SongMediaItem[]
  onUpdate: () => void
}

const ACCEPT = {
  audio: "audio/*,.wav,.mp3,.flac",
  images: "image/jpeg,image/png,image/webp,image/gif",
  videos: "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov",
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MediaLibraryCard({ songId, media, onUpdate }: MediaLibraryCardProps) {
  const [activeTab, setActiveTab] = useState<"audio" | "images" | "videos">("audio")
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = media.filter((m) => m.category === activeTab)

  const handleUploadSuccess = useCallback(() => {
    setError(null)
    onUpdate()
  }, [onUpdate])

  const handleUploadError = useCallback((msg: string) => {
    setError(msg)
  }, [])

  const handleDelete = useCallback(
    async (mediaId: string) => {
      setDeletingId(mediaId)
      setError(null)
      try {
        const res = await fetch(`/api/songs/${songId}/media?mediaId=${mediaId}`, {
          method: "DELETE",
        })
        if (res.ok) {
          onUpdate()
        } else {
          const data = await res.json()
          setError(data.error || "Delete failed")
        }
      } catch {
        setError("Delete failed")
      } finally {
        setDeletingId(null)
      }
    },
    [songId, onUpdate]
  )

  const fileUrl = (id: string) => `/api/media/${id}/file`

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Media Library</CardTitle>
            <CardDescription>
              Upload master audio, images, and promo videos for this song. Use the Ad Builder to create ads from these assets.
            </CardDescription>
          </div>
          <Link href={`/dashboard/songs/${songId}/ads`}>
            <Button variant="outline">Create Ad</Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-1 border-b">
          {(["audio", "images", "videos"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
                activeTab === tab
                  ? "bg-muted border-b-2 border-b-primary -mb-px"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {error}
          </div>
        )}

        <FileUpload
          accept={ACCEPT[activeTab]}
          maxSizeBytes={MAX_FILE_SIZE_BYTES[activeTab]}
          category={activeTab}
          songId={songId}
          onSuccess={handleUploadSuccess}
          onError={handleUploadError}
        />

        <div className="space-y-2">
          <p className="text-sm font-medium">Uploaded files</p>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No {activeTab} files yet.</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 p-3 border rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {activeTab === "images" && (
                      <img
                        src={fileUrl(item.id)}
                        alt=""
                        className="w-12 h-12 object-cover rounded border"
                      />
                    )}
                    {activeTab === "videos" && (
                      <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        Video
                      </div>
                    )}
                    {activeTab === "audio" && (
                      <audio controls className="h-8 max-w-[180px]" src={fileUrl(item.id)} />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.label || item.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(item.fileSize)} • {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? "Deleting…" : "Delete"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
