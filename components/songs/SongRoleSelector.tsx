"use client"

import { CollaboratorRole } from "@prisma/client"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

interface SongRoleSelectorProps {
  value: CollaboratorRole[]
  onValueChange: (roles: CollaboratorRole[]) => void
  disabled?: boolean
  availableRoles?: CollaboratorRole[] // Roles the collaborator is capable of
}

const roleLabels: Record<CollaboratorRole, string> = {
  musician: "Musician",
  writer: "Writer (Songwriter)",
  producer: "Producer",
  artist: "Artist",
  label: "River & Ember (Label)",
}

const roleDescriptions: Record<CollaboratorRole, string> = {
  musician: "Session musicians, instrumentalists, background vocalists",
  writer: "Songwriters, lyricists, composers",
  producer: "Music producers, arrangers, creative directors",
  artist: "Recording artist, performer, lead vocalist",
  label: "Record label - always available as a system role",
}

export function SongRoleSelector({ 
  value, 
  onValueChange, 
  disabled,
  availableRoles 
}: SongRoleSelectorProps) {
  // If availableRoles provided, use those + label. Otherwise, show all.
  const rolesToShow: CollaboratorRole[] = availableRoles 
    ? [...availableRoles, "label"]
    : ["musician", "writer", "producer", "artist", "label"]

  const handleRoleToggle = (role: CollaboratorRole) => {
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
      <Label>Roles on This Song *</Label>
      <p className="text-sm text-muted-foreground">
        Select all roles this collaborator will have on this song. You can select multiple roles.
      </p>
      <div className="space-y-3 mt-3">
        {rolesToShow.map((role) => (
          <div key={role} className="flex items-start space-x-3">
            <Checkbox
              id={`song-role-${role}`}
              checked={value.includes(role)}
              onCheckedChange={() => handleRoleToggle(role)}
              disabled={disabled}
            />
            <div className="flex flex-col space-y-1">
              <label
                htmlFor={`song-role-${role}`}
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

