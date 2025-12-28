import { db } from "./db"
import { SplitType } from "@prisma/client"

export interface SplitChange {
  collaboratorId: string
  previousValue: number | null
  newValue: number | null
}

export async function logSplitHistory(
  songId: string,
  splitType: SplitType,
  previousValues: Record<string, number | null>,
  newValues: Record<string, number | null>,
  changedBy: string
) {
  try {
    await db.splitHistory.create({
      data: {
        songId,
        splitType,
        previousValues: previousValues as any,
        newValues: newValues as any,
        changedBy,
      },
    })
  } catch (error) {
    console.error("Error logging split history:", error)
    // Don't throw - audit logging should not break the main operation
  }
}

export async function getSplitHistory(songId: string) {
  return await db.splitHistory.findMany({
    where: { songId },
    orderBy: { timestamp: "desc" },
  })
}

