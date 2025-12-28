"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NewSongPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    isrcCode: "",
    catalogNumber: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          duration: formData.duration ? parseInt(formData.duration) : null,
          releaseDate: formData.releaseDate || null,
          recordingDate: formData.recordingDate || null,
          isrcCode: formData.isrcCode || null,
          catalogNumber: formData.catalogNumber || null,
          proWorkRegistrationNumber: formData.proWorkRegistrationNumber || null,
          publishingAdmin: formData.publishingAdmin || null,
          masterOwner: formData.masterOwner || null,
          genre: formData.genre || null,
          subGenre: formData.subGenre || null,
          recordingLocation: formData.recordingLocation || null,
          notes: formData.notes || null,
        }),
      })

      if (response.ok) {
        const song = await response.json()
        router.push(`/dashboard/songs/${song.id}`)
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
        <h1 className="text-3xl font-bold">New Song</h1>
        <p className="text-muted-foreground">Add a new song to the catalog</p>
      </div>

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
              <Label htmlFor="isrcCode">ISRC Code</Label>
              <Input
                id="isrcCode"
                value={formData.isrcCode}
                onChange={(e) => setFormData({ ...formData, isrcCode: e.target.value })}
                placeholder="US-S1Z-99-00001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="catalogNumber">Catalog Number</Label>
              <Input
                id="catalogNumber"
                value={formData.catalogNumber}
                onChange={(e) => setFormData({ ...formData, catalogNumber: e.target.value })}
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
                {loading ? "Creating..." : "Create Song"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

