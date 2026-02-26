"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface FileUploadProps {
  accept: string // e.g. "audio/*,.wav,.mp3"
  maxSizeBytes: number
  category: "audio" | "images" | "videos"
  songId: string
  onSuccess: (media: { id: string; filename: string; mimeType: string; fileSize: number; label: string | null }) => void
  onError: (message: string) => void
  disabled?: boolean
  className?: string
  label?: string
}

export function FileUpload({
  accept,
  maxSizeBytes,
  category,
  songId,
  onSuccess,
  onError,
  disabled,
  className,
  label,
}: FileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null)

  const maxSizeMB = Math.round(maxSizeBytes / 1024 / 1024)

  const uploadFile = React.useCallback(
    (file: File) => {
      if (file.size > maxSizeBytes) {
        onError(`File must be under ${maxSizeMB}MB`)
        return
      }

      setUploadProgress(0)
      const formData = new FormData()
      formData.append("file", file)
      formData.append("category", category)
      if (label) formData.append("label", label)

      const xhr = new XMLHttpRequest()
      xhr.open("POST", `/api/songs/${songId}/media`)

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100))
        }
      })

      xhr.onload = () => {
        setUploadProgress(null)
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText)
            onSuccess({
              id: data.id,
              filename: data.filename,
              mimeType: data.mimeType,
              fileSize: data.fileSize,
              label: data.label ?? null,
            })
          } catch {
            onError("Invalid response")
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText)
            onError(err.error || "Upload failed")
          } catch {
            onError(`Upload failed (${xhr.status})`)
          }
        }
      }

      xhr.onerror = () => {
        setUploadProgress(null)
        onError("Network error")
      }

      xhr.send(formData)
    },
    [category, songId, maxSizeBytes, maxSizeMB, onError, onSuccess, label]
  )

  const handleFile = (file: File | null) => {
    if (!file) return
    const accepted = accept.split(",").map((a) => a.trim())
    const ok = accepted.some((a) => {
      if (a.endsWith("/*")) {
        const type = a.split("/")[0]
        return file.type.startsWith(type + "/")
      }
      if (a.startsWith(".")) return file.name.toLowerCase().endsWith(a.toLowerCase())
      return file.type === a
    })
    if (!ok) {
      onError(`Invalid file type. Allowed: ${accept}`)
      return
    }
    uploadFile(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files[0]
    handleFile(file || null)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = () => {
    setIsDragging(false)
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    handleFile(file || null)
    e.target.value = ""
  }

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onInputChange}
        className="hidden"
        disabled={disabled}
      />
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragging && "border-primary bg-primary/5",
          !isDragging && "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        {uploadProgress !== null ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Uploading…</p>
            <div className="h-2 w-full max-w-xs mx-auto rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Drag and drop a file here, or click to select. Max {maxSizeMB}MB.
          </p>
        )}
      </div>
    </div>
  )
}
