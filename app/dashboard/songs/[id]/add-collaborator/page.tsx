"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CollaboratorRole } from "@prisma/client"
import { SongRoleSelector } from "@/components/songs/SongRoleSelector"
import { isPublishingEligible, isMasterEligible } from "@/lib/roles"

interface Collaborator {
  id: string
  firstName: string
  middleName: string | null
  lastName: string
  capableRoles: CollaboratorRole[]
}

const roleLabels: Record<Exclude<CollaboratorRole, "label">, string> = {
  musician: "Musician",
  writer: "Writer",
  producer: "Producer",
  artist: "Artist",
  vocalist: "Vocalist",
}


export default function AddCollaboratorPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const section = searchParams.get("section") // "publishing" or "master"
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string>("")
  const [selectedRoles, setSelectedRoles] = useState<CollaboratorRole[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchCollaborators()
  }, [])

  const fetchCollaborators = async () => {
    try {
      const response = await fetch("/api/collaborators")
      const data = await response.json()
      setCollaborators(data)
    } catch (error) {
      console.error("Error fetching collaborators:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCollaboratorId || selectedRoles.length === 0) return

    setLoading(true)

    try {
      const response = await fetch(`/api/songs/${params.id}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collaboratorId: selectedCollaboratorId,
          rolesInSong: selectedRoles,
        }),
      })

      if (response.ok) {
        router.push(`/dashboard/songs/${params.id}`)
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || "Failed to add collaborator"}`)
      }
    } catch (error) {
      console.error("Error adding collaborator:", error)
      alert("Failed to add collaborator")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add Collaborator</h1>
        <p className="text-muted-foreground">
          {section === "publishing" 
            ? "Add a collaborator to the Publishing Share section"
            : section === "master"
            ? "Add a collaborator to the Master Revenue Share section"
            : "Add a collaborator to this song"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Collaborator</CardTitle>
          <CardDescription>Choose a collaborator to add to this song</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="collaborator">Collaborator *</Label>
              <Select
                value={selectedCollaboratorId}
                onValueChange={(value) => {
                  setSelectedCollaboratorId(value)
                  // Reset selected roles when collaborator changes
                  setSelectedRoles([])
                }}
              >
                <SelectTrigger id="collaborator">
                  <SelectValue placeholder="Select a collaborator" />
                </SelectTrigger>
                <SelectContent>
                  {collaborators.map((collaborator) => (
                    <SelectItem key={collaborator.id} value={collaborator.id}>
                      {[collaborator.firstName, collaborator.middleName, collaborator.lastName].filter(Boolean).join(" ")} ({collaborator.capableRoles.filter((r): r is Exclude<CollaboratorRole, "label"> => r !== "label").map(r => roleLabels[r]).join(", ")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCollaboratorId && (() => {
              const collaborator = collaborators.find((c) => c.id === selectedCollaboratorId)
              const allCapableRoles = collaborator?.capableRoles || []
              
              // Filter roles based on section
              let eligibleRoles: CollaboratorRole[] = []
              if (section === "publishing") {
                // Only show Writers and Label for publishing section
                eligibleRoles = allCapableRoles.filter(role => role === "writer" || role === "label")
              } else if (section === "master") {
                // Only show master-eligible roles (excluding label)
                eligibleRoles = allCapableRoles.filter(role => isMasterEligible(role) && role !== "label")
              } else {
                // No section specified - show all roles (backward compatibility)
                eligibleRoles = allCapableRoles
              }
              
              if (eligibleRoles.length === 0) {
                return (
                  <div className="p-4 border rounded-md bg-muted">
                    <p className="text-sm text-muted-foreground">
                      {section === "publishing" 
                        ? "This collaborator is not eligible for publishing shares. They must be a Writer or Label."
                        : section === "master"
                        ? "This collaborator is not eligible for master revenue shares. They must be a Producer, Artist, Musician, or Vocalist."
                        : "This collaborator has no eligible roles."}
                    </p>
                  </div>
                )
              }
              
              return (
                <SongRoleSelector
                  value={selectedRoles}
                  onValueChange={setSelectedRoles}
                  disabled={!selectedCollaboratorId}
                  availableRoles={eligibleRoles}
                />
              )
            })()}

            <div className="flex gap-4">
              <Button type="submit" disabled={loading || !selectedCollaboratorId || selectedRoles.length === 0}>
                {loading ? "Adding..." : "Add Collaborator"}
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

