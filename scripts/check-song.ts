import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  try {
    const songTitle = "Behold The Lamb"
    
    // Search for the song
    const songs = await prisma.song.findMany({
      where: {
        title: {
          contains: songTitle,
          mode: "insensitive",
        },
      },
      include: {
        songCollaborators: {
          include: {
            collaborator: true,
          },
        },
      },
    })

    console.log(`Found ${songs.length} song(s) matching "${songTitle}":`)
    songs.forEach((song) => {
      console.log(`\nSong ID: ${song.id}`)
      console.log(`Title: ${song.title}`)
      console.log(`ISRC: ${song.isrcCode}`)
      console.log(`ISWC: ${song.iswcCode}`)
      console.log(`Catalog Number: ${song.catalogNumber}`)
      console.log(`Status: ${song.status}`)
      console.log(`Collaborators: ${song.songCollaborators.length}`)
      song.songCollaborators.forEach((sc) => {
        const name = [sc.collaborator.firstName, sc.collaborator.middleName, sc.collaborator.lastName]
          .filter(Boolean)
          .join(" ")
        console.log(`  - ${name} (${sc.roleInSong})`)
      })
    })

    // Also check all songs
    const allSongs = await prisma.song.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        isrcCode: true,
        iswcCode: true,
      },
    })
    console.log(`\n\nTotal songs in database: ${allSongs.length}`)
    allSongs.forEach((s) => {
      console.log(`- ${s.title} (${s.status}) - ISRC: ${s.isrcCode || 'none'} - ISWC: ${s.iswcCode || 'none'}`)
    })
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

