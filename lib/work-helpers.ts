import type { PrismaClient, WorkCompositionStatus } from "@prisma/client"

type DbWork = Pick<PrismaClient, "work">

export type CreateWorkForSongOptions = {
  /** New compositions from songwriting / new recordings start as in progress. */
  compositionStatus?: WorkCompositionStatus
}

/**
 * Create a Work for a new recording; copies ISWC when it does not conflict on Work.iswcCode.
 */
export async function createWorkForSong(
  tx: DbWork,
  title: string,
  iswcCode: string | null | undefined,
  options?: CreateWorkForSongOptions
) {
  let iswc: string | null = iswcCode ?? null
  if (iswc) {
    const taken = await tx.work.findUnique({ where: { iswcCode: iswc }, select: { id: true } })
    if (taken) iswc = null
  }
  const compositionStatus = options?.compositionStatus ?? "in_progress"
  return tx.work.create({
    data: {
      title,
      iswcCode: iswc,
      compositionStatus,
      labelPublishingShare: 0.5,
    },
  })
}
