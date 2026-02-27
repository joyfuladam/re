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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  const startEdit = (item: SignupItem) => {
    setEditingId(item.id)
    setEditName(item.name || "")
    setEditEmail(item.email)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName("")
    setEditEmail("")
  }

  const saveEdit = async (id: string) => {
    try {
      setSavingId(id)
      setError(null)
      const payload: any = {}
      if (editName.trim() !== "") {
        payload.name = editName.trim()
      }
      if (editEmail.trim() !== "") {
        payload.email = editEmail.trim()
      }
      const res = await fetch(`/api/smart-links/signups/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        console.error("Failed to update signup:", data)
        setError(data.error || "Failed to update signup")
        return
      }
      setSignups((prev) =>
        prev.map((s) => (s.id === id ? { ...s, name: data.name ?? s.name, email: data.email ?? s.email } : s))
      )
      setEditingId(null)
    } catch (err) {
      console.error("Error updating signup:", err)
      setError("Failed to update signup")
    } finally {
      setSavingId(null)
    }
  }

  const deleteSignup = async (id: string) => {
    if (!confirm("Delete this signup? This cannot be undone.")) return
    try {
      setDeletingId(id)
      setError(null)
      const res = await fetch(`/api/smart-links/signups/${id}`, {
        method: "DELETE",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        console.error("Failed to delete signup:", data)
        setError(data.error || "Failed to delete signup")
        return
      }
      setSignups((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      console.error("Error deleting signup:", err)
      setError("Failed to delete signup")
    } finally {
      setDeletingId(null)
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
                    <th className="text-left py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {signups.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {new Date(s.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4">
                        {editingId === s.id ? (
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Name"
                            className="h-8 text-xs"
                          />
                        ) : (
                          s.name || "—"
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {editingId === s.id ? (
                          <Input
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            placeholder="Email"
                            className="h-8 text-xs"
                          />
                        ) : (
                          s.email
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {s.songTitle ? s.songTitle : "—"}
                      </td>
                      <td className="py-2 pr-4">
                        <span className="block font-medium">{s.smartLinkTitle}</span>
                        <span className="block text-xs text-muted-foreground">
                          /links/{s.smartLinkSlug}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap gap-2">
                          {editingId === s.id ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => saveEdit(s.id)}
                                disabled={savingId === s.id}
                              >
                                {savingId === s.id ? "Saving..." : "Save"}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEdit(s)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => deleteSignup(s.id)}
                                disabled={deletingId === s.id}
                              >
                                {deletingId === s.id ? "Deleting..." : "Delete"}
                              </Button>
                            </>
                          )}
                        </div>
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

