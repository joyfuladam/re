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

  const publishing = publishingOwnership ? parseFloat(publishingOwnership.toString()) : 0
  const master = masterOwnership ? parseFloat(masterOwnership.toString()) : 0

  // Writer with publishing share > 0 → Publishing Assignment
  if (roleInSong === "writer" && publishing > 0) {
    contractTypes.push("songwriter_publishing")
  }

  // Artist with publishing share > 0 → Publishing Assignment
  if (roleInSong === "artist" && publishing > 0) {
    contractTypes.push("songwriter_publishing")
  }

  // Musician with master share > 0 → Master Participation Agreement
  if (roleInSong === "musician" && master > 0) {
    contractTypes.push("digital_master_only")
  }

  // Producer with master share > 0 → Producer Agreement
  if (roleInSong === "producer" && master > 0) {
    contractTypes.push("producer_agreement")
  }

  // Artist with master share > 0 → Master Participation Agreement (if not already added)
  if (roleInSong === "artist" && master > 0 && !contractTypes.includes("digital_master_only")) {
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

  return (
    (roleInSong === "writer" || roleInSong === "artist") && publishing > 0
  )
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
    digital_master_only: "Master Participation Agreement",
    producer_agreement: "Producer Agreement",
    label_record: "Label Record",
  }
  return labels[contractType] || contractType
}

