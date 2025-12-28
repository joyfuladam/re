"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { isMasterEligible } from "@/lib/roles"
import { CollaboratorRole } from "@prisma/client"

interface SongCollaborator {
  id: string
  collaborator: {
    id: string
    firstName?: string
    middleName?: string | null
    lastName?: string
    name?: string // Keep for backwards compatibility, but prefer firstName/lastName
    role?: CollaboratorRole // This is actually UserRole from the model, but we use roleInSong instead
    masterEligible?: boolean
  }
  masterOwnership: number | null
  roleInSong: CollaboratorRole | null | undefined
}

interface MasterSplitEditorProps {
  songId: string
  songCollaborators: SongCollaborator[]
  labelMasterShare?: number | null // Label share from Song model (0-100 percentage)
  isLocked: boolean
  publishingLocked: boolean
  onUpdate: () => void
}

export function MasterSplitEditor({
  songId,
  songCollaborators,
  labelMasterShare,
  isLocked,
  publishingLocked,
  onUpdate,
}: MasterSplitEditorProps) {
  const { data: session } = useSession()
  const [splits, setSplits] = useState<Record<string, number>>({})
  const [labelShare, setLabelShare] = useState<number>(0)
  const [showLabel, setShowLabel] = useState<boolean>(false)
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const isAdmin = session?.user?.role === "admin"
  const isReadOnly = !isAdmin // Collaborators can only view, not edit

  // Initialize splits from songCollaborators - key by songCollaborator.id to support multiple roles per collaborator
  useEffect(() => {
    const initialSplits: Record<string, number> = {}
    songCollaborators
      .filter((sc) => isMasterEligible(sc.roleInSong) && sc.roleInSong !== "label")
      .forEach((sc) => {
        // masterOwnership is already in percentage form (0-100) from the song detail page
        initialSplits[sc.id] = sc.masterOwnership || 0
      })
    setSplits(initialSplits)
    
    // Initialize label share from prop (0-100 percentage)
    // labelMasterShare is already in percentage form (0-100) from the song detail page
    const initialLabelShare = labelMasterShare !== null && labelMasterShare !== undefined
      ? labelMasterShare
      : 0
    setLabelShare(initialLabelShare)
    setShowLabel(initialLabelShare > 0)
  }, [songCollaborators, labelMasterShare])

  // Use roleInSong for eligibility, not the collaborator's base role
  // Exclude label - it's handled separately
  const eligibleCollaborators = songCollaborators.filter((sc) =>
    isMasterEligible(sc.roleInSong) && sc.roleInSong !== "label"
  )
  
  // Helper function to get role label
  const getRoleLabel = (role: CollaboratorRole | null | undefined): string => {
    if (!role) return "Unknown"
    const roleStr = String(role)
    switch (roleStr) {
      case "writer": return "Writer"
      case "producer": return "Producer"
      case "musician": return "Musician"
      case "artist": return "Artist"
      case "label": return "Label"
      default: return roleStr
    }
  }

  // Calculate total including label share
  const collaboratorTotal = Object.values(splits).reduce((sum, val) => sum + val, 0)
  const total = collaboratorTotal + labelShare
  const isValid = Math.abs(total - 100) < 0.01

  const handleSplitChange = (songCollaboratorId: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setSplits({ ...splits, [songCollaboratorId]: numValue })
    setErrors([])
  }

  const handleLabelShareChange = (value: string) => {
    const numValue = parseFloat(value) || 0
    setLabelShare(numValue)
    setErrors([])
  }

  const handleAddLabel = () => {
    setShowLabel(true)
    setLabelShare(0)
  }

  const handleRemoveLabel = () => {
    setShowLabel(false)
    setLabelShare(0)
  }

  const handleSave = async () => {
    setErrors([])
    setLoading(true)

    if (!isValid) {
      setErrors([`Total must equal 100%. Current total: ${total.toFixed(2)}%`])
      setLoading(false)
      return
    }

    try {
      // Build splits array for collaborators
      const splitsArray = Object.entries(splits).map(([songCollaboratorId, percentage]) => {
        return {
          songCollaboratorId,
          percentage,
        }
      })

      // Save collaborator splits - include label share in request for validation
      const collaboratorResponse = await fetch("/api/splits/master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songId,
          splits: splitsArray,
          labelMasterShare: showLabel ? labelShare : 0, // Include label share for validation
        }),
      })

      if (!collaboratorResponse.ok) {
        const errorData = await collaboratorResponse.json()
        let errorMessage = errorData.error || "Failed to save collaborator splits"
        if (errorData.details) {
          if (typeof errorData.details === 'string') {
            errorMessage += ": " + errorData.details
          } else if (Array.isArray(errorData.details)) {
            errorMessage += ": " + errorData.details.map((e: any) => e.message || e).join("; ")
          } else {
            errorMessage += ": " + JSON.stringify(errorData.details)
          }
        }
        throw new Error(errorMessage)
      }

      // Save label share separately
      const labelResponse = await fetch(`/api/songs/${songId}/label-share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labelMasterShare: showLabel ? labelShare : 0,
        }),
      })

      if (!labelResponse.ok) {
        const error = await labelResponse.json()
        throw new Error(error.error || "Failed to save label share")
      }

      onUpdate()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save splits"
      setErrors([errorMessage])
      console.error("Error saving master splits:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLock = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/splits/master", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId, action: "lock" }),
      })

      if (response.ok) {
        onUpdate()
      } else {
        const error = await response.json()
        setErrors([error.error || "Failed to lock splits"])
      }
    } catch (error) {
      setErrors(["Failed to lock splits"])
    } finally {
      setLoading(false)
    }
  }

  const handleUnlock = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/splits/master", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId, action: "unlock" }),
      })

      if (response.ok) {
        onUpdate()
      } else {
        const error = await response.json()
        setErrors([error.error || "Failed to unlock splits"])
      }
    } catch (error) {
      setErrors(["Failed to unlock splits"])
    } finally {
      setLoading(false)
    }
  }

  if (!publishingLocked) {
    return (
      <div className="text-sm text-muted-foreground">
        Publishing splits must be locked before master splits can be set.
      </div>
    )
  }

  if (isLocked || isReadOnly) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {isLocked 
              ? "Master splits are locked and cannot be modified."
              : "You can view splits but only admins can edit them."}
          </div>
          {isLocked && isAdmin && (
            <Button onClick={handleUnlock} disabled={loading} variant="outline" size="sm">
              Unlock Splits
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {eligibleCollaborators.map((sc) => {
            const roleLabel = getRoleLabel(sc.roleInSong)
            const fullName = [sc.collaborator.firstName, sc.collaborator.middleName, sc.collaborator.lastName]
              .filter(Boolean)
              .join(" ")
            return (
              <div key={sc.id} className="flex items-center justify-between p-2 border rounded">
                <span>
                  {fullName} <span className="text-muted-foreground">({roleLabel})</span>
                </span>
                <span className="font-medium">
                  {sc.masterOwnership ? sc.masterOwnership.toFixed(2) : 0}%
                </span>
              </div>
            )
          })}
        </div>
        
        {/* Label Share Section */}
        {labelMasterShare !== null && labelMasterShare !== undefined && labelMasterShare > 0 && (
          <div className="space-y-2 border-t pt-4 mt-4">
            <h4 className="text-sm font-medium">River & Ember (Label)</h4>
            <div className="flex items-center justify-between p-2 border rounded">
              <span>River & Ember</span>
              <span className="font-medium">
                {labelMasterShare !== null && labelMasterShare !== undefined
                  ? labelMasterShare.toFixed(2)
                  : 0}%
              </span>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Collaborator Splits */}
      {eligibleCollaborators.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Collaborators</h4>
            {eligibleCollaborators.map((sc) => {
              const roleLabel = getRoleLabel(sc.roleInSong)
              const fullName = [sc.collaborator.firstName, sc.collaborator.middleName, sc.collaborator.lastName]
                .filter(Boolean)
                .join(" ")
              return (
                <div key={sc.id} className="space-y-1">
                  <Label htmlFor={`split-${sc.id}`}>
                    {fullName} <span className="text-muted-foreground">({roleLabel})</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`split-${sc.id}`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={splits[sc.id] || 0}
                      onChange={(e) => handleSplitChange(sc.id, e.target.value)}
                      disabled={loading}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Label Share Section */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">River & Ember (Label)</h4>
          {!showLabel ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLabel}
              disabled={loading}
            >
              Add Label
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveLabel}
              disabled={loading}
            >
              Remove
            </Button>
          )}
        </div>

        {showLabel ? (
          <div className="space-y-1">
            <Label htmlFor="label-share">River & Ember</Label>
            <div className="flex items-center gap-2">
              <Input
                id="label-share"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={labelShare}
                onChange={(e) => handleLabelShareChange(e.target.value)}
                disabled={loading}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-secondary rounded-md text-center text-muted-foreground">
            <p className="text-sm">No label share added. Click &quot;Add Label&quot; to add River & Ember&apos;s share.</p>
          </div>
        )}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between p-2 bg-muted rounded">
        <div className="space-y-1">
          <span className="font-medium">Total:</span>
          <div className="text-xs text-muted-foreground">
            Collaborators: {collaboratorTotal.toFixed(2)}% • Label: {labelShare.toFixed(2)}%
          </div>
        </div>
        <span className={`font-bold ${isValid ? "text-green-600" : "text-red-600"}`}>
          {total.toFixed(2)}%
        </span>
      </div>

      {errors.length > 0 && (
        <div className="text-sm text-destructive">
          {errors.map((error, i) => (
            <div key={i}>{error}</div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={loading || !isValid}>
          Save
        </Button>
        <Button
          onClick={handleLock}
          disabled={loading || !isValid}
          variant="outline"
        >
          Lock Splits
        </Button>
      </div>
    </div>
  )
}

