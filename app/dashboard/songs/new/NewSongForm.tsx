"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type WorkOption = { id: string; title: string; iswcCode: string | null }

export default function NewSongForm() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromSongwriting =
    searchParams.get("songwriting") === "1" || searchParams.get("songwriting") === "true"

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    isrcCode: "",
    iswcCode: "",
    catalogNumber: "", // Will be auto-generated
    releaseDate: "",
    proWorkRegistrationNumber: "",
    publishingAdmin: "",
    masterOwner: "",
    genre: "",
    subGenre: "",
    duration: "",
    recordingDate: "",
    recordingLocation: "",
    notes: "",
  })
  const [loadingCatalogNumber, setLoadingCatalogNumber] = useState(false)
  const [works, setWorks] = useState<WorkOption[]>([])
  const [workMode, setWorkMode] = useState<"new" | "existing">("new")
  const [existingWorkId, setExistingWorkId] = useState("")

  useEffect(() => {
    if (fromSongwriting) {
      setWorkMode("new")
      setExistingWorkId("")
    }
  }, [fromSongwriting])

  useEffect(() => {
    if (session?.user?.role === "admin" && !fromSongwriting) {
      fetch("/api/works")
        .then((r) => r.json())
        .then((data) => setWorks(Array.isArray(data) ? data : []))
        .catch(() => setWorks([]))
    }
  }, [session, fromSongwriting])

  useEffect(() => {
    if (status === "loading") return
    if (session && session.user?.role !== "admin" && !fromSongwriting) {
      router.push("/dashboard")
    }
  }, [session, status, router, fromSongwriting])

  useEffect(() => {
    const fetchNextCatalogNumber = async () => {
      setLoadingCatalogNumber(true)
      try {
        setFormData((prev) => ({ ...prev, catalogNumber: "Auto-generated" }))
      } catch (error) {
        console.error("Error fetching catalog number:", error)
      } finally {
        setLoadingCatalogNumber(false)
      }
    }
    fetchNextCatalogNumber()
  }, [])

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">Loading…</div>
    )
  }

  if (session && session.user?.role !== "admin" && !fromSongwriting) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromSongwriting && workMode === "existing" && !existingWorkId) {
      alert("Select an existing composition or choose “New composition”.")
      return
    }
    setLoading(true)

    try {
      const response = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          duration: formData.duration ? parseInt(formData.duration, 10) : null,
          releaseDate: formData.releaseDate || null,
          recordingDate: formData.recordingDate || null,
          isrcCode: formData.isrcCode || null,
          iswcCode: formData.iswcCode || null,
          workId:
            fromSongwriting || workMode === "new"
              ? null
              : workMode === "existing" && existingWorkId
                ? existingWorkId
                : null,
          catalogNumber: null,
          proWorkRegistrationNumber: formData.proWorkRegistrationNumber || null,
          publishingAdmin: formData.publishingAdmin || null,
          masterOwner: formData.masterOwner || null,
          genre: formData.genre || null,
          subGenre: formData.subGenre || null,
          recordingLocation: formData.recordingLocation || null,
          notes: formData.notes || null,
          ...(fromSongwriting ? { songwritingIntent: true } : {}),
        }),
      })

      if (response.ok) {
        const song = await response.json()
        if (fromSongwriting) {
          router.push(`/dashboard/songs/${song.id}/songwriting`)
        } else {
          router.push(`/dashboard/songs/${song.id}`)
        }
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || "Failed to create song"}`)
      }
    } catch (error) {
      console.error("Error creating song:", error)
      alert("Failed to create song")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {fromSongwriting ? "New songwriting project" : "New recording"}
        </h1>
        <p className="text-muted-foreground">
          {fromSongwriting
            ? "Creates a new composition (work) in progress and a recording, then opens the songwriting workspace."
            : "Add a master to the catalog (linked to a composition)"}
        </p>
      </div>

      {fromSongwriting && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">Composition in progress</p>
          <p className="mt-1 text-muted-foreground">
            The underlying <strong>work</strong> (composition) is tracked as <em>in progress</em> until you
            register or finalize it on the work page. This recording holds lyrics, demos, and songwriting chat.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Song Information</CardTitle>
          <CardDescription>Enter the song&apos;s details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Composition (Work)</Label>
              {fromSongwriting ? (
                <p className="text-xs text-muted-foreground">
                  A new composition is created from this title and marked <strong>in progress</strong>. You can
                  add alternate masters later from the catalog and link them to the same work if needed.
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    A <strong>composition</strong> can have multiple recordings. By default we create a new
                    composition from this title; or link to an existing one (e.g. alternate master).
                  </p>
                  <Select
                    value={workMode}
                    onValueChange={(v) => {
                      setWorkMode(v as "new" | "existing")
                      if (v === "new") setExistingWorkId("")
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Composition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New composition (uses recording title)</SelectItem>
                      <SelectItem value="existing">Link to existing composition</SelectItem>
                    </SelectContent>
                  </Select>
                  {workMode === "existing" && (
                    <Select value={existingWorkId} onValueChange={setExistingWorkId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a composition…" />
                      </SelectTrigger>
                      <SelectContent>
                        {works.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.title}
                            {w.iswcCode ? ` (${w.iswcCode})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="catalogNumber">Catalog Number</Label>
              <Input
                id="catalogNumber"
                value={formData.catalogNumber}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                {loadingCatalogNumber ? "Generating..." : "Catalog number will be auto-generated"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="isrcCode">ISRC Code</Label>
              <Input
                id="isrcCode"
                value={formData.isrcCode}
                onChange={(e) => setFormData({ ...formData, isrcCode: e.target.value })}
                placeholder="US-S1Z-99-00001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="iswcCode">ISWC</Label>
              <Input
                id="iswcCode"
                value={formData.iswcCode}
                onChange={(e) => setFormData({ ...formData, iswcCode: e.target.value })}
                placeholder="T-123456789-0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="releaseDate">Release Date</Label>
              <Input
                id="releaseDate"
                type="date"
                value={formData.releaseDate}
                onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proWorkRegistrationNumber">PRO Work Registration Number</Label>
              <Input
                id="proWorkRegistrationNumber"
                value={formData.proWorkRegistrationNumber}
                onChange={(e) => setFormData({ ...formData, proWorkRegistrationNumber: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="publishingAdmin">Publishing Administrator</Label>
              <Input
                id="publishingAdmin"
                value={formData.publishingAdmin}
                onChange={(e) => setFormData({ ...formData, publishingAdmin: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="masterOwner">Master Owner</Label>
              <Input
                id="masterOwner"
                value={formData.masterOwner}
                onChange={(e) => setFormData({ ...formData, masterOwner: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="genre">Genre</Label>
                <Input
                  id="genre"
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subGenre">Sub-Genre</Label>
                <Input
                  id="subGenre"
                  value={formData.subGenre}
                  onChange={(e) => setFormData({ ...formData, subGenre: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (seconds)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recordingDate">Recording Date</Label>
              <Input
                id="recordingDate"
                type="date"
                value={formData.recordingDate}
                onChange={(e) => setFormData({ ...formData, recordingDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recordingLocation">Recording Location</Label>
              <Input
                id="recordingLocation"
                value={formData.recordingLocation}
                onChange={(e) => setFormData({ ...formData, recordingLocation: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : fromSongwriting ? "Create & open songwriting" : "Create Song"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
