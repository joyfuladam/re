"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { isPublishingEligible } from "@/lib/roles"
import { CollaboratorRole } from "@prisma/client"
import { validateCombinedPublishingSplits } from "@/lib/validators"

interface SongCollaborator {
  id: string
  collaborator: {
    id: string
    firstName?: string
    middleName?: string | null
    lastName?: string
    name?: string
    role?: CollaboratorRole
    publishingEligible?: boolean
  }
  publishingOwnership: number | null
  roleInSong: CollaboratorRole | null | undefined
}

interface PublishingEntity {
  id: string
  name: string
  isInternal: boolean
}

interface SongPublishingEntity {
  id: string
  publishingEntity: PublishingEntity
  ownershipPercentage: number | null
}

interface PublishingSplitEditorProps {
  songId: string
  songCollaborators: SongCollaborator[]
  songPublishingEntities?: SongPublishingEntity[]
  isLocked: boolean
  onUpdate: () => void
}

export function PublishingSplitEditor({
  songId,
  songCollaborators,
  songPublishingEntities = [],
  isLocked,
  onUpdate,
}: PublishingSplitEditorProps) {
  const { data: session } = useSession()
  const [collaboratorSplits, setCollaboratorSplits] = useState<Record<string, number>>({})
  const [entitySplits, setEntitySplits] = useState<Record<string, number>>({})
  const [availableEntities, setAvailableEntities] = useState<PublishingEntity[]>([])
  const [newEntityId, setNewEntityId] = useState<string>("")
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const isAdmin = session?.user?.role === "admin"
  const isReadOnly = !isAdmin

  // Fetch available publishing entities
  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const response = await fetch("/api/publishing-entities")
        if (response.ok) {
          const data = await response.json()
          setAvailableEntities(data)
        }
      } catch (error) {
        console.error("Error fetching publishing entities:", error)
      }
    }
    fetchEntities()
  }, [])

  // Initialize splits from props - key by songCollaborator.id to support multiple roles per collaborator
  useEffect(() => {
    const initialCollaboratorSplits: Record<string, number> = {}
    songCollaborators
      .filter((sc) => isPublishingEligible(sc.roleInSong))
      .forEach((sc) => {
        // Key by songCollaborator.id (unique per song+collaborator+role combination)
        initialCollaboratorSplits[sc.id] = sc.publishingOwnership || 0
      })
    setCollaboratorSplits(initialCollaboratorSplits)

    const initialEntitySplits: Record<string, number> = {}
    songPublishingEntities.forEach((spe) => {
      // ownershipPercentage is already in percentage form (0-100) from the song detail page
      initialEntitySplits[spe.publishingEntity.id] = spe.ownershipPercentage || 0
    })
    setEntitySplits(initialEntitySplits)
  }, [songCollaborators, songPublishingEntities])

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
  
  // Use roleInSong for eligibility - filter out artists with 0% publishing share
  const eligibleCollaborators = songCollaborators.filter((sc) => {
    const isEligible = isPublishingEligible(sc.roleInSong)
    // If artist with 0% publishing, don't show them in publishing splits
    // Check by string comparison to avoid type issues
    const roleString = sc.roleInSong ? String(sc.roleInSong) : ''
    if (roleString === 'artist' && (!sc.publishingOwnership || sc.publishingOwnership === 0)) {
      return false
    }
    return isEligible
  })

  // Calculate totals
  // Music industry standard: Writer's share = 50%, Publisher's share = 50%
  const collaboratorTotal = Object.values(collaboratorSplits).reduce((sum, val) => sum + val, 0)
  const entityTotal = Object.values(entitySplits).reduce((sum, val) => sum + val, 0)
  const total = collaboratorTotal + entityTotal
  // Both writer's share and publisher's share must be exactly 50%
  const isValid = Math.abs(collaboratorTotal - 50) < 0.01 && Math.abs(entityTotal - 50) < 0.01

  const handleCollaboratorSplitChange = (songCollaboratorId: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setCollaboratorSplits({ ...collaboratorSplits, [songCollaboratorId]: numValue })
    setErrors([])
  }

  const handleEntitySplitChange = (entityId: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setEntitySplits({ ...entitySplits, [entityId]: numValue })
    setErrors([])
  }

  const handleAddEntity = () => {
    if (newEntityId && !entitySplits[newEntityId]) {
      setEntitySplits({ ...entitySplits, [newEntityId]: 0 })
      setNewEntityId("")
    }
  }

  const handleRemoveEntity = (entityId: string) => {
    const newSplits = { ...entitySplits }
    delete newSplits[entityId]
    setEntitySplits(newSplits)
  }

  const handleSave = async () => {
    setErrors([])
    setLoading(true)

    // Validate using combined validation - use songCollaboratorId
    // We need to include role for validation, so fetch it from songCollaborators
    const collaboratorSplitsArray = Object.entries(collaboratorSplits)
      .map(([songCollaboratorId, percentage]) => {
        const sc = songCollaborators.find((s) => s.id === songCollaboratorId)
        if (!sc) {
          console.error(`SongCollaborator not found for ID: ${songCollaboratorId}`)
          return null
        }
        if (!sc.roleInSong) {
          console.error(`roleInSong is missing for SongCollaborator ID: ${songCollaboratorId}`, sc)
          return null
        }
        return {
          songCollaboratorId,
          collaboratorId: sc.collaborator.id,
          role: sc.roleInSong,
          percentage,
        }
      })
      .filter((split): split is NonNullable<typeof split> => split !== null)

    const entitySplitsArray = Object.entries(entitySplits).map(
      ([publishingEntityId, percentage]) => ({
        publishingEntityId,
        percentage,
      })
    )

    const validation = validateCombinedPublishingSplits({
      collaborators: collaboratorSplitsArray,
      entities: entitySplitsArray,
    })

    if (!validation.isValid) {
      setErrors(validation.errors.map((e) => e.message))
      setLoading(false)
      return
    }

    try {
      // Save collaborator splits - send only songCollaboratorId and percentage
      const collaboratorResponse = await fetch("/api/splits/publishing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songId,
          splits: collaboratorSplitsArray.map(({ songCollaboratorId, percentage }) => ({
            songCollaboratorId,
            percentage,
          })),
        }),
      })

      if (!collaboratorResponse.ok) {
        const error = await collaboratorResponse.json()
        throw new Error(error.error || "Failed to save collaborator splits")
      }

      // Save entity splits - API expects ownershipPercentage, not percentage
      const entityResponse = await fetch(`/api/songs/${songId}/publishing-entities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entities: entitySplitsArray.map(({ publishingEntityId, percentage }) => ({
            publishingEntityId,
            ownershipPercentage: percentage,
          })),
        }),
      })

      if (!entityResponse.ok) {
        const error = await entityResponse.json()
        throw new Error(error.error || "Failed to save entity splits")
      }

      onUpdate()
    } catch (error) {
      setErrors([
        error instanceof Error ? error.message : "Failed to save splits",
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleLock = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/splits/publishing", {
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

  // Get entity name by ID
  const getEntityName = (entityId: string) => {
    const entity = availableEntities.find((e) => e.id === entityId)
    return entity?.name || entityId
  }

  // Get entities not yet added
  const availableToAdd = availableEntities.filter(
    (e) => !Object.keys(entitySplits).includes(e.id)
  )

  const handleUnlock = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/splits/publishing", {
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

  if (isLocked || isReadOnly) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {isLocked
              ? "Publishing splits are locked and cannot be modified."
              : "You can view splits but only admins can edit them."}
          </div>
          {isLocked && isAdmin && (
            <Button onClick={handleUnlock} disabled={loading} variant="outline" size="sm">
              Unlock Splits
            </Button>
          )}
        </div>

        {/* Collaborators */}
        {eligibleCollaborators.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Collaborators (Writer&apos;s Share - must total 50%)</h4>
            {eligibleCollaborators.map((sc) => {
              const roleLabel = getRoleLabel(sc.roleInSong)
              const fullName = [sc.collaborator.firstName, sc.collaborator.middleName, sc.collaborator.lastName]
                .filter(Boolean)
                .join(" ")
              return (
                <div
                  key={sc.id}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <span>
                    {fullName} <span className="text-muted-foreground">({roleLabel})</span>
                  </span>
                  <span className="font-medium">
                    {sc.publishingOwnership?.toFixed(2) || 0}%
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Publishing Entities */}
        {songPublishingEntities.length > 0 && (
          <div className="space-y-2 border-t pt-4 mt-4">
            <h4 className="text-sm font-medium">Publishing Entities (Publisher&apos;s Share - must total 50%)</h4>
            {songPublishingEntities.map((spe) => (
              <div
                key={spe.id}
                className="flex items-center justify-between p-2 border rounded"
              >
                <span>{spe.publishingEntity.name}</span>
                <span className="font-medium">
                  {spe.ownershipPercentage !== null && spe.ownershipPercentage !== undefined
                    ? spe.ownershipPercentage.toFixed(2)
                    : 0}
                  %
                </span>
              </div>
            ))}
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
                <h4 className="text-sm font-medium">Collaborators (Writer&apos;s Share - must total 50%)</h4>
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
                      value={collaboratorSplits[sc.id] || 0}
                      onChange={(e) =>
                        handleCollaboratorSplitChange(sc.id, e.target.value)
                      }
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

      {/* Publishing Entity Splits */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Publishing Entities (Publisher&apos;s Share - must total 50%)</h4>
          {availableToAdd.length > 0 && (
            <div className="flex items-center gap-2">
              <Select value={newEntityId} onValueChange={setNewEntityId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Add entity..." />
                </SelectTrigger>
                <SelectContent>
                  {availableToAdd.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddEntity}
                disabled={!newEntityId}
              >
                Add
              </Button>
            </div>
          )}
          {availableToAdd.length === 0 && availableEntities.length > 0 && (
            <p className="text-xs text-muted-foreground">All entities added</p>
          )}
          {availableEntities.length === 0 && (
            <p className="text-xs text-muted-foreground">No entities available</p>
          )}
        </div>

        {Object.keys(entitySplits).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(entitySplits).map(([entityId, percentage]) => (
              <div key={entityId} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`entity-${entityId}`}>{getEntityName(entityId)}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveEntity(entityId)}
                    disabled={loading}
                  >
                    Remove
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id={`entity-${entityId}`}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={percentage}
                    onChange={(e) => handleEntitySplitChange(entityId, e.target.value)}
                    disabled={loading}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 border rounded bg-muted/50">
            <p className="text-sm text-muted-foreground">
              {availableToAdd.length > 0
                ? 'No publishing entities added. Use the dropdown above to add one.'
                : 'No publishing entities added. Create publishing entities first to add them here.'}
            </p>
          </div>
        )}
      </div>

          {/* Total */}
          <div className="flex items-center justify-between p-2 bg-muted rounded">
            <div className="space-y-1">
              <span className="font-medium">Total:</span>
              <div className="text-xs text-muted-foreground">
                Writer&apos;s Share: {collaboratorTotal.toFixed(2)}% (must be 50%) • Publisher&apos;s Share: {entityTotal.toFixed(2)}% (must be 50%)
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
        <Button onClick={handleLock} disabled={loading || !isValid} variant="outline">
          Lock Splits
        </Button>
      </div>
    </div>
  )
}
