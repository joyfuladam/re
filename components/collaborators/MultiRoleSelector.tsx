"use client"

import { CollaboratorRole } from "@prisma/client"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

interface MultiRoleSelectorProps {
  value: CollaboratorRole[]
  onValueChange: (roles: CollaboratorRole[]) => void
  disabled?: boolean
}

const roleLabels: Record<Exclude<CollaboratorRole, "label">, string> = {
  musician: "Musician",
  writer: "Writer (Songwriter)",
  producer: "Producer",
  artist: "Artist",
  vocalist: "Vocalist",
}

const roleDescriptions: Record<Exclude<CollaboratorRole, "label">, string> = {
  musician: "Session musicians, instrumentalists",
  writer: "Songwriters, lyricists, composers",
  producer: "Music producers, arrangers, creative directors",
  artist: "Recording artist, performer, lead vocalist",
  vocalist: "Background vocalist, harmony singer, session vocalist",
}

export function MultiRoleSelector({ value, onValueChange, disabled }: MultiRoleSelectorProps) {
  const availableRoles: Exclude<CollaboratorRole, "label">[] = ["musician", "writer", "producer", "artist", "vocalist"]

  const handleRoleToggle = (role: Exclude<CollaboratorRole, "label">) => {
    if (disabled) return

    if (value.includes(role)) {
      // Remove role
      onValueChange(value.filter((r) => r !== role))
    } else {
      // Add role
      onValueChange([...value, role])
    }
  }

  return (
    <div className="space-y-2">
      <Label>Capable Roles *</Label>
      <p className="text-sm text-muted-foreground">
        Select all roles this collaborator can perform. You can assign different roles when adding them to songs.
      </p>
      <div className="space-y-3 mt-3">
        {availableRoles.map((role) => (
          <div key={role} className="flex items-start space-x-3">
            <Checkbox
              id={`role-${role}`}
              checked={value.includes(role)}
              onCheckedChange={() => handleRoleToggle(role)}
              disabled={disabled}
            />
            <div className="flex flex-col space-y-1">
              <label
                htmlFor={`role-${role}`}
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {roleLabels[role]}
              </label>
              <p className="text-xs text-muted-foreground">{roleDescriptions[role]}</p>
            </div>
          </div>
        ))}
      </div>
      {value.length === 0 && (
        <p className="text-sm text-destructive">At least one role must be selected</p>
      )}
    </div>
  )
}

