"use client"

import { CollaboratorRole } from "@prisma/client"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { getRoleConfiguration } from "@/lib/roles"

interface RoleSelectorProps {
  value: CollaboratorRole | undefined
  onValueChange: (value: CollaboratorRole) => void
  disabled?: boolean
}

const roleLabels: Record<CollaboratorRole, string> = {
  musician: "Musician",
  writer: "Writer (Songwriter)",
  producer: "Producer",
  artist: "Artist",
  vocalist: "Vocalist",
  label: "River & Ember (Label)",
}

export function RoleSelector({ value, onValueChange, disabled }: RoleSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="role">Role</Label>
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger id="role">
          <SelectValue placeholder="Select a role" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(roleLabels).map(([role, label]) => {
            const config = getRoleConfiguration(role as CollaboratorRole)
            return (
              <SelectItem key={role} value={role}>
                <div className="flex flex-col">
                  <span>{label}</span>
                  <span className="text-xs text-muted-foreground">
                    {config.publishingEligible && "Publishing eligible"}
                    {config.masterEligible && " • Master eligible"}
                    {config.masterRevenueScope === "digital_only" && " • Digital only"}
                  </span>
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}

