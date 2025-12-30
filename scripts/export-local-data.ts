import { PrismaClient } from "@prisma/client"
import * as fs from "fs"
import * as path from "path"

const localDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.LOCAL_DATABASE_URL || "postgresql://postgres:password@localhost:5432/river_ember",
    },
  },
})

async function exportData() {
  try {
    console.log("📦 Exporting data from local database...")
    console.log(`Database: ${process.env.LOCAL_DATABASE_URL || "postgresql://postgres:password@localhost:5432/river_ember"}`)

    // Export all tables
    const collaborators = await localDb.collaborator.findMany()
    const songs = await localDb.song.findMany()
    const songCollaborators = await localDb.songCollaborator.findMany()
    const publishingEntities = await localDb.publishingEntity.findMany()
    const songPublishingEntities = await localDb.songPublishingEntity.findMany()
    const contracts = await localDb.contract.findMany()
    const accounts = await localDb.account.findMany()
    const sessions = await localDb.session.findMany()
    const splitHistory = await localDb.splitHistory.findMany()

    const exportData = {
      collaborators,
      songs,
      songCollaborators,
      publishingEntities,
      songPublishingEntities,
      contracts,
      accounts,
      sessions,
      splitHistory,
      exportedAt: new Date().toISOString(),
    }

    const exportPath = path.join(process.cwd(), "local-data-export.json")
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2))

    console.log(`✅ Data exported to: ${exportPath}`)
    console.log(`\n📊 Summary:`)
    console.log(`   - Collaborators: ${collaborators.length}`)
    console.log(`   - Songs: ${songs.length}`)
    console.log(`   - Song Collaborators: ${songCollaborators.length}`)
    console.log(`   - Publishing Entities: ${publishingEntities.length}`)
    console.log(`   - Contracts: ${contracts.length}`)
    console.log(`   - Accounts: ${accounts.length}`)
    console.log(`   - Sessions: ${sessions.length}`)
    console.log(`   - Split History: ${splitHistory.length}`)
    console.log(`\n✅ Export complete!`)
  } catch (error) {
    console.error("❌ Error exporting data:", error)
    throw error
  } finally {
    await localDb.$disconnect()
  }
}

exportData()
