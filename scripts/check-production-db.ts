import { PrismaClient } from "@prisma/client"

// Use production database URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL, // This should be production URL
    },
  },
})

async function main() {
  try {
    console.log("Checking production database...")
    
    // Check if iswcCode column exists
    const songs = await prisma.song.findMany({
      take: 1,
      select: {
        id: true,
        title: true,
        isrcCode: true,
        iswcCode: true,
        catalogNumber: true,
        status: true,
      },
    })

    console.log(`\nFound ${songs.length} song(s)`)
    if (songs.length > 0) {
      const song = songs[0]
      console.log(`\nSample song:`)
      console.log(`  Title: ${song.title}`)
      console.log(`  ISRC: ${song.isrcCode}`)
      console.log(`  ISWC: ${song.iswcCode}`)
      console.log(`  Catalog: ${song.catalogNumber}`)
      console.log(`  Status: ${song.status}`)
      console.log(`\n✅ iswcCode field exists: ${'iswcCode' in song}`)
    }

    // Check all songs
    const allSongs = await prisma.song.findMany({
      select: {
        id: true,
        title: true,
        status: true,
      },
    })
    console.log(`\nTotal songs in production: ${allSongs.length}`)
    allSongs.forEach((s) => {
      console.log(`  - ${s.title} (${s.status})`)
    })
  } catch (error: any) {
    console.error("❌ Error:", error.message)
    if (error.message.includes("Unknown column") || error.message.includes("column") && error.message.includes("does not exist")) {
      console.error("\n⚠️  The iswcCode column doesn't exist in production database!")
      console.error("   Run: npm run migrate:prod")
    }
  } finally {
    await prisma.$disconnect()
  }
}

main()

