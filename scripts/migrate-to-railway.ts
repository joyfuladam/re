import { PrismaClient } from "@prisma/client"
import * as fs from "fs"
import * as path from "path"

/**
 * Migration script: Supabase → Railway Postgres
 * 
 * This script:
 * 1. Exports all data from Supabase
 * 2. Sets up schema in Railway Postgres
 * 3. Imports all data to Railway Postgres
 */

const SUPABASE_URL = process.env.SUPABASE_DATABASE_URL || 
  "postgresql://postgres.jeczuayosodxqbkfjasw:byqzo7-qimjad-saqsaM@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

const RAILWAY_URL = process.env.RAILWAY_DATABASE_URL

if (!RAILWAY_URL) {
  console.error("❌ RAILWAY_DATABASE_URL environment variable is required")
  console.error("Get it from Railway dashboard → Postgres service → Variables → DATABASE_URL")
  process.exit(1)
}

const supabaseDb = new PrismaClient({
  datasources: {
    db: {
      url: SUPABASE_URL,
    },
  },
})

const railwayDb = new PrismaClient({
  datasources: {
    db: {
      url: RAILWAY_URL,
    },
  },
})

async function exportFromSupabase() {
  console.log("📦 Step 1: Exporting data from Supabase...")
  console.log(`Database: ${SUPABASE_URL.replace(/:[^:@]+@/, ":****@")}`)
  
  try {
    const collaborators = await supabaseDb.collaborator.findMany()
    const songs = await supabaseDb.song.findMany()
    const songCollaborators = await supabaseDb.songCollaborator.findMany()
    const publishingEntities = await supabaseDb.publishingEntity.findMany()
    const songPublishingEntities = await supabaseDb.songPublishingEntity.findMany()
    const contracts = await supabaseDb.contract.findMany()
    const accounts = await supabaseDb.account.findMany()
    const sessions = await supabaseDb.session.findMany()
    const splitHistory = await supabaseDb.splitHistory.findMany()
    const contractTemplates = await supabaseDb.contractTemplate.findMany()
    const faqSubmissions = await supabaseDb.faqSubmission.findMany()
    const verificationTokens = await supabaseDb.verificationToken.findMany()

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
      contractTemplates,
      faqSubmissions,
      verificationTokens,
      exportedAt: new Date().toISOString(),
    }

    const exportPath = path.join(process.cwd(), "supabase-export.json")
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2))

    console.log(`✅ Data exported to: ${exportPath}`)
    console.log(`\n📊 Summary:`)
    console.log(`   - Collaborators: ${collaborators.length}`)
    console.log(`   - Songs: ${songs.length}`)
    console.log(`   - Song Collaborators: ${songCollaborators.length}`)
    console.log(`   - Publishing Entities: ${publishingEntities.length}`)
    console.log(`   - Contracts: ${contracts.length}`)
    console.log(`   - Accounts: ${accounts.length}`)
    console.log(`   - Split History: ${splitHistory.length}`)
    console.log(`   - Contract Templates: ${contractTemplates.length}`)
    console.log(`   - FAQ Submissions: ${faqSubmissions.length}`)
    console.log(`   - Verification Tokens: ${verificationTokens.length}`)
    
    return exportData
  } catch (error) {
    console.error("❌ Error exporting from Supabase:", error)
    throw error
  }
}

async function setupRailwaySchema() {
  console.log("\n📋 Step 2: Setting up schema in Railway Postgres...")
  console.log(`Database: ${RAILWAY_URL.replace(/:[^:@]+@/, ":****@")}`)
  
  try {
    // Generate Prisma client
    console.log("   Generating Prisma client...")
    const { execSync } = require("child_process")
    execSync("npx prisma generate", { stdio: "inherit" })
    
    // Push schema to Railway
    console.log("   Creating tables in Railway Postgres...")
    execSync(`DATABASE_URL="${RAILWAY_URL}" npx prisma db push --accept-data-loss`, { stdio: "inherit" })
    
    console.log("✅ Schema created in Railway Postgres")
  } catch (error) {
    console.error("❌ Error setting up schema:", error)
    throw error
  }
}

