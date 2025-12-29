"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CollaboratorRole } from "@prisma/client"
import { MultiRoleSelector } from "@/components/collaborators/MultiRoleSelector"

interface Collaborator {
  id: string
  firstName: string
  middleName: string | null
  lastName: string
  email: string | null
  phone: string | null
  address: string | null
  capableRoles: CollaboratorRole[]
  proAffiliation: string | null
  ipiNumber: string | null
  publishingCompany: string | null
  managerName: string | null
  managerEmail: string | null
  managerPhone: string | null
  royaltyAccountInfo: string | null
  notes: string | null
  status: string
}

export default function CollaboratorDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const [collaborator, setCollaborator] = useState<Collaborator | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    capableRoles: [] as CollaboratorRole[],
    proAffiliation: "",
    ipiNumber: "",
    publishingCompany: "",
    managerName: "",
    managerEmail: "",
    managerPhone: "",
    royaltyAccountInfo: "",
    notes: "",
    password: "",
  })

  const isAdmin = session?.user?.role === "admin"

  useEffect(() => {
    if (params.id) {
      fetchCollaborator()
    }
  }, [params.id])

  const fetchCollaborator = async () => {
    try {
      const response = await fetch(`/api/collaborators/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setCollaborator(data)
        setFormData({
          firstName: data.firstName || "",
          middleName: data.middleName || "",
          lastName: data.lastName || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          capableRoles: data.capableRoles || [],
          proAffiliation: data.proAffiliation || "",
          ipiNumber: data.ipiNumber || "",
          publishingCompany: data.publishingCompany || "",
          managerName: data.managerName || "",
          managerEmail: data.managerEmail || "",
          managerPhone: data.managerPhone || "",
          royaltyAccountInfo: data.royaltyAccountInfo || "",
          notes: data.notes || "",
        })
      } else if (response.status === 404) {
        router.push("/dashboard/collaborators")
      }
    } catch (error) {
      console.error("Error fetching collaborator:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: any = {
        firstName: formData.firstName.trim(),
        middleName: formData.middleName?.trim() || null,
        lastName: formData.lastName.trim(),
        email: formData.email?.trim() || null,
        phone: formData.phone?.trim() || null,
        address: formData.address?.trim() || null,
        capableRoles: formData.capableRoles,
        proAffiliation: formData.proAffiliation?.trim() || null,
        ipiNumber: formData.ipiNumber?.trim() || null,
        publishingCompany: formData.publishingCompany?.trim() || null,
        managerName: formData.managerName?.trim() || null,
        managerEmail: formData.managerEmail?.trim() || null,
        managerPhone: formData.managerPhone?.trim() || null,
        royaltyAccountInfo: formData.royaltyAccountInfo?.trim() || null,
        notes: formData.notes?.trim() || null,
      }
      
      // Only include password if admin is changing it
      if (isAdmin && formData.password.trim()) {
        payload.password = formData.password.trim()
      }

      const response = await fetch(`/api/collaborators/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setEditing(false)
        setFormData({ ...formData, password: "" })
        fetchCollaborator()
      } else {
        let errorData
        try {
          errorData = await response.json()
        } catch (e) {
          // If response is not JSON, get text
          const text = await response.text()
          console.error("Non-JSON error response:", text)
          alert(`Error: ${response.status} ${response.statusText}\n${text}`)
          return
        }
        
        console.error("Error response data:", errorData)
        
        let errorMessage = errorData.error || "Failed to update collaborator"
        
        // Handle Zod validation errors (array format)
        if (Array.isArray(errorData.error)) {
          errorMessage = "Validation errors:\n" + errorData.error.map((e: any) => 
            `${e.path?.join('.') || 'field'}: ${e.message || e}`
          ).join("\n")
        } else if (errorData.details) {
          // Handle new format with details array
          if (Array.isArray(errorData.details)) {
            errorMessage = "Validation errors:\n" + errorData.details.map((e: any) => 
              `${e.path || 'field'}: ${e.message || e}`
            ).join("\n")
          } else {
            errorMessage += "\n\nDetails: " + (typeof errorData.details === 'string' 
              ? errorData.details 
              : JSON.stringify(errorData.details, null, 2))
          }
        } else if (typeof errorData.error === 'object' && errorData.error !== null) {
          errorMessage = JSON.stringify(errorData.error, null, 2)
        }
        
        alert(`Error: ${errorMessage}`)
      }
    } catch (error) {
      console.error("Error updating collaborator:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to update collaborator"
      alert(`Error: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!collaborator) {
    return <div>Collaborator not found</div>
  }

  const fullName = [collaborator.firstName, collaborator.middleName, collaborator.lastName]
    .filter(Boolean)
    .join(" ")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{fullName}</h1>
          <p className="text-muted-foreground">
            {collaborator.email && `Email: ${collaborator.email}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/collaborators">
            <Button variant="outline">Back</Button>
          </Link>
          <Button onClick={() => setEditing(!editing)}>
            {editing ? "Cancel" : "Edit"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Basic contact and identity information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                disabled={!editing}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="middleName">Middle Name</Label>
              <Input
                id="middleName"
                value={formData.middleName}
                onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                disabled={!editing}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              disabled={!editing}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!editing}
            />
          </div>
          {isAdmin && editing && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Leave blank to keep current password"
                  disabled={!editing}
                />
                {formData.password && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({ ...formData, password: "" })}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave blank to keep the current password, or enter a new password to change it
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={!editing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              disabled={!editing}
            />
          </div>
          {editing && (
            <div className="space-y-2">
              <MultiRoleSelector
                value={formData.capableRoles}
                onValueChange={(roles) => setFormData({ ...formData, capableRoles: roles })}
              />
            </div>
          )}
          {!editing && collaborator.capableRoles.length > 0 && (
            <div className="space-y-2">
              <Label>Capable Roles</Label>
              <div className="flex flex-wrap gap-2">
                {collaborator.capableRoles.map((role) => (
                  <span key={role} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Industry Information</CardTitle>
          <CardDescription>Professional and publishing details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="proAffiliation">PRO Affiliation</Label>
            <Input
              id="proAffiliation"
              value={formData.proAffiliation}
              onChange={(e) => setFormData({ ...formData, proAffiliation: e.target.value })}
              disabled={!editing}
              placeholder="ASCAP, BMI, SESAC"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ipiNumber">IPI Number</Label>
            <Input
              id="ipiNumber"
              value={formData.ipiNumber}
              onChange={(e) => setFormData({ ...formData, ipiNumber: e.target.value })}
              disabled={!editing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="publishingCompany">Publishing Company</Label>
            <Input
              id="publishingCompany"
              value={formData.publishingCompany}
              onChange={(e) => setFormData({ ...formData, publishingCompany: e.target.value })}
              disabled={!editing}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manager Information</CardTitle>
          <CardDescription>Manager contact details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="managerName">Manager Name</Label>
            <Input
              id="managerName"
              value={formData.managerName}
              onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
              disabled={!editing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="managerEmail">Manager Email</Label>
            <Input
              id="managerEmail"
              type="email"
              value={formData.managerEmail}
              onChange={(e) => setFormData({ ...formData, managerEmail: e.target.value })}
              disabled={!editing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="managerPhone">Manager Phone</Label>
            <Input
              id="managerPhone"
              value={formData.managerPhone}
              onChange={(e) => setFormData({ ...formData, managerPhone: e.target.value })}
              disabled={!editing}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="royaltyAccountInfo">Royalty Account Info</Label>
            <Input
              id="royaltyAccountInfo"
              value={formData.royaltyAccountInfo}
              onChange={(e) => setFormData({ ...formData, royaltyAccountInfo: e.target.value })}
              disabled={!editing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              className="w-full min-h-[100px] p-2 border rounded-md"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={!editing}
            />
          </div>
        </CardContent>
      </Card>

      {editing && (
        <div className="flex gap-4">
          <Button onClick={handleSave} disabled={saving || !formData.firstName || !formData.lastName || formData.capableRoles.length === 0}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button variant="outline" onClick={() => { setEditing(false); fetchCollaborator(); }}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}

