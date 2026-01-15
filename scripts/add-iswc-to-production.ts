import { PrismaClient } from "@prisma/client"

// This script should be run with the production DATABASE_URL
// Usage: DATABASE_URL="your-production-url" npx tsx scripts/add-iswc-to-production.ts

const prisma = new PrismaClient()

async function main() {
  try {
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
      console.error("❌ DATABASE_URL environment variable is not set")
      console.error("   Please set it to your production database URL")
      process.exit(1)
    }
    
    // Show which database we're connecting to (masked)
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':***@').replace(/\/\/[^@]+@/, '//***@')
    console.log(`Connecting to: ${maskedUrl.split('@')[1] || 'database'}\n`)
    
    console.log("Adding iswcCode column to Song table...\n")
    
    // Use raw SQL to add the column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Song" 
      ADD COLUMN IF NOT EXISTS "iswcCode" TEXT;
    `)
    
    console.log("✅ Column added successfully!")
    
    // Verify it exists
    const result = await prisma.$queryRawUnsafe<Array<{column_name: string}>>(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Song' 
      AND column_name = 'iswcCode';
    `)
    
    if (result.length > 0) {
      console.log("✅ Verified: iswcCode column exists in Song table")
    } else {
      console.log("⚠️  Warning: Could not verify column exists")
    }
    
    // Test query with the new field
    const songs = await prisma.song.findMany({
      take: 1,
      select: {
        id: true,
        title: true,
        iswcCode: true,
      },
    })
    
    console.log(`\n✅ Test query successful! Found ${songs.length} song(s)`)
    if (songs.length > 0) {
      console.log(`   Sample: ${songs[0].title} - ISWC: ${songs[0].iswcCode || 'null'}`)
    }
    
    console.log("\n✅ Migration complete! The column should now be available in production.")
  } catch (error: any) {
    console.error("❌ Error:", error.message)
    if (error.message.includes("already exists") || error.code === '42701') {
      console.log("ℹ️  Column already exists, that's okay!")
    } else {
      console.error("Full error:", error)
      throw error
    }
  } finally {
    await prisma.$disconnect()
  }
}

main()