async function importToRailway(exportData: any) {
  console.log("\n📥 Step 3: Importing data to Railway Postgres...")
  
  try {
    // Import in order (respecting foreign key constraints)
    if (exportData.collaborators?.length > 0) {
      console.log(`👥 Importing ${exportData.collaborators.length} collaborators...`)
      for (const collaborator of exportData.collaborators) {
        try {
          if (collaborator.email) {
            const existing = await railwayDb.collaborator.findUnique({
              where: { email: collaborator.email },
            })
            
            if (existing) {
              await railwayDb.collaborator.update({
                where: { email: collaborator.email },
                data: collaborator,
              })
            } else {
              await railwayDb.collaborator.create({ data: collaborator })
            }
          } else {
            await railwayDb.collaborator.upsert({
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
        await railwayDb.publishingEntity.upsert({
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
        await railwayDb.song.upsert({
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
        await railwayDb.songCollaborator.upsert({
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
        await railwayDb.songPublishingEntity.upsert({
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
        await railwayDb.contract.upsert({
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
        await railwayDb.splitHistory.upsert({
          where: { id: history.id },
          update: history,
          create: history,
        })
      }
      console.log(`✅ Imported ${exportData.splitHistory.length} split history records`)
    }

    if (exportData.contractTemplates?.length > 0) {
      console.log(`\n📄 Importing ${exportData.contractTemplates.length} contract templates...`)
      for (const template of exportData.contractTemplates) {
        await railwayDb.contractTemplate.upsert({
          where: { type: template.type },
          update: template,
          create: template,
        })
      }
      console.log(`✅ Imported ${exportData.contractTemplates.length} contract templates`)
    }

    if (exportData.faqSubmissions?.length > 0) {
      console.log(`\n❓ Importing ${exportData.faqSubmissions.length} FAQ submissions...`)
      for (const submission of exportData.faqSubmissions) {
        await railwayDb.faqSubmission.upsert({
          where: { id: submission.id },
          update: submission,
          create: submission,
        })
      }
      console.log(`✅ Imported ${exportData.faqSubmissions.length} FAQ submissions`)
    }

    if (exportData.accounts?.length > 0) {
      console.log(`\n🔐 Importing ${exportData.accounts.length} accounts...`)
      for (const account of exportData.accounts) {
        await railwayDb.account.upsert({
          where: { id: account.id },
          update: account,
          create: account,
        })
      }
      console.log(`✅ Imported ${exportData.accounts.length} accounts`)
    }

    // Verification tokens are optional and can be skipped (users will verify again)
    if (exportData.verificationTokens?.length > 0) {
      console.log(`\n🔑 Importing ${exportData.verificationTokens.length} verification tokens...`)
      for (const token of exportData.verificationTokens) {
        try {
          await railwayDb.verificationToken.upsert({
            where: { identifier_token: { identifier: token.identifier, token: token.token } },
            update: token,
            create: token,
          })
        } catch (error: any) {
          // Skip expired tokens
          if (error.code !== 'P2002') {
            console.log(`⚠️  Skipping token ${token.identifier} - may be expired`)
          }
        }
      }
      console.log(`✅ Imported ${exportData.verificationTokens.length} verification tokens`)
    }

    console.log("\n✅ Data import complete!")
    console.log("\n📝 Note: Sessions were not imported (users will need to log in again)")
  } catch (error) {
    console.error("❌ Error importing data:", error)
    throw error
  }
}

async function main() {
  try {
    console.log("🚀 Starting migration: Supabase → Railway Postgres\n")
    
    // Step 1: Export from Supabase
    const exportData = await exportFromSupabase()
    
    // Step 2: Set up schema in Railway
    await setupRailwaySchema()
    
    // Step 3: Import data to Railway
    await importToRailway(exportData)
    
    console.log("\n🎉 Migration complete!")
    console.log("\nNext steps:")
    console.log("1. Update your app's DATABASE_URL to point to Railway Postgres")
    console.log("2. Set environment variables in Railway")
    console.log("3. Deploy your app")
    
  } catch (error) {
    console.error("\n❌ Migration failed:", error)
    process.exit(1)
  } finally {
    await supabaseDb.$disconnect()
    await railwayDb.$disconnect()
  }
}

main()
