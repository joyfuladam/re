"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

function pickRecorderMimeType(): { mimeType: string; extension: string } {
  const candidates: { mime: string; ext: string }[] = [
    { mime: "audio/webm;codecs=opus", ext: "webm" },
    { mime: "audio/webm", ext: "webm" },
    { mime: "audio/mp4", ext: "m4a" },
    { mime: "audio/ogg;codecs=opus", ext: "ogg" },
  ]
  for (const { mime, ext } of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) {
      return { mimeType: mime, extension: ext }
    }
  }
  return { mimeType: "", extension: "webm" }
}

function LiveWaveform({ stream }: { stream: MediaStream | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!stream) return
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = new AudioContext()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    source.connect(analyser)
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      const c = canvasRef.current
      const g = c?.getContext("2d")
      if (!c || !g) return
      analyser.getByteTimeDomainData(dataArray)
      const w = c.width
      const h = c.height
      g.fillStyle = "hsl(var(--muted))"
      g.fillRect(0, 0, w, h)
      g.lineWidth = 2
      g.strokeStyle = "hsl(var(--primary))"
      g.beginPath()
      const slice = w / bufferLength
      let x = 0
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * h) / 2
        if (i === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
        x += slice
      }
      g.stroke()
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      source.disconnect()
      void ctx.close()
    }
  }, [stream])

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={80}
      className="h-20 w-full max-w-full rounded-md border bg-muted/40"
      aria-hidden
    />
  )
}

export function SongwritingMicRecorder({
  songId,
  demoLabel,
  onUploaded,
  onUploadingChange,
  disabled,
}: {
  songId: string
  demoLabel: string
  onUploaded: () => void
  /** Fires when mic upload starts/ends so parent can disable other demo actions */
  onUploadingChange?: (uploading: boolean) => void
  disabled?: boolean
}) {
  const [micError, setMicError] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setRecording(false)
    setSeconds(0)
    setPreviewStream(null)
    recorderRef.current?.stop()
    /* Stream is released in `onstop` after the blob is finalized */
  }, [])

  const startRecording = async () => {
    setMicError(null)
    chunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      setPreviewStream(stream)
      const { mimeType, extension } = pickRecorderMimeType()
      const options: MediaRecorderOptions = {}
      if (mimeType) options.mimeType = mimeType
      const rec = new MediaRecorder(stream, options)
      recorderRef.current = rec
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.onstop = async () => {
        const type = rec.mimeType || mimeType || "audio/webm"
        const blob = new Blob(chunksRef.current, { type })
        chunksRef.current = []
        const label = (demoLabel.trim() || "Mic idea") + ` · ${new Date().toLocaleString()}`
        const name = `songwriting-mic-${Date.now()}.${extension}`
        const file = new File([blob], name, { type: blob.type })
        setUploading(true)
        onUploadingChange?.(true)
        try {
          const fd = new FormData()
          fd.append("category", "audio")
          fd.append("label", label)
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
          onUploaded()
        } finally {
          setUploading(false)
          onUploadingChange?.(false)
          stopStream()
        }
      }
      rec.start(200)
      setRecording(true)
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        setMicError("Microphone access was denied. Allow the mic for this site in your browser settings.")
      } else {
        setMicError(`Could not access microphone: ${msg}`)
      }
      stopStream()
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      stopStream()
    }
  }, [stopStream])

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`

  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <Label className="text-sm font-medium">Record from microphone</Label>
      <p className="text-xs text-muted-foreground">
        Quick idea capture. Uses the same demo upload as file uploads (requires HTTPS or localhost).
      </p>
      {micError && <p className="text-sm text-destructive">{micError}</p>}
      {recording && previewStream && <LiveWaveform stream={previewStream} />}
      {recording && (
        <p className="text-sm font-mono text-muted-foreground">
          Recording… {fmt(seconds)}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {!recording ? (
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || uploading}
            onClick={() => void startRecording()}
          >
            {uploading ? "Uploading…" : "Start recording"}
          </Button>
        ) : (
          <Button type="button" variant="destructive" disabled={disabled || uploading} onClick={stopRecording}>
            Stop & upload
          </Button>
        )}
      </div>
    </div>
  )
}
