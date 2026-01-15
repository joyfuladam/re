import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const songTitle = "Behold the Lamb"
  const catalogNumber = "00001"

  try {
    // Find the song
    const song = await prisma.song.findFirst({
      where: {
        title: {
          contains: songTitle,
          mode: "insensitive",
        },
      },
    })

    if (!song) {
      console.error(`❌ Song "${songTitle}" not found`)
      process.exit(1)
    }

    // Update the catalog number
    const updated = await prisma.song.update({
      where: { id: song.id },
      data: { catalogNumber },
    })

    console.log(`✅ Updated "${updated.title}" catalog number to ${catalogNumber}`)
  } catch (error) {
    console.error("❌ Error updating catalog number:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()



