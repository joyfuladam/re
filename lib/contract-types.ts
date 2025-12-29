import { ContractType, CollaboratorRole } from "@prisma/client"
import { SongCollaborator } from "@prisma/client"

/**
 * Determine which contract types a collaborator needs based on their role and splits
 */
export function getRequiredContractTypes(
  songCollaborator: SongCollaborator
): ContractType[] {
  const contractTypes: ContractType[] = []
  const { roleInSong, publishingOwnership, masterOwnership } = songCollaborator

  // Parse ownership values - handle Prisma Decimal types
  // masterOwnership and publishingOwnership are stored as decimals (0-1)
  const publishing = publishingOwnership 
    ? parseFloat(publishingOwnership.toString()) 
    : 0
  const master = masterOwnership 
    ? parseFloat(masterOwnership.toString()) 
    : 0

  // Any collaborator with publishing share > 0 → Publishing Assignment
  // Publishing is stored as decimal (0-1), so check if > 0
  if (publishing > 0) {
    contractTypes.push("songwriter_publishing")
  }

  // Any collaborator with master share > 0 → Master Revenue Share Agreement
  // Master is stored as decimal (0-1), so check if > 0
  // This applies to ANY collaborator with a master split, regardless of role
  if (master > 0) {
    contractTypes.push("digital_master_only")
  }

  // Label → Internal record (typically not generated as a contract)
  // We can skip label contracts or handle them separately

  return contractTypes
}

/**
 * Check if a publishing assignment contract should be generated
 */
export function shouldGeneratePublishingAssignment(
  songCollaborator: SongCollaborator
): boolean {
  const { roleInSong, publishingOwnership } = songCollaborator
  const publishing = publishingOwnership ? parseFloat(publishingOwnership.toString()) : 0

  // Publishing assignment for any collaborator with publishing share
  return publishing > 0
}

/**
 * Check if a master participation agreement should be generated
 */
export function shouldGenerateMasterParticipation(
  songCollaborator: SongCollaborator
): boolean {
  const { roleInSong, masterOwnership } = songCollaborator
  const master = masterOwnership ? parseFloat(masterOwnership.toString()) : 0

  return (
    (roleInSong === "musician" || roleInSong === "artist") && master > 0
  )
}

/**
 * Check if a producer agreement should be generated
 */
export function shouldGenerateProducerAgreement(
  songCollaborator: SongCollaborator
): boolean {
  const { roleInSong, masterOwnership } = songCollaborator
  const master = masterOwnership ? parseFloat(masterOwnership.toString()) : 0

  return roleInSong === "producer" && master > 0
}

/**
 * Get contract type label for display
 */
export function getContractTypeLabel(contractType: ContractType): string {
  const labels: Record<ContractType, string> = {
    songwriter_publishing: "Publishing Assignment",
    digital_master_only: "Master Revenue Share Agreement",
    producer_agreement: "Producer Agreement",
    label_record: "Label Record",
  }
  return labels[contractType] || contractType
}

