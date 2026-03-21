"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

function hslFromCssVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return raw ? `hsl(${raw})` : fallback
}

function computePeaks(channel: Float32Array, barCount: number): number[] {
  const len = channel.length
  if (len === 0) return Array(barCount).fill(0)
  const step = Math.ceil(len / barCount)
  const peaks: number[] = []
  for (let i = 0; i < barCount; i++) {
    const start = i * step
    const end = Math.min(start + step, len)
    let max = 0
    for (let j = start; j < end; j++) {
      const v = Math.abs(channel[j] ?? 0)
      if (v > max) max = v
    }
    peaks.push(max)
  }
  return peaks
}

function drawPeaks(
  canvas: HTMLCanvasElement,
  peaks: number[],
  fill: string,
  barColor: string
) {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
  const rect = canvas.getBoundingClientRect()
  const drawW = Math.max(1, rect.width)
  const drawH = Math.max(1, rect.height)
  canvas.width = Math.floor(drawW * dpr)
  canvas.height = Math.floor(drawH * dpr)
  const g = canvas.getContext("2d")
  if (!g) return
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.scale(dpr, dpr)
  g.fillStyle = fill
  g.fillRect(0, 0, drawW, drawH)

  const maxPeak = Math.max(...peaks, 1e-6)
  const n = peaks.length
  const gap = 1
  const barW = Math.max(1, drawW / n - gap)

  g.fillStyle = barColor
  for (let i = 0; i < n; i++) {
    const h = (peaks[i]! / maxPeak) * drawH * 0.88
    const x = (i * drawW) / n + gap / 2
    const y = drawH - h
    g.fillRect(x, y, barW, h)
  }
}

export function AudioWaveformPreview({
  src,
  className,
  bars = 160,
}: {
  src: string
  className?: string
  bars?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading")

  useEffect(() => {
    let cancelled = false
    let resizeObserver: ResizeObserver | null = null

    const run = async () => {
      const ac = new AudioContext()
      try {
        const res = await fetch(src)
        if (!res.ok) throw new Error("fetch failed")
        const buf = await res.arrayBuffer()
        if (cancelled) return
        const audioBuf = await ac.decodeAudioData(buf.slice(0))
        if (cancelled) return
        const channel = audioBuf.getChannelData(0)
        const peaks = computePeaks(channel, bars)
        if (cancelled) return

        const canvas = canvasRef.current
        if (!canvas) {
          setStatus("error")
          return
        }

        const fill = hslFromCssVar("--muted", "#f4f4f5")
        const barColor = hslFromCssVar("--primary", "#18181b")

        const redraw = () => {
          if (cancelled || !canvasRef.current) return
          drawPeaks(canvasRef.current, peaks, fill, barColor)
        }

        redraw()
        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(() => redraw())
          resizeObserver.observe(canvas)
        }
        setStatus("ready")
        requestAnimationFrame(() => {
          requestAnimationFrame(() => redraw())
        })
      } catch {
        if (!cancelled) setStatus("error")
      } finally {
        await ac.close()
      }
    }

    void run()

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
    }
  }, [src, bars])

  return (
    <div className={cn("relative w-full overflow-hidden rounded-md border bg-muted/30", className)}>
      {status === "loading" && (
        <div
          className="absolute inset-0 z-10 animate-pulse rounded-md bg-muted"
          aria-hidden
        />
      )}
      <canvas
        ref={canvasRef}
        className={cn("h-12 w-full", status === "loading" && "opacity-0", status === "error" && "hidden")}
        aria-hidden
      />
      {status === "error" && (
        <div className="flex h-12 items-center px-2 text-xs text-muted-foreground">Waveform unavailable</div>
      )}
    </div>
  )
}
