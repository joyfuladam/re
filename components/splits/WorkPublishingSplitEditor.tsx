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

interface WorkCollaboratorRow {
  id: string
  collaborator: {
    id: string
    firstName?: string
    middleName?: string | null
    lastName?: string
  }
  publishingOwnership: number | null
  roleInWork: CollaboratorRole | null | undefined
}

interface PublishingEntity {
  id: string
  name: string
  isInternal: boolean
}

interface WorkPublishingEntityRow {
  id: string
  publishingEntity: PublishingEntity
  ownershipPercentage: number | null
}

interface WorkPublishingSplitEditorProps {
  workId: string
  workCollaborators: WorkCollaboratorRow[]
  workPublishingEntities?: WorkPublishingEntityRow[]
  isLocked: boolean
  onUpdate: () => void
}

export function WorkPublishingSplitEditor({
  workId,
  workCollaborators,
  workPublishingEntities = [],
  isLocked,
  onUpdate,
}: WorkPublishingSplitEditorProps) {
  const { data: session } = useSession()
  const [collaboratorSplits, setCollaboratorSplits] = useState<Record<string, number>>({})
  const [entitySplits, setEntitySplits] = useState<Record<string, number>>({})
  const [availableEntities, setAvailableEntities] = useState<PublishingEntity[]>([])
  const [newEntityId, setNewEntityId] = useState<string>("")
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const isAdmin = session?.user?.role === "admin"
  const isReadOnly = !isAdmin

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

  useEffect(() => {
    const initialCollaboratorSplits: Record<string, number> = {}
    workCollaborators
      .filter((wc) => isPublishingEligible(wc.roleInWork))
      .forEach((wc) => {
        initialCollaboratorSplits[wc.id] = wc.publishingOwnership || 0
      })
    setCollaboratorSplits(initialCollaboratorSplits)

    const initialEntitySplits: Record<string, number> = {}
    workPublishingEntities.forEach((wpe) => {
      initialEntitySplits[wpe.publishingEntity.id] = wpe.ownershipPercentage || 0
    })
    setEntitySplits(initialEntitySplits)
  }, [workCollaborators, workPublishingEntities])

  const getRoleLabel = (role: CollaboratorRole | null | undefined): string => {
    if (!role) return "Unknown"
    const roleStr = String(role)
    switch (roleStr) {
      case "writer":
        return "Writer"
      case "producer":
        return "Producer"
      case "musician":
        return "Musician"
      case "artist":
        return "Artist"
      case "label":
        return "Label"
      default:
        return roleStr
    }
  }

  const eligibleCollaborators = workCollaborators.filter((wc) => {
    const isEligible = isPublishingEligible(wc.roleInWork)
    const roleString = wc.roleInWork ? String(wc.roleInWork) : ""
    if (
      roleString === "artist" &&
      (!wc.publishingOwnership || wc.publishingOwnership === 0)
    ) {
      return false
    }
    return isEligible
  })

  const collaboratorTotal = Object.values(collaboratorSplits).reduce((sum, val) => sum + val, 0)
  const entityTotal = Object.values(entitySplits).reduce((sum, val) => sum + val, 0)
  const total = collaboratorTotal + entityTotal
  const isValid =
    Math.abs(collaboratorTotal - 50) < 0.01 && Math.abs(entityTotal - 50) < 0.01

  const handleCollaboratorSplitChange = (workCollaboratorId: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setCollaboratorSplits({ ...collaboratorSplits, [workCollaboratorId]: numValue })
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

    const forValidation = Object.entries(collaboratorSplits)
      .map(([workCollaboratorId, percentage]) => {
        const wc = workCollaborators.find((w) => w.id === workCollaboratorId)
        if (!wc || !wc.roleInWork) return null
        return {
          collaboratorId: wc.collaborator.id,
          role: wc.roleInWork,
          percentage,
          workCollaboratorId,
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
      collaborators: forValidation.map(({ collaboratorId, role, percentage }) => ({
        collaboratorId,
        role,
        percentage,
      })),
      entities: entitySplitsArray,
    })

    if (!validation.isValid) {
      setErrors(validation.errors.map((e) => e.message))
      setLoading(false)
      return
    }

    try {
      const collaboratorResponse = await fetch(`/api/works/${workId}/publishing-splits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          splits: forValidation.map(({ workCollaboratorId, percentage }) => ({
            workCollaboratorId,
            percentage,
          })),
        }),
      })

      if (!collaboratorResponse.ok) {
        const error = await collaboratorResponse.json()
        throw new Error(error.error || "Failed to save collaborator splits")
      }

      const entityResponse = await fetch(`/api/works/${workId}/publishing-entities`, {
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
      setErrors([error instanceof Error ? error.message : "Failed to save splits"])
    } finally {
      setLoading(false)
    }
  }

  const handleLock = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/works/${workId}/publishing-lock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lock" }),
      })

      if (response.ok) {
        onUpdate()
      } else {
        const error = await response.json()
        setErrors([error.error || "Failed to lock splits"])
      }
    } catch {
      setErrors(["Failed to lock splits"])
    } finally {
      setLoading(false)
    }
  }

  const getEntityName = (entityId: string) => {
    const entity = availableEntities.find((e) => e.id === entityId)
    return entity?.name || entityId
  }

  const availableToAdd = availableEntities.filter(
    (e) => !Object.keys(entitySplits).includes(e.id)
  )

  const handleUnlock = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/works/${workId}/publishing-lock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlock" }),
      })

      if (response.ok) {
        onUpdate()
      } else {
        const error = await response.json()
        setErrors([error.error || "Failed to unlock splits"])
      }
    } catch {
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

        {eligibleCollaborators.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              Collaborators (Writer&apos;s Share - must total 50%)
            </h4>
            {eligibleCollaborators.map((wc) => {
              const roleLabel = getRoleLabel(wc.roleInWork)
              const fullName = [wc.collaborator.firstName, wc.collaborator.middleName, wc.collaborator.lastName]
                .filter(Boolean)
                .join(" ")
              return (
                <div key={wc.id} className="flex items-center justify-between p-2 border rounded">
                  <span>
                    {fullName} <span className="text-muted-foreground">({roleLabel})</span>
                  </span>
                  <span className="font-medium">
                    {wc.publishingOwnership?.toFixed(2) || 0}%
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {workPublishingEntities.length > 0 && (
          <div className="space-y-2 border-t pt-4 mt-4">
            <h4 className="text-sm font-medium">
              Publishing Entities (Publisher&apos;s Share - must total 50%)
            </h4>
            {workPublishingEntities.map((wpe) => (
              <div key={wpe.id} className="flex items-center justify-between p-2 border rounded">
                <span>{wpe.publishingEntity.name}</span>
                <span className="font-medium">
                  {wpe.ownershipPercentage !== null && wpe.ownershipPercentage !== undefined
                    ? wpe.ownershipPercentage.toFixed(2)
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
      {eligibleCollaborators.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Collaborators (Writer&apos;s Share - must total 50%)</h4>
            {eligibleCollaborators.map((wc) => {
              const roleLabel = getRoleLabel(wc.roleInWork)
              const fullName = [wc.collaborator.firstName, wc.collaborator.middleName, wc.collaborator.lastName]
                .filter(Boolean)
                .join(" ")
              return (
                <div key={wc.id} className="space-y-1">
                  <Label htmlFor={`wsplit-${wc.id}`}>
                    {fullName} <span className="text-muted-foreground">({roleLabel})</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`wsplit-${wc.id}`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={collaboratorSplits[wc.id] || 0}
                      onChange={(e) => handleCollaboratorSplitChange(wc.id, e.target.value)}
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
                  <Label htmlFor={`wentity-${entityId}`}>{getEntityName(entityId)}</Label>
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
                    id={`wentity-${entityId}`}
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
                ? "No publishing entities added. Use the dropdown above to add one."
                : "No publishing entities added. Create publishing entities first to add them here."}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between p-2 bg-muted rounded">
        <div className="space-y-1">
          <span className="font-medium">Total:</span>
          <div className="text-xs text-muted-foreground">
            Writer&apos;s Share: {collaboratorTotal.toFixed(2)}% (must be 50%) • Publisher&apos;s Share:{" "}
            {entityTotal.toFixed(2)}% (must be 50%)
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
