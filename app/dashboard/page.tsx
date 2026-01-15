"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface DashboardStats {
  totalSongs: number
  totalCollaborators: number
  pendingContracts: number
  lockedSongs: number
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "admin"
  const [stats, setStats] = useState<DashboardStats>({
    totalSongs: 0,
    totalCollaborators: 0,
    pendingContracts: 0,
    lockedSongs: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/dashboard/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
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
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your record label operations</p>
      </div>

      <div className={`grid gap-4 ${isAdmin ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Songs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSongs}</div>
            <p className="text-xs text-muted-foreground">Active songs in catalog</p>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collaborators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCollaborators}</div>
              <p className="text-xs text-muted-foreground">Total collaborators</p>
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Contracts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingContracts}</div>
              <p className="text-xs text-muted-foreground">Awaiting signatures</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locked Splits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lockedSongs}</div>
            <p className="text-xs text-muted-foreground">Songs with locked splits</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isAdmin && (
              <>
                <Link href="/dashboard/collaborators/new">
                  <Button variant="outline" className="w-full justify-start">
                    Add Collaborator
                  </Button>
                </Link>
                <Link href="/dashboard/songs/new">
                  <Button variant="outline" className="w-full justify-start">
                    Add Song
                  </Button>
                </Link>
              </>
            )}
            <Link href="/dashboard/songs">
              <Button variant="outline" className="w-full justify-start">
                {isAdmin ? "View All Songs" : "My Songs"}
              </Button>
            </Link>
            <Link href="/dashboard/collaborators">
              <Button variant="outline" className="w-full justify-start">
                {isAdmin ? "View All Collaborators" : "My Profile"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

