import type { PrismaClient } from "@prisma/client"

type DbWork = Pick<PrismaClient, "work">

/**
 * Create a Work for a new recording; copies ISWC when it does not conflict on Work.iswcCode.
 */
export async function createWorkForSong(
  tx: DbWork,
  title: string,
  iswcCode: string | null | undefined
) {
  let iswc: string | null = iswcCode ?? null
  if (iswc) {
    const taken = await tx.work.findUnique({ where: { iswcCode: iswc }, select: { id: true } })
    if (taken) iswc = null
  }
  return tx.work.create({
    data: {
      title,
      iswcCode: iswc,
      labelPublishingShare: 0.5,
    },
  })
}
