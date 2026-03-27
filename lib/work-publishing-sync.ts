import type { CollaboratorRole } from "@prisma/client"
import { db } from "@/lib/db"
import { isPublishingEligible } from "@/lib/roles"
import { numberToDecimal } from "@/lib/validators"

/** True if publishing is locked on the Work (when linked) or on the Song. */
export async function isPublishingLockedForWork(workId: string): Promise<boolean> {
  const w = await db.work.findUnique({
    where: { id: workId },
    select: { publishingLocked: true },
  })
  return w?.publishingLocked ?? false
}

export async function getPublishingValidationDataByWorkId(workId: string): Promise<{
  collaboratorSplits: Array<{
    collaboratorId: string
    role: CollaboratorRole
    percentage: number
  }>
  entitySplits: Array<{ publishingEntityId: string; percentage: number }>
} | null> {
  const work = await db.work.findUnique({
    where: { id: workId },
    include: {
      workCollaborators: true,
      workPublishingEntities: true,
    },
  })
  if (!work) return null
  return {
    collaboratorSplits: work.workCollaborators
      .filter((wc) => isPublishingEligible(wc.roleInWork))
      .map((wc) => ({
        collaboratorId: wc.collaboratorId,
        role: wc.roleInWork,
        percentage: wc.publishingOwnership
          ? parseFloat(wc.publishingOwnership.toString()) * 100
          : 0,
      })),
    entitySplits: work.workPublishingEntities.map((wpe) => ({
      publishingEntityId: wpe.publishingEntityId,
      percentage: wpe.ownershipPercentage
        ? parseFloat(wpe.ownershipPercentage.toString()) * 100
        : 0,
    })),
  }
}

export async function isPublishingLockedForSong(songId: string): Promise<boolean> {
  const song = await db.song.findUnique({
    where: { id: songId },
    select: { workId: true, publishingLocked: true },
  })
  if (!song) return true
  if (song.workId) {
    const w = await db.work.findUnique({
      where: { id: song.workId },
      select: { publishingLocked: true },
    })
    return w?.publishingLocked ?? song.publishingLocked
  }
  return song.publishingLocked
}

/** Splits used for lock validation — prefers Work-level rows when the song is linked to a composition. */
export async function getPublishingValidationData(songId: string): Promise<{
  collaboratorSplits: Array<{
    collaboratorId: string
    role: CollaboratorRole
    percentage: number
  }>
  entitySplits: Array<{ publishingEntityId: string; percentage: number }>
} | null> {
  const song = await db.song.findUnique({
    where: { id: songId },
    include: {
      songCollaborators: true,
      songPublishingEntities: true,
    },
  })
  if (!song) return null

  if (song.workId) {
    const work = await db.work.findUnique({
      where: { id: song.workId },
      include: {
        workCollaborators: true,
        workPublishingEntities: true,
      },
    })
    const useWork =
      work &&
      (work.workCollaborators.length > 0 || work.workPublishingEntities.length > 0)

    if (useWork && work) {
      return {
        collaboratorSplits: work.workCollaborators
          .filter((wc) => isPublishingEligible(wc.roleInWork))
          .map((wc) => ({
            collaboratorId: wc.collaboratorId,
            role: wc.roleInWork,
            percentage: wc.publishingOwnership
              ? parseFloat(wc.publishingOwnership.toString()) * 100
              : 0,
          })),
        entitySplits: work.workPublishingEntities.map((wpe) => ({
          publishingEntityId: wpe.publishingEntityId,
          percentage: wpe.ownershipPercentage
            ? parseFloat(wpe.ownershipPercentage.toString()) * 100
            : 0,
        })),
      }
    }
  }

  return {
    collaboratorSplits: song.songCollaborators
      .filter((sc) => isPublishingEligible(sc.roleInSong))
      .map((sc) => ({
        collaboratorId: sc.collaboratorId,
        role: sc.roleInSong,
        percentage: sc.publishingOwnership
          ? parseFloat(sc.publishingOwnership.toString()) * 100
          : 0,
      })),
    entitySplits: song.songPublishingEntities.map((spe) => ({
      publishingEntityId: spe.publishingEntityId,
      percentage: spe.ownershipPercentage
        ? parseFloat(spe.ownershipPercentage.toString()) * 100
        : 0,
    })),
  }
}

/**
 * After publishing splits are saved on a song, push writer shares to the parent Work
 * (if any) and mirror to all other recordings on that composition.
 */
export async function mirrorSongPublishingSplitsToWork(songId: string): Promise<void> {
  const song = await db.song.findUnique({
    where: { id: songId },
    include: { songCollaborators: true },
  })
  if (!song?.workId) return

  for (const sc of song.songCollaborators) {
    if (!isPublishingEligible(sc.roleInSong)) continue
    await db.workCollaborator.upsert({
      where: {
        workId_collaboratorId_roleInWork: {
          workId: song.workId,
          collaboratorId: sc.collaboratorId,
          roleInWork: sc.roleInSong,
        },
      },
      create: {
        workId: song.workId,
        collaboratorId: sc.collaboratorId,
        roleInWork: sc.roleInSong,
        publishingOwnership: sc.publishingOwnership,
      },
      update: {
        publishingOwnership: sc.publishingOwnership,
      },
    })
  }

  await syncWorkPublishingSplitsToAllSongs(song.workId)
}

