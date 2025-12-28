"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface PublishingEntity {
  id: string
  name: string
  isInternal: boolean
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  proAffiliation: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export default function PublishingEntitiesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [entities, setEntities] = useState<PublishingEntity[]>([])
  const [loading, setLoading] = useState(true)

  const isAdmin = session?.user?.role === "admin"

  useEffect(() => {
    if (session) {
      fetchEntities()
    }
  }, [session])

  const fetchEntities = async () => {
    try {
      const response = await fetch("/api/publishing-entities")
      if (response.ok) {
        const data = await response.json()
        setEntities(data)
      }
    } catch (error) {
      console.error("Error fetching publishing entities:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Publishing Entities</h1>
          <p className="text-muted-foreground">Access denied</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Publishing Entities</h1>
          <p className="text-muted-foreground">
            Manage publishing entities and co-publishing companies
          </p>
        </div>
        <Link href="/dashboard/publishing-entities/new">
          <Button>Add Publishing Entity</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Publishing Entities</CardTitle>
          <CardDescription>
            Internal entities (River & Ember) and external co-publishing companies
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No publishing entities found. Add your first one above.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {entities.map((entity) => (
                <Card key={entity.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{entity.name}</CardTitle>
                      {entity.isInternal ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          Internal
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                          Co-Pub
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {entity.contactName && (
                      <div className="text-sm">
                        <div className="font-medium">{entity.contactName}</div>
                        {entity.contactEmail && (
                          <div className="text-muted-foreground">{entity.contactEmail}</div>
                        )}
                        {entity.contactPhone && (
                          <div className="text-muted-foreground">{entity.contactPhone}</div>
                        )}
                      </div>
                    )}
                    {entity.proAffiliation && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">PRO: </span>
                        <span>{entity.proAffiliation}</span>
                      </div>
                    )}
                    <Link href={`/dashboard/publishing-entities/${entity.id}`}>
                      <Button variant="outline" className="w-full mt-4">
                        View Details
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

