"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface Song {
  id: string
  title: string
  isrcCode: string | null
  iswcCode: string | null
  catalogNumber: string | null
  publishingLocked: boolean
  masterLocked: boolean
  status: string
  songCollaborators: Array<{
    collaborator: {
      name: string
      role: string
    }
  }>
}

export default function SongsPage() {
  const { data: session } = useSession()
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const isAdmin = session?.user?.role === "admin"

  useEffect(() => {
    fetchSongs()
  }, [search])

  const fetchSongs = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      const response = await fetch(`/api/songs?${params.toString()}`)
      
      if (!response.ok) {
        console.error("Error fetching songs:", response.status, response.statusText)
        setSongs([])
        return
      }
      
      const data = await response.json()
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setSongs(data)
      } else {
        console.error("Invalid response format:", data)
        setSongs([])
      }
    } catch (error) {
      console.error("Error fetching songs:", error)
      setSongs([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{isAdmin ? "Songs" : "My Songs"}</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Manage your song catalog" : "View songs you're a collaborator on"}
          </p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/songs/new">
            <Button>Add Song</Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <CardDescription>Search songs by title, ISRC, or catalog number</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {Array.isArray(songs) && songs.map((song) => (
          <Card key={song.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{song.title}</CardTitle>
                  <CardDescription>
                    {song.isrcCode && `ISRC: ${song.isrcCode}`}
                    {song.catalogNumber && ` • Catalog: ${song.catalogNumber}`}
                    {song.songCollaborators.length > 0 && (
                      ` • ${song.songCollaborators.length} collaborator${song.songCollaborators.length > 1 ? 's' : ''}`
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {song.publishingLocked && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      Publishing Locked
                    </span>
                  )}
                  {song.masterLocked && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                      Master Locked
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Link href={`/dashboard/songs/${song.id}`}>
                <Button variant="outline" className="w-full">
                  View Details
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {songs.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No songs found</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

