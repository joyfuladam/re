/**
 * One-time: create a Work per Song missing workId and link Song.workId.
 * Safe to re-run: only processes songs where workId is null.
 *
 * ISWC: if duplicate across songs would violate Work.iswcCode unique, the later song gets iswcCode null on Work.
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const songs = await prisma.song.findMany({
    where: { workId: null },
    select: { id: true, title: true, iswcCode: true },
    orderBy: { createdAt: "asc" },
  })

  let created = 0
  for (const song of songs) {
    let iswc: string | null = song.iswcCode
    if (iswc) {
      const taken = await prisma.work.findUnique({ where: { iswcCode: iswc }, select: { id: true } })
      if (taken) {
        iswc = null
      }
    }

    const work = await prisma.work.create({
      data: {
        title: song.title,
        iswcCode: iswc,
        labelPublishingShare: 0.5,
      },
    })

    await prisma.song.update({
      where: { id: song.id },
      data: { workId: work.id },
    })
    created++
  }

  console.log(`Backfill complete: ${created} Work row(s) created and linked to Song(s).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
