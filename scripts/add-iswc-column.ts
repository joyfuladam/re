import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  try {
    console.log("Adding iswcCode column to Song table in production...\n")
    
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
    
    // Test query
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
  } catch (error: any) {
    console.error("❌ Error:", error.message)
    if (error.message.includes("already exists")) {
      console.log("ℹ️  Column already exists, that's okay!")
    } else {
      throw error
    }
  } finally {
    await prisma.$disconnect()
  }
}

main()



