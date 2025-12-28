"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

interface Contract {
  id: string
  song: {
    id: string
    title: string
  }
  songCollaborator: {
    collaborator: {
      name: string
      email: string | null
    }
  }
  templateType: string
  esignatureStatus: string
  signedAt: string | null
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchContracts()
  }, [])

  const fetchContracts = async () => {
    try {
      // This would be implemented with a proper API endpoint
      // For now, showing placeholder
      setContracts([])
    } catch (error) {
      console.error("Error fetching contracts:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Contracts</h1>
        <p className="text-muted-foreground">Manage contracts and e-signatures</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contract Management</CardTitle>
          <CardDescription>
            Generate and manage contracts for collaborators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Contracts can be generated from the song detail page after splits are locked.
          </p>
          <Link href="/dashboard/songs">
            <Button>View Songs</Button>
          </Link>
        </CardContent>
      </Card>

      {contracts.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No contracts found</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

