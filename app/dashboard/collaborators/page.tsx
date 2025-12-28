"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CollaboratorRole } from "@prisma/client"

interface Collaborator {
  id: string
  firstName: string
  middleName: string | null
  lastName: string
  email: string | null
  role?: "admin" | "collaborator"
  capableRoles: CollaboratorRole[]
  status: string
  createdAt?: string
}

export default function CollaboratorsPage() {
  const { data: session } = useSession()
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [updating, setUpdating] = useState<string | null>(null)

  const isAdmin = session?.user?.role === "admin"

  useEffect(() => {
    if (session) {
      fetchCollaborators()
    }
  }, [search, session])

  const fetchCollaborators = async () => {
    try {
      // Use /api/collaborators which already handles permissions
      // It returns all collaborators for admins, or just the logged-in collaborator for non-admins
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      const response = await fetch(`/api/collaborators?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setCollaborators(data)
      }
    } catch (error) {
      console.error("Error fetching collaborators:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (collaboratorId: string, newRole: "admin" | "collaborator") => {
    setUpdating(collaboratorId)
    try {
      const response = await fetch(`/api/collaborators/${collaboratorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })

      if (response.ok) {
        fetchCollaborators() // Refresh the list
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || "Failed to update role"}`)
      }
    } catch (error) {
      console.error("Error updating role:", error)
      alert("Failed to update role")
    } finally {
      setUpdating(null)
    }
  }

  const roleLabels: Record<Exclude<CollaboratorRole, "label">, string> = {
    musician: "Musician",
    writer: "Writer",
    producer: "Producer",
    artist: "Artist",
  }

  const filteredCollaborators = collaborators.filter((collaborator) => {
    const fullName = [collaborator.firstName, collaborator.middleName, collaborator.lastName]
      .filter(Boolean)
      .join(" ")
    return (
      collaborator.email?.toLowerCase().includes(search.toLowerCase()) ||
      fullName.toLowerCase().includes(search.toLowerCase())
    )
  })

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Collaborators</h1>
          <p className="text-muted-foreground">
            {isAdmin 
              ? "Manage all collaborators and their access privileges" 
              : "Your collaborator profile"}
          </p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/collaborators/new">
            <Button>Add Collaborator</Button>
          </Link>
        )}
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Search Collaborators</CardTitle>
            <CardDescription>Search by email or name</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </CardContent>
        </Card>
      )}

      {isAdmin ? (
        // Admin view: List with role management
        <Card>
          <CardHeader>
            <CardTitle>All Collaborators</CardTitle>
            <CardDescription>Manage collaborator access privileges and roles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredCollaborators.map((collaborator) => {
                const fullName = [collaborator.firstName, collaborator.middleName, collaborator.lastName]
                  .filter(Boolean)
                  .join(" ")
                return (
                  <div
                    key={collaborator.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{fullName}</div>
                      <div className="text-sm text-muted-foreground">{collaborator.email}</div>
                      {collaborator.createdAt && (
                        <div className="text-xs text-muted-foreground">
                          Joined: {new Date(collaborator.createdAt).toLocaleDateString()}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {collaborator.capableRoles.filter((r): r is Exclude<CollaboratorRole, "label"> => r !== "label").map((role) => (
                          <span key={role} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {roleLabels[role]}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Role:</span>
                        <Select
                          value={collaborator.role || "collaborator"}
                          onValueChange={(value: "admin" | "collaborator") =>
                            handleRoleChange(collaborator.id, value)
                          }
                          disabled={updating === collaborator.id}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="collaborator">Collaborator</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        {updating === collaborator.id && (
                          <span className="text-xs text-muted-foreground">Updating...</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {collaborator.role === "admin" && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                            Admin
                          </span>
                        )}
                        {collaborator.role === "collaborator" && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            Collaborator
                          </span>
                        )}
                      </div>
                      <Link href={`/dashboard/collaborators/${collaborator.id}`}>
                        <Button variant="outline">View Details</Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>

            {filteredCollaborators.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {search ? "No collaborators found matching your search" : "No collaborators found"}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // Non-admin view: Card grid showing their own profile
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCollaborators.map((collaborator) => {
            const fullName = [collaborator.firstName, collaborator.middleName, collaborator.lastName]
              .filter(Boolean)
              .join(" ")
            return (
              <Card key={collaborator.id}>
                <CardHeader>
                  <CardTitle>{fullName}</CardTitle>
                  <CardDescription>
                    {collaborator.capableRoles.filter((r): r is Exclude<CollaboratorRole, "label"> => r !== "label").map(r => roleLabels[r]).join(", ")}
                    {collaborator.email && ` • ${collaborator.email}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 text-sm mb-4">
                    {collaborator.capableRoles.filter((r): r is Exclude<CollaboratorRole, "label"> => r !== "label").map((role) => (
                      <span key={role} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {roleLabels[role]}
                      </span>
                    ))}
                  </div>
                  <Link href={`/dashboard/collaborators/${collaborator.id}`}>
                    <Button variant="outline" className="w-full">
                      View My Profile
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {!isAdmin && collaborators.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No collaborator profile found</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

