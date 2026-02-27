"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SignupItem {
  id: string
  name: string | null
  email: string
  createdAt: string
  smartLinkId: string
  smartLinkSlug: string
  smartLinkTitle: string
  songId: string | null
  songTitle: string | null
}

interface SignupResponse {
  total: number
  page: number
  pageSize: number
  items: SignupItem[]
}

export default function SmartLinkSignupsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [signups, setSignups] = useState<SignupItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (status === "loading") return
    const isAdmin = session?.user?.role === "admin"
    if (!isAdmin) {
      router.push("/dashboard")
      return
    }
    void fetchSignups()
  }, [status, session?.user?.role])

  const fetchSignups = async (opts?: { search?: string }) => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (opts?.search) {
        params.set("search", opts.search)
      }
      const res = await fetch(`/api/smart-links/signups?${params.toString()}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error("Failed to load smart link signups:", data)
        setError(data.error || "Failed to load signups")
        return
      }
      const data: SignupResponse = await res.json()
      setSignups(data.items)
    } catch (err) {
      console.error("Error loading smart link signups:", err)
      setError("Failed to load signups")
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading") {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Smart Link Email Signups</h1>
        <p className="text-muted-foreground">
          View fans who have joined your email list from smart links.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Signups</CardTitle>
          <CardDescription>
            Filter by name or email to find specific signups. Most recent appear first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-col sm:flex-row gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void fetchSignups({ search: search.trim() || undefined })
            }}
          >
            <Input
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <div className="flex gap-2">
              <Button type="submit">Search</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearch("")
                  void fetchSignups()
                }}
              >
                Clear
              </Button>
            </div>
          </form>

          {loading && <p className="text-sm text-muted-foreground">Loading signups…</p>}
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          {!loading && !error && signups.length === 0 && (
            <p className="text-sm text-muted-foreground">No signups yet.</p>
          )}

          {!loading && !error && signups.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 pr-4">Date</th>
                    <th className="text-left py-2 pr-4">Name</th>
                    <th className="text-left py-2 pr-4">Email</th>
                    <th className="text-left py-2 pr-4">Song</th>
                    <th className="text-left py-2 pr-4">Smart Link</th>
                  </tr>
                </thead>
                <tbody>
                  {signups.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {new Date(s.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4">{s.name || "—"}</td>
                      <td className="py-2 pr-4">{s.email}</td>
                      <td className="py-2 pr-4">
                        {s.songTitle ? s.songTitle : "—"}
                      </td>
                      <td className="py-2 pr-4">
                        <span className="block font-medium">{s.smartLinkTitle}</span>
                        <span className="block text-xs text-muted-foreground">
                          /links/{s.smartLinkSlug}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

