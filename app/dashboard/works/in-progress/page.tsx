"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

type WorkRow = {
  id: string
  title: string
  iswcCode: string | null
  compositionStatus: "in_progress" | "finalized"
  labelPublishingShare: unknown
  createdAt: string
  _count: { songs: number }
  primarySongId: string | null
}

export default function WorksInProgressPage() {
  const { data: session } = useSession()
  const [works, setWorks] = useState<WorkRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const isAdmin = session?.user?.role === "admin"

  useEffect(() => {
    if (!session) return
    const t = setTimeout(() => {
      void fetchWorks()
    }, 200)
    return () => clearTimeout(t)
  }, [session, search])

  const fetchWorks = async () => {
    try {
      const params = new URLSearchParams()
      params.set("limit", "500")
      params.set("compositionStatus", "in_progress")
      if (search.trim()) params.set("q", search.trim())
      const response = await fetch(`/api/works?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setWorks(Array.isArray(data) ? data : [])
      } else {
        setWorks([])
      }
    } catch {
      setWorks([])
    } finally {
      setLoading(false)
    }
  }

  if (loading && works.length === 0) {
    return <div>Loading...</div>
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Works in progress</h1>
        <p className="text-muted-foreground">Access denied</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Works in progress</h1>
          <p className="text-muted-foreground">
            Compositions not yet finalized. Open songwriting on the earliest linked recording.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/works">
            <Button variant="outline">All works</Button>
          </Link>
          <Link href="/dashboard/works/new">
            <Button>New composition</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <CardDescription>Filter in-progress compositions by title</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search titles…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {works.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No compositions in progress. Finalized works stay on the main Works list.
            </CardContent>
          </Card>
        ) : (
          works.map((w) => {
            const labelPct =
              w.labelPublishingShare != null
                ? (parseFloat(String(w.labelPublishingShare)) * 100).toFixed(1)
                : "—"
            const canSongwriting = w.primarySongId != null && w._count.songs > 0
            return (
              <Card key={w.id} className="border-amber-500/40">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg">
                        <Link href={`/dashboard/works/${w.id}`} className="hover:underline">
                          {w.title}
                        </Link>
                      </CardTitle>
                      <Badge variant="secondary" className="bg-amber-500/15 text-amber-900 dark:text-amber-200">
                        In progress
                      </Badge>
                    </div>
                    <CardDescription>
                      {w.iswcCode ? `ISWC: ${w.iswcCode}` : "No ISWC"}
                      {" • "}
                      {w._count.songs} recording
                      {w._count.songs === 1 ? "" : "s"}
                      {" • "}
                      Label publishing: {labelPct}%
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canSongwriting ? (
                      <Link href={`/dashboard/songs/${w.primarySongId}/songwriting`}>
                        <Button size="sm">Songwriting</Button>
                      </Link>
                    ) : (
                      <Button size="sm" variant="outline" disabled title="Add a recording linked to this work first">
                        Songwriting
                      </Button>
                    )}
                    <Link href={`/dashboard/works/${w.id}`}>
                      <Button variant="outline" size="sm">
                        Open work
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
