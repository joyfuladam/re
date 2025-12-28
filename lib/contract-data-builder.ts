import { Song, SongCollaborator, Collaborator } from "@prisma/client"
import { ContractData } from "./pdf-generator"
import { ContractConfig, calculateInKindTotal } from "./config"

/**
 * Format a writers list showing all co-writers on a song with their publishing shares
 */
export function formatWritersList(
  songCollaborators: (SongCollaborator & { collaborator: Collaborator })[]
): string {
  // Filter to only writers with publishing ownership
  const writers = songCollaborators.filter(
    (sc) => (sc.roleInSong === "writer" || sc.roleInSong === "artist") && 
             sc.publishingOwnership && 
             parseFloat(sc.publishingOwnership.toString()) > 0
  )

  if (writers.length === 0) {
    return "N/A"
  }

  return writers
    .map((sc) => {
      const name = [
        sc.collaborator.firstName,
        sc.collaborator.middleName,
        sc.collaborator.lastName,
      ]
        .filter(Boolean)
        .join(" ")
      const share = sc.publishingOwnership
        ? (parseFloat(sc.publishingOwnership.toString()) * 100).toFixed(2)
        : "0"
      return `${name} (${share}%)`
    })
    .join(", ")
}

/**
 * Build contract data for a publishing assignment contract
 */
export async function buildPublishingAssignmentData(
  song: Song,
  writerCollaborator: SongCollaborator & { collaborator: Collaborator },
  allSongCollaborators: (SongCollaborator & { collaborator: Collaborator })[],
  config: ContractConfig
): Promise<ContractData> {
  const writerFullName = [
    writerCollaborator.collaborator.firstName,
    writerCollaborator.collaborator.middleName,
    writerCollaborator.collaborator.lastName,
  ]
    .filter(Boolean)
    .join(" ")

  const writersList = formatWritersList(allSongCollaborators)

  // Build composition object for single song
  const composition = {
    title: song.title,
    writers: writersList,
    isrc: song.isrcCode || null,
    notes: song.notes || null,
  }

  // Calculate in-kind services total
  const inKindServices = config.inKindServices
    ? {
        studioValue: config.inKindServices.studioValue || 0,
        adminValue: config.inKindServices.adminValue || 0,
        marketingValue: config.inKindServices.marketingValue || 0,
        alternativeVersionsValue: config.inKindServices.alternativeVersionsValue || 0,
        totalValue: calculateInKindTotal(config.inKindServices),
      }
    : undefined

  // Format dates
  const effectiveDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const releaseDate = song.releaseDate
    ? new Date(song.releaseDate).toISOString().split("T")[0]
    : null

  return {
    // Song-specific
    songTitle: song.title,
    isrcCode: song.isrcCode,
    catalogNumber: song.catalogNumber,
    releaseDate,

    // Collaborator-specific
    collaboratorName: writerFullName,
    collaboratorFullName: writerFullName,
    collaboratorEmail: writerCollaborator.collaborator.email,
    collaboratorAddress: writerCollaborator.collaborator.address || null,
    collaboratorPhone: writerCollaborator.collaborator.phone || null,
    role: writerCollaborator.roleInSong,
    publishingOwnership: writerCollaborator.publishingOwnership
      ? parseFloat(writerCollaborator.publishingOwnership.toString())
      : null,
    masterOwnership: writerCollaborator.masterOwnership
      ? parseFloat(writerCollaborator.masterOwnership.toString())
      : null,
    proAffiliation: writerCollaborator.collaborator.proAffiliation,
    ipiNumber: writerCollaborator.collaborator.ipiNumber,

    // Publisher info
    publisherName: config.publisher.name,
    publisherState: config.publisher.state,
    publisherAddress: config.publisher.address,
    publisherManagerName: config.publisher.managerName,
    publisherManagerTitle: config.publisher.managerTitle,

    // Composition (single song)
    composition,
    compositions: [composition], // Array for template loop

    // Configuration
    effectiveDate,
    governingState: config.defaults.governingState,
    reversionCondition: config.defaults.reversionCondition,
    advanceAmount: undefined, // Can be set per contract if needed

    // In-kind services
    inKindServices,

    // Template compatibility fields (for publishing assignment template)
    writer_full_name: writerFullName,
    writer_address: writerCollaborator.collaborator.address || null,
    effective_date: effectiveDate,
    publisher_state: config.publisher.state,
    publisher_address: config.publisher.address,
    publisher_manager_name: config.publisher.managerName,
    publisher_manager_title: config.publisher.managerTitle,
    reversion_condition: config.defaults.reversionCondition || "",
    advance_amount: undefined,
    governing_state: config.defaults.governingState,
    studio_value: inKindServices?.studioValue || 0,
    admin_value: inKindServices?.adminValue || 0,
    marketing_value: inKindServices?.marketingValue || 0,
    alternative_versions_value: inKindServices?.alternativeVersionsValue || 0,
    total_value: inKindServices?.totalValue || 0,
  }
}

/**
 * Build contract data from song and collaborator records
 */
export async function buildContractData(
  song: Song,
  songCollaborator: SongCollaborator & { collaborator: Collaborator },
  allSongCollaborators: (SongCollaborator & { collaborator: Collaborator })[],
  config: ContractConfig
): Promise<ContractData> {
  const fullName = [
    songCollaborator.collaborator.firstName,
    songCollaborator.collaborator.middleName,
    songCollaborator.collaborator.lastName,
  ]
    .filter(Boolean)
    .join(" ")

  const releaseDate = song.releaseDate
    ? new Date(song.releaseDate).toISOString().split("T")[0]
    : null

  // For publishing assignment contracts, use the specialized builder
  if (
    (songCollaborator.roleInSong === "writer" || songCollaborator.roleInSong === "artist") &&
    songCollaborator.publishingOwnership &&
    parseFloat(songCollaborator.publishingOwnership.toString()) > 0
  ) {
    return buildPublishingAssignmentData(
      song,
      songCollaborator,
      allSongCollaborators,
      config
    )
  }

  // For other contract types, build basic data
  return {
    // Song-specific
    songTitle: song.title,
    isrcCode: song.isrcCode,
    catalogNumber: song.catalogNumber,
    releaseDate,

    // Collaborator-specific
    collaboratorName: fullName,
    collaboratorFullName: fullName,
    collaboratorEmail: songCollaborator.collaborator.email,
    collaboratorAddress: songCollaborator.collaborator.address || null,
    collaboratorPhone: songCollaborator.collaborator.phone || null,
    role: songCollaborator.roleInSong,
    publishingOwnership: songCollaborator.publishingOwnership
      ? parseFloat(songCollaborator.publishingOwnership.toString())
      : null,
    masterOwnership: songCollaborator.masterOwnership
      ? parseFloat(songCollaborator.masterOwnership.toString())
      : null,
    proAffiliation: songCollaborator.collaborator.proAffiliation,
    ipiNumber: songCollaborator.collaborator.ipiNumber,

    // Publisher info
    publisherName: config.publisher.name,
    publisherState: config.publisher.state,
    publisherAddress: config.publisher.address,
    publisherManagerName: config.publisher.managerName,
    publisherManagerTitle: config.publisher.managerTitle,

    // Configuration
    effectiveDate: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    governingState: config.defaults.governingState,
  }
}