/** Apply Work writer splits to every SongCollaborator row on all recordings for this work. */
export async function syncWorkPublishingSplitsToAllSongs(workId: string): Promise<void> {
  const wcs = await db.workCollaborator.findMany({ where: { workId } })
  const songs = await db.song.findMany({
    where: { workId },
    include: { songCollaborators: true },
  })

  for (const song of songs) {
    for (const sc of song.songCollaborators) {
      if (!isPublishingEligible(sc.roleInSong)) continue
      const wc = wcs.find(
        (w) =>
          w.collaboratorId === sc.collaboratorId && w.roleInWork === sc.roleInSong
      )
      if (wc) {
        await db.songCollaborator.update({
          where: { id: sc.id },
          data: { publishingOwnership: wc.publishingOwnership },
        })
      }
    }
  }
}

/**
 * After publisher entities are saved on a song, replace Work-level entities from this song
 * and mirror to every recording on the work.
 */
export async function mirrorSongPublishingEntitiesToWork(songId: string): Promise<void> {
  const song = await db.song.findUnique({
    where: { id: songId },
    include: { songPublishingEntities: true },
  })
  if (!song?.workId) return

  await db.workPublishingEntity.deleteMany({ where: { workId: song.workId } })

  for (const spe of song.songPublishingEntities) {
    await db.workPublishingEntity.create({
      data: {
        workId: song.workId,
        publishingEntityId: spe.publishingEntityId,
        ownershipPercentage: spe.ownershipPercentage,
      },
    })
  }

  await syncWorkPublishingEntitiesToAllSongs(song.workId)
}

/** Replace all publisher rows for a work and mirror to every linked song. */
export async function replaceWorkPublishingEntities(
  workId: string,
  entities: Array<{ publishingEntityId: string; ownershipPercentage: number }>
): Promise<void> {
  await db.workPublishingEntity.deleteMany({ where: { workId } })
  for (const e of entities) {
    await db.workPublishingEntity.create({
      data: {
        workId,
        publishingEntityId: e.publishingEntityId,
        ownershipPercentage: numberToDecimal(e.ownershipPercentage / 100),
      },
    })
  }
  await syncWorkPublishingEntitiesToAllSongs(workId)
}

export async function syncWorkPublishingEntitiesToAllSongs(workId: string): Promise<void> {
  const wpe = await db.workPublishingEntity.findMany({ where: { workId } })
  const songs = await db.song.findMany({ where: { workId }, select: { id: true } })

  for (const { id: sid } of songs) {
    await db.songPublishingEntity.deleteMany({ where: { songId: sid } })
    for (const w of wpe) {
      await db.songPublishingEntity.create({
        data: {
          songId: sid,
          publishingEntityId: w.publishingEntityId,
          ownershipPercentage: w.ownershipPercentage,
        },
      })
    }
  }
}

/**
 * Add collaborators at the Work (composition) level and mirror to every linked recording.
 * Creates SongCollaborator rows only when missing for that song + collaborator + role.
 */
export async function addWorkCollaboratorsMirrorToSongs(params: {
  workId: string
  collaboratorId: string
  roles: CollaboratorRole[]
  publishingOwnershipPercent?: number | null
}): Promise<void> {
  const { workId, collaboratorId, roles, publishingOwnershipPercent } = params
  const pubDecimal =
    publishingOwnershipPercent != null
      ? numberToDecimal(publishingOwnershipPercent / 100)
      : null

  await db.$transaction(async (tx) => {
    for (const role of roles) {
      const existing = await tx.workCollaborator.findUnique({
        where: {
          workId_collaboratorId_roleInWork: {
            workId,
            collaboratorId,
            roleInWork: role,
          },
        },
      })
      if (existing) {
        throw new Error(
          `This collaborator is already on this composition as ${role}. Remove or choose another role.`
        )
      }
      await tx.workCollaborator.create({
        data: {
          workId,
          collaboratorId,
          roleInWork: role,
          publishingOwnership: isPublishingEligible(role) ? pubDecimal : null,
        },
      })
    }

    const songs = await tx.song.findMany({ where: { workId }, select: { id: true } })
    for (const { id: songId } of songs) {
      for (const role of roles) {
        const scExisting = await tx.songCollaborator.findFirst({
          where: { songId, collaboratorId, roleInSong: role },
        })
        if (scExisting) {
          if (isPublishingEligible(role) && pubDecimal != null) {
            await tx.songCollaborator.update({
              where: { id: scExisting.id },
              data: { publishingOwnership: pubDecimal },
            })
          }
          continue
        }
        await tx.songCollaborator.create({
          data: {
            songId,
            collaboratorId,
            roleInSong: role,
            publishingOwnership: isPublishingEligible(role) ? pubDecimal : null,
            masterOwnership: null,
          },
        })
      }
    }
  })
}

/** When a recording is linked to a composition, ensure it gets SongCollaborator rows for every WorkCollaborator. */
export async function ensureWorkCollaboratorsOnSong(
  songId: string,
  workId: string
): Promise<void> {
  const wcs = await db.workCollaborator.findMany({ where: { workId } })
  for (const wc of wcs) {
    const exists = await db.songCollaborator.findFirst({
      where: {
        songId,
        collaboratorId: wc.collaboratorId,
        roleInSong: wc.roleInWork,
      },
    })
    if (exists) continue
    await db.songCollaborator.create({
      data: {
        songId,
        collaboratorId: wc.collaboratorId,
        roleInSong: wc.roleInWork,
        publishingOwnership: wc.publishingOwnership,
        masterOwnership: null,
      },
    })
  }
}
