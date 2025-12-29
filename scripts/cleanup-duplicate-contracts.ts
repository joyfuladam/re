/**
 * Cleanup script to remove duplicate contracts
 * Keeps the most recent contract for each unique combination of:
 * - songCollaboratorId (which includes song and collaborator)
 * - templateType
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function cleanupDuplicateContracts() {
  console.log("Starting duplicate contract cleanup...")

  try {
    // Find all contracts grouped by songCollaboratorId and templateType
    const contracts = await prisma.contract.findMany({
      orderBy: {
        createdAt: "desc", // Most recent first
      },
      include: {
        song: {
          select: {
            title: true,
          },
        },
        songCollaborator: {
          include: {
            collaborator: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    // Group contracts by songCollaboratorId + templateType
    const contractGroups = new Map<string, typeof contracts>()

    for (const contract of contracts) {
      const key = `${contract.songCollaboratorId}_${contract.templateType}`
      if (!contractGroups.has(key)) {
        contractGroups.set(key, [])
      }
      contractGroups.get(key)!.push(contract)
    }

    // Find duplicates (groups with more than 1 contract)
    const duplicates: Array<{ key: string; contracts: typeof contracts }> = []
    for (const [key, groupContracts] of contractGroups.entries()) {
      if (groupContracts.length > 1) {
        duplicates.push({ key, contracts: groupContracts })
      }
    }

    if (duplicates.length === 0) {
      console.log("No duplicate contracts found!")
      return
    }

    console.log(`Found ${duplicates.length} groups with duplicates:`)

    let totalToDelete = 0
    const contractsToDelete: string[] = []

    for (const { key, contracts: groupContracts } of duplicates) {
      // Keep the first one (most recent due to ordering)
      const toKeep = groupContracts[0]
      const toDelete = groupContracts.slice(1)

      const collaboratorName = [
        toKeep.songCollaborator.collaborator.firstName,
        toKeep.songCollaborator.collaborator.lastName,
      ]
        .filter(Boolean)
        .join(" ")

      console.log(
        `\n  ${collaboratorName} - ${toKeep.song.title} (${toKeep.templateType}):`
      )
      console.log(`    Keeping: ${toKeep.id} (created: ${toKeep.createdAt})`)
      console.log(`    Deleting ${toDelete.length} duplicate(s):`)

      for (const contract of toDelete) {
        console.log(`      - ${contract.id} (created: ${contract.createdAt})`)
        contractsToDelete.push(contract.id)
        totalToDelete++
      }
    }

    console.log(`\nTotal contracts to delete: ${totalToDelete}`)

    // Delete duplicates
    if (contractsToDelete.length > 0) {
      const result = await prisma.contract.deleteMany({
        where: {
          id: {
            in: contractsToDelete,
          },
        },
      })

      console.log(`\n✅ Successfully deleted ${result.count} duplicate contract(s)!`)
    }
  } catch (error) {
    console.error("Error cleaning up duplicate contracts:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the cleanup
cleanupDuplicateContracts()
  .then(() => {
    console.log("\nCleanup completed successfully!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\nCleanup failed:", error)
    process.exit(1)
  })

