"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NewWorkPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [iswcCode, setIswcCode] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session && session.user?.role !== "admin") {
      router.push("/dashboard")
    }
  }, [session, router])

  if (session && session.user?.role !== "admin") {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      const response = await fetch("/api/works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          iswcCode: iswcCode.trim() || null,
        }),
      })
      if (response.ok) {
        const work = await response.json()
        router.push(`/dashboard/works/${work.id}`)
      } else {
        const err = await response.json().catch(() => ({}))
        alert(err.error?.[0]?.message || err.error || "Failed to create composition")
      }
    } catch {
      alert("Failed to create composition")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New composition</h1>
        <p className="text-muted-foreground">
          Create a work without a recording, or add recordings later from Songs.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Title and optional ISWC</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iswc">ISWC (optional)</Label>
              <Input
                id="iswc"
                value={iswcCode}
                onChange={(e) => setIswcCode(e.target.value)}
                placeholder="T-123456789-0"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating…" : "Create"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/works">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
