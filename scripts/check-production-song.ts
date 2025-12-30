import { PrismaClient } from "@prisma/client"

// This will use the DATABASE_URL from environment
const prisma = new PrismaClient()

async function main() {
  try {
    console.log("Checking production database for 'Behold The Lamb'...\n")
    
    // Find the song
    const song = await prisma.song.findFirst({
      where: {
        title: {
          contains: "Behold",
          mode: "insensitive",
        },
      },
      include: {
        songCollaborators: {
          include: {
            collaborator: {
              select: {
                id: true,
                firstName: true,
                middleName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!song) {
      console.log("❌ Song 'Behold The Lamb' NOT FOUND in database!")
      console.log("\nChecking all songs...")
      const allSongs = await prisma.song.findMany({
        select: {
          id: true,
          title: true,
          status: true,
        },
      })
      console.log(`Total songs: ${allSongs.length}`)
      allSongs.forEach((s) => {
        console.log(`  - ${s.title} (${s.status})`)
      })
      return
    }

    console.log("✅ Song found!")
    console.log(`\nSong Details:`)
    console.log(`  ID: ${song.id}`)
    console.log(`  Title: ${song.title}`)
    console.log(`  Status: ${song.status}`)
    console.log(`  ISRC: ${song.isrcCode || 'null'}`)
    console.log(`  ISWC: ${song.iswcCode || 'null'}`)
    console.log(`  Catalog Number: ${song.catalogNumber || 'null'}`)
    console.log(`  Publishing Locked: ${song.publishingLocked}`)
    console.log(`  Master Locked: ${song.masterLocked}`)
    console.log(`  Created: ${song.createdAt}`)
    console.log(`  Updated: ${song.updatedAt}`)
    
    console.log(`\nCollaborators: ${song.songCollaborators.length}`)
    song.songCollaborators.forEach((sc) => {
      const name = [sc.collaborator.firstName, sc.collaborator.middleName, sc.collaborator.lastName]
        .filter(Boolean)
        .join(" ")
      console.log(`  - ${name} (${sc.roleInSong}) - ID: ${sc.collaborator.id}`)
    })

    // Check if there are any issues with the data
    console.log(`\n\nChecking for data issues...`)
    if (!song.title) {
      console.log("⚠️  WARNING: Song title is null/empty")
    }
    if (song.songCollaborators.length === 0) {
      console.log("⚠️  WARNING: Song has no collaborators")
    }

    // Test the query that the API uses
    console.log(`\n\nTesting API query (no filters)...`)
    const apiSongs = await prisma.song.findMany({
      where: {},
      include: {
        songCollaborators: {
          include: {
            collaborator: true,
          },
        },
      },
      orderBy: { title: "asc" },
    })
    console.log(`API query returns ${apiSongs.length} song(s)`)
    apiSongs.forEach((s) => {
      console.log(`  - ${s.title} (${s.status})`)
    })
  } catch (error: any) {
    console.error("❌ Error:", error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

