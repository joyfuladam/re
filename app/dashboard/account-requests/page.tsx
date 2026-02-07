"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface AccountRequest {
  id: string
  firstName: string
  lastName: string
  email: string
  status: string
  createdAt: string
  approvedAt?: string
  rejectedAt?: string
}

export default function AccountRequestsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [requests, setRequests] = useState<AccountRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("pending")

  useEffect(() => {
    if (session?.user?.role !== "admin") {
      router.push("/dashboard")
      return
    }
    fetchRequests()
  }, [session, filter])

  const fetchRequests = async () => {
    try {
      const response = await fetch(`/api/admin/account-requests?status=${filter}`)
      if (response.ok) {
        const data = await response.json()
        setRequests(data.requests)
      }
    } catch (error) {
      console.error("Error fetching requests:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    if (!confirm("Are you sure you want to approve this account request? An email will be sent to the user.")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/account-requests/${id}/approve`, {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        fetchRequests()
        alert("Account request approved! An email has been sent to the user.")
      } else if (response.status === 207 && data.approved) {
        // Partial success - approved but email failed
        fetchRequests()
        const copyLink = confirm(`${data.error}\n\nSetup link copied to clipboard. Would you like to manually send it to the user?`)
        if (copyLink) {
          navigator.clipboard.writeText(data.setupLink)
          alert("Setup link copied to clipboard!")
        }
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error("Error approving request:", error)
      alert("Failed to approve request")
    }
  }

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this account request?")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/account-requests/${id}/reject`, {
        method: "POST",
      })

      if (response.ok) {
        fetchRequests()
        alert("Account request rejected")
      } else {
        const data = await response.json()
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error("Error rejecting request:", error)
      alert("Failed to reject request")
    }
  }

  const handleResendEmail = async (id: string, email: string) => {
    if (!confirm(`Resend welcome email to ${email}? This will generate a new setup link.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/account-requests/${id}/resend-email`, {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Welcome email resent to ${email}!`)
      } else if (response.status === 207 && data.setupLink) {
        // Partial success - email failed but we have the link
        const copyLink = confirm(`${data.error}\n\nSetup link copied to clipboard. Would you like to manually send it?`)
        if (copyLink) {
          navigator.clipboard.writeText(data.setupLink)
          alert("Setup link copied to clipboard!")
        }
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error("Error resending email:", error)
      alert("Failed to resend welcome email")
    }
  }

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to delete the account request for ${email}? This cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/account-requests/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchRequests()
        alert("Account request deleted successfully")
      } else {
        const data = await response.json()
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error("Error deleting request:", error)
      alert("Failed to delete request")
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Account Requests</h1>
        <p className="text-muted-foreground">Review and manage account requests</p>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          onClick={() => setFilter("pending")}
        >
          Pending
        </Button>
        <Button
          variant={filter === "approved" ? "default" : "outline"}
          onClick={() => setFilter("approved")}
        >
          Approved
        </Button>
        <Button
          variant={filter === "rejected" ? "default" : "outline"}
          onClick={() => setFilter("rejected")}
        >
          Rejected
        </Button>
        <Button
          variant={filter === "" ? "default" : "outline"}
          onClick={() => setFilter("")}
        >
          All
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No {filter || "account"} requests found
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>
                      {request.firstName} {request.lastName}
                    </CardTitle>
                    <CardDescription>{request.email}</CardDescription>
                  </div>
                  <Badge
                    variant={
                      request.status === "approved"
                        ? "default"
                        : request.status === "rejected"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {request.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    <strong>Requested:</strong>{" "}
                    {new Date(request.createdAt).toLocaleDateString()} at{" "}
                    {new Date(request.createdAt).toLocaleTimeString()}
                  </div>
                  {request.approvedAt && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Approved:</strong>{" "}
                      {new Date(request.approvedAt).toLocaleDateString()} at{" "}
                      {new Date(request.approvedAt).toLocaleTimeString()}
                    </div>
                  )}
                  {request.rejectedAt && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Rejected:</strong>{" "}
                      {new Date(request.rejectedAt).toLocaleDateString()} at{" "}
                      {new Date(request.rejectedAt).toLocaleTimeString()}
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    {request.status === "pending" && (
                      <>
                        <Button
                          onClick={() => handleApprove(request.id)}
                          size="sm"
                        >
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleReject(request.id)}
                          variant="destructive"
                          size="sm"
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {request.status === "approved" && (
                      <Button
                        onClick={() => handleResendEmail(request.id, request.email)}
                        variant="secondary"
                        size="sm"
                      >
                        Resend Welcome Email
                      </Button>
                    )}
                    <Button
                      onClick={() => handleDelete(request.id, request.email)}
                      variant="outline"
                      size="sm"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
