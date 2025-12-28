import { CollaboratorRole, ContractType, ContractStatus, SplitType } from '@prisma/client'

// MasterRevenueScope is defined in schema but not exported by Prisma Client, define manually
export type MasterRevenueScope = 'digital_only' | 'full'

export type { CollaboratorRole, ContractType, ContractStatus, SplitType }

export interface CollaboratorWithRole {
  id: string
  name: string
  email: string | null
  role: CollaboratorRole
  publishingEligible: boolean
  masterEligible: boolean
  masterRevenueScope: MasterRevenueScope | null
}

export interface SongWithCollaborators {
  id: string
  title: string
  isrcCode: string | null
  publishingLocked: boolean
  masterLocked: boolean
  songCollaborators: Array<{
    id: string
    collaborator: CollaboratorWithRole
    publishingOwnership: number | null
    masterOwnership: number | null
    roleInSong: CollaboratorRole
  }>
}

export interface SplitEditorData {
  collaboratorId: string
  collaboratorName: string
  role: CollaboratorRole
  publishingOwnership: number | null
  masterOwnership: number | null
  isEligible: boolean
}

