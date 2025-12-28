"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MultiRoleSelector } from "@/components/collaborators/MultiRoleSelector"
import { CollaboratorRole } from "@prisma/client"

export default function NewCollaboratorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    capableRoles: [] as CollaboratorRole[],
    proAffiliation: "",
    ipiNumber: "",
    taxId: "",
    publishingCompany: "",
    managerName: "",
    managerEmail: "",
    managerPhone: "",
    royaltyAccountInfo: "",
    notes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.firstName || formData.firstName.trim() === "") {
      alert("First name is required")
      return
    }
    
    if (!formData.lastName || formData.lastName.trim() === "") {
      alert("Last name is required")
      return
    }
    
    if (formData.capableRoles.length === 0) {
      alert("At least one role must be selected")
      return
    }
    
    setLoading(true)

    try {
      const payload: any = {
        firstName: formData.firstName.trim(),
        middleName: formData.middleName?.trim() || null,
        lastName: formData.lastName.trim(),
        capableRoles: formData.capableRoles,
        email: formData.email.trim() || null, // Optional - only needed for login accounts
        phone: formData.phone?.trim() || null,
        address: formData.address?.trim() || null,
        proAffiliation: formData.proAffiliation?.trim() || null,
        ipiNumber: formData.ipiNumber?.trim() || null,
        taxId: formData.taxId?.trim() || null,
        publishingCompany: formData.publishingCompany?.trim() || null,
        managerName: formData.managerName?.trim() || null,
        managerEmail: formData.managerEmail?.trim() || null,
        managerPhone: formData.managerPhone?.trim() || null,
        royaltyAccountInfo: formData.royaltyAccountInfo?.trim() || null,
        notes: formData.notes?.trim() || null,
      }
      
      // Only include password if provided (optional - only if creating login account)
      if (formData.password.trim()) {
        payload.password = formData.password.trim()
      }
      
      console.log("Submitting payload:", payload)
      
      const response = await fetch("/api/collaborators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        router.push("/dashboard/collaborators")
      } else {
        const errorData = await response.json()
        let errorMessage = errorData.error || "Failed to create collaborator"
        if (errorData.details) {
          if (Array.isArray(errorData.details)) {
            errorMessage += "\n\nDetails: " + JSON.stringify(errorData.details, null, 2)
          } else {
            errorMessage += "\n\nDetails: " + errorData.details
          }
        }
        console.error("Error creating collaborator:", errorData)
        alert(errorMessage)
      }
    } catch (error) {
      console.error("Error creating collaborator:", error)
      alert("Failed to create collaborator")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Collaborator</h1>
        <p className="text-muted-foreground">Add a new collaborator to the system</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collaborator Information</CardTitle>
          <CardDescription>Enter the collaborator&apos;s details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="middleName">Middle Name</Label>
                <Input
                  id="middleName"
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>

            <MultiRoleSelector
              value={formData.capableRoles}
              onValueChange={(roles) => setFormData({ ...formData, capableRoles: roles })}
            />

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Optional - only needed for login accounts"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password (optional, for login)</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Leave blank if no login account"
              />
              <p className="text-xs text-muted-foreground">
                Only required if creating a login account. Must be at least 6 characters.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            {(formData.capableRoles.includes("writer") || formData.capableRoles.includes("label")) && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="proAffiliation">PRO Affiliation</Label>
                  <Input
                    id="proAffiliation"
                    value={formData.proAffiliation}
                    onChange={(e) => setFormData({ ...formData, proAffiliation: e.target.value })}
                    placeholder="ASCAP, BMI, SESAC, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ipiNumber">IPI Number</Label>
                  <Input
                    id="ipiNumber"
                    value={formData.ipiNumber}
                    onChange={(e) => setFormData({ ...formData, ipiNumber: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID / SSN</Label>
              <Input
                id="taxId"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                type="password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="publishingCompany">Publishing Company</Label>
              <Input
                id="publishingCompany"
                value={formData.publishingCompany}
                onChange={(e) => setFormData({ ...formData, publishingCompany: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="managerName">Manager Name</Label>
              <Input
                id="managerName"
                value={formData.managerName}
                onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="managerEmail">Manager Email</Label>
              <Input
                id="managerEmail"
                type="email"
                value={formData.managerEmail}
                onChange={(e) => setFormData({ ...formData, managerEmail: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="managerPhone">Manager Phone</Label>
              <Input
                id="managerPhone"
                value={formData.managerPhone}
                onChange={(e) => setFormData({ ...formData, managerPhone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="royaltyAccountInfo">Royalty Account Info</Label>
              <Input
                id="royaltyAccountInfo"
                value={formData.royaltyAccountInfo}
                onChange={(e) => setFormData({ ...formData, royaltyAccountInfo: e.target.value })}
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
              <Button type="submit" disabled={loading || formData.capableRoles.length === 0}>
                {loading ? "Creating..." : "Create Collaborator"}
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

