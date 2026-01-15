"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface FaqSubmission {
  id: string
  name: string
  email: string
  subject: string
  message: string
  read: boolean
  readAt: string | null
  readBy: string | null
  createdAt: string
}

export default function FaqSubmissionsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [submissions, setSubmissions] = useState<FaqSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all")
  const [updating, setUpdating] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user?.role !== "admin") {
      router.push("/dashboard")
      return
    }
    fetchSubmissions()
  }, [session, filter, router])

  const fetchSubmissions = async () => {
    try {
      const response = await fetch(`/api/faq/submissions?filter=${filter}`)
      if (response.ok) {
        const data = await response.json()
        setSubmissions(data.submissions || [])
      }
    } catch (error) {
      console.error("Error fetching submissions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (id: string, currentRead: boolean) => {
    setUpdating(id)
    try {
      const response = await fetch(`/api/faq/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: !currentRead }),
      })

      if (response.ok) {
        fetchSubmissions()
      } else {
        alert("Failed to update submission")
      }
    } catch (error) {
      console.error("Error updating submission:", error)
      alert("Failed to update submission")
    } finally {
      setUpdating(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this submission?")) {
      return
    }

    setDeleting(id)
    try {
      const response = await fetch(`/api/faq/submissions/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchSubmissions()
      } else {
        alert("Failed to delete submission")
      }
    } catch (error) {
      console.error("Error deleting submission:", error)
      alert("Failed to delete submission")
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  const unreadCount = submissions.filter((s) => !s.read).length
  const readCount = submissions.filter((s) => s.read).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">FAQ Submissions</h1>
        <p className="text-muted-foreground mt-2">
          View and manage questions submitted by collaborators
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          All ({submissions.length})
        </Button>
        <Button
          variant={filter === "unread" ? "default" : "outline"}
          onClick={() => setFilter("unread")}
        >
          Unread ({unreadCount})
        </Button>
        <Button
          variant={filter === "read" ? "default" : "outline"}
          onClick={() => setFilter("read")}
        >
          Read ({readCount})
        </Button>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              {filter === "all"
                ? "No submissions yet"
                : filter === "unread"
                ? "No unread submissions"
                : "No read submissions"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <Card key={submission.id} className={!submission.read ? "border-l-4 border-l-blue-500" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{submission.subject}</CardTitle>
                      {!submission.read && (
                        <Badge variant="default">New</Badge>
                      )}
                      {submission.read && (
                        <Badge variant="secondary">Read</Badge>
                      )}
                    </div>
                    <CardDescription>
                      From: {submission.name} ({submission.email})
                    </CardDescription>
                    <CardDescription>
                      Submitted: {new Date(submission.createdAt).toLocaleString()}
                    </CardDescription>
                    {submission.read && submission.readAt && (
                      <CardDescription>
                        Read: {new Date(submission.readAt).toLocaleString()}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkAsRead(submission.id, submission.read)}
                      disabled={updating === submission.id}
                    >
                      {updating === submission.id
                        ? "Updating..."
                        : submission.read
                        ? "Mark Unread"
                        : "Mark Read"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(submission.id)}
                      disabled={deleting === submission.id}
                    >
                      {deleting === submission.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm">{submission.message}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
