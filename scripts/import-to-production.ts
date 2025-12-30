import { PrismaClient } from "@prisma/client"
import * as fs from "fs"
import * as path from "path"

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required")
  console.error("Set it to your production database connection string")
  process.exit(1)
}

const productionDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

async function importData() {
  try {
    const exportPath = path.join(process.cwd(), "local-data-export.json")

    if (!fs.existsSync(exportPath)) {
      throw new Error(`Export file not found: ${exportPath}. Run export-local-data.ts first.`)
    }

    const exportData = JSON.parse(fs.readFileSync(exportPath, "utf-8"))

    console.log("📥 Importing data to production database...")
    console.log(`Database: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ":****@")}`)
    console.log(`Export date: ${exportData.exportedAt}`)
    console.log("")

    // Import in order (respecting foreign key constraints)
    if (exportData.collaborators?.length > 0) {
      console.log(`👥 Importing ${exportData.collaborators.length} collaborators...`)
      for (const collaborator of exportData.collaborators) {
        try {
          // Try to find by email first (if email exists)
          if (collaborator.email) {
            const existing = await productionDb.collaborator.findUnique({
              where: { email: collaborator.email },
            })
            
            if (existing) {
              // Update existing by email
              await productionDb.collaborator.update({
                where: { email: collaborator.email },
                data: collaborator,
              })
            } else {
              // Create new
              await productionDb.collaborator.create({
                data: collaborator,
              })
            }
          } else {
            // No email, use ID
            await productionDb.collaborator.upsert({
              where: { id: collaborator.id },
              update: collaborator,
              create: collaborator,
            })
          }
        } catch (error: any) {
          if (error.code === 'P2002') {
            console.log(`⚠️  Skipping collaborator ${collaborator.email || collaborator.id} - already exists`)
          } else {
            throw error
          }
        }
      }
      console.log(`✅ Imported ${exportData.collaborators.length} collaborators`)
    }

    if (exportData.publishingEntities?.length > 0) {
      console.log(`\n📝 Importing ${exportData.publishingEntities.length} publishing entities...`)
      for (const entity of exportData.publishingEntities) {
        await productionDb.publishingEntity.upsert({
          where: { id: entity.id },
          update: entity,
          create: entity,
        })
      }
      console.log(`✅ Imported ${exportData.publishingEntities.length} publishing entities`)
    }

    if (exportData.songs?.length > 0) {
      console.log(`\n🎵 Importing ${exportData.songs.length} songs...`)
      for (const song of exportData.songs) {
        await productionDb.song.upsert({
          where: { id: song.id },
          update: song,
          create: song,
        })
      }
      console.log(`✅ Imported ${exportData.songs.length} songs`)
    }

    if (exportData.songCollaborators?.length > 0) {
      console.log(`\n🔗 Importing ${exportData.songCollaborators.length} song collaborators...`)
      for (const sc of exportData.songCollaborators) {
        await productionDb.songCollaborator.upsert({
          where: { id: sc.id },
          update: sc,
          create: sc,
        })
      }
      console.log(`✅ Imported ${exportData.songCollaborators.length} song collaborators`)
    }

    if (exportData.songPublishingEntities?.length > 0) {
      console.log(`\n📄 Importing ${exportData.songPublishingEntities.length} song publishing entities...`)
      for (const spe of exportData.songPublishingEntities) {
        await productionDb.songPublishingEntity.upsert({
          where: { id: spe.id },
          update: spe,
          create: spe,
        })
      }
      console.log(`✅ Imported ${exportData.songPublishingEntities.length} song publishing entities`)
    }

    if (exportData.contracts?.length > 0) {
      console.log(`\n📋 Importing ${exportData.contracts.length} contracts...`)
      for (const contract of exportData.contracts) {
        await productionDb.contract.upsert({
          where: { id: contract.id },
          update: contract,
          create: contract,
        })
      }
      console.log(`✅ Imported ${exportData.contracts.length} contracts`)
    }

    if (exportData.splitHistory?.length > 0) {
      console.log(`\n📊 Importing ${exportData.splitHistory.length} split history records...`)
      for (const history of exportData.splitHistory) {
        await productionDb.splitHistory.upsert({
          where: { id: history.id },
          update: history,
          create: history,
        })
      }
      console.log(`✅ Imported ${exportData.splitHistory.length} split history records`)
    }

    // Note: Accounts and sessions are user-specific and may not need to be imported
    // They'll be recreated when users log in
    if (exportData.accounts?.length > 0) {
      console.log(`\n🔐 Importing ${exportData.accounts.length} accounts...`)
      for (const account of exportData.accounts) {
        await productionDb.account.upsert({
          where: { id: account.id },
          update: account,
          create: account,
        })
      }
      console.log(`✅ Imported ${exportData.accounts.length} accounts`)
    }

    console.log("\n✅ Data import complete!")
    console.log("\n📝 Note: Sessions were not imported (they'll be recreated on login)")
  } catch (error) {
    console.error("❌ Error importing data:", error)
    throw error
  } finally {
    await productionDb.$disconnect()
  }
}

importData()
