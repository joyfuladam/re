import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  try {
    // Simulate what the API does
    const where: any = {}
    
    const songs = await prisma.song.findMany({
      where,
      include: {
        songCollaborators: {
          include: {
            collaborator: true,
          },
        },
      },
      orderBy: { title: "asc" },
    })

    console.log(`Found ${songs.length} songs`)
    console.log("\nSongs:")
    songs.forEach((song) => {
      console.log(`- ${song.title} (${song.status})`)
      console.log(`  ID: ${song.id}`)
      console.log(`  ISRC: ${song.isrcCode}`)
      console.log(`  ISWC: ${song.iswcCode}`)
      console.log(`  Catalog: ${song.catalogNumber}`)
      console.log(`  Collaborators: ${song.songCollaborators.length}`)
    })

    // Check if there's a type issue with iswcCode
    const firstSong = songs[0]
    if (firstSong) {
      console.log(`\nFirst song iswcCode type: ${typeof firstSong.iswcCode}`)
      console.log(`First song iswcCode value: ${firstSong.iswcCode}`)
      console.log(`First song has iswcCode property: ${'iswcCode' in firstSong}`)
    }
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

