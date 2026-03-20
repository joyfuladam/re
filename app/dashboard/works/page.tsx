"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type WorkRow = {
  id: string
  title: string
  iswcCode: string | null
  labelPublishingShare: unknown
  createdAt: string
  _count: { songs: number }
}

export default function WorksPage() {
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
        <h1 className="text-3xl font-bold">Works</h1>
        <p className="text-muted-foreground">Access denied</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Works (Compositions)</h1>
          <p className="text-muted-foreground">
            Compositions link to one or more recordings (songs) in the catalog
          </p>
        </div>
        <Link href="/dashboard/works/new">
          <Button>New composition</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <CardDescription>Filter by composition title</CardDescription>
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
              No compositions found. Create one or add a recording from Songs.
            </CardContent>
          </Card>
        ) : (
          works.map((w) => {
            const labelPct =
              w.labelPublishingShare != null
                ? (parseFloat(String(w.labelPublishingShare)) * 100).toFixed(1)
                : "—"
            return (
              <Card key={w.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-lg">
                      <Link
                        href={`/dashboard/works/${w.id}`}
                        className="hover:underline"
                      >
                        {w.title}
                      </Link>
                    </CardTitle>
                    <CardDescription>
                      {w.iswcCode ? `ISWC: ${w.iswcCode}` : "No ISWC"}
                      {" • "}
                      {w._count.songs} recording
                      {w._count.songs === 1 ? "" : "s"}
                      {" • "}
                      Label publishing: {labelPct}%
                    </CardDescription>
                  </div>
                  <Link href={`/dashboard/works/${w.id}`}>
                    <Button variant="outline" size="sm">
                      Open
                    </Button>
                  </Link>
                </CardHeader>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
