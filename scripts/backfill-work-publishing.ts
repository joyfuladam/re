/**
 * One-time: copy publishing splits from each Work's oldest song (by createdAt) into
 * WorkCollaborator / WorkPublishingEntity, then mirror to all songs on that work.
 */
import { PrismaClient } from "@prisma/client"
import {
  mirrorSongPublishingEntitiesToWork,
  mirrorSongPublishingSplitsToWork,
} from "../lib/work-publishing-sync"

const prisma = new PrismaClient()

async function main() {
  const works = await prisma.work.findMany({
    select: { id: true, title: true },
  })

  let n = 0
  for (const work of works) {
    const firstSong = await prisma.song.findFirst({
      where: { workId: work.id },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    })
    if (!firstSong) continue

    const wcCount = await prisma.workCollaborator.count({
      where: { workId: work.id },
    })
    const wpeCount = await prisma.workPublishingEntity.count({
      where: { workId: work.id },
    })
    if (wcCount > 0 || wpeCount > 0) {
      console.log(`Skip ${work.title}: work publishing rows already exist`)
      continue
    }

    await mirrorSongPublishingSplitsToWork(firstSong.id)
    await mirrorSongPublishingEntitiesToWork(firstSong.id)

    const song = await prisma.song.findUnique({
      where: { id: firstSong.id },
      select: { publishingLocked: true, publishingLockedAt: true },
    })
    if (song?.publishingLocked) {
      await prisma.work.update({
        where: { id: work.id },
        data: {
          publishingLocked: true,
          publishingLockedAt: song.publishingLockedAt ?? new Date(),
        },
      })
    }

    n++
    console.log(`Backfilled work: ${work.title} (${work.id})`)
  }

  console.log(`Done. Processed ${n} work(s).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
