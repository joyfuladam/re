import { db } from "./db"

/**
 * Generate the next catalog number in format 00001, 00002, etc.
 * Finds the highest existing catalog number and increments it.
 */
export async function generateNextCatalogNumber(): Promise<string> {
  // Find all songs with catalog numbers
  const songs = await db.song.findMany({
    where: {
      catalogNumber: {
        not: null,
      },
    },
    select: {
      catalogNumber: true,
    },
    orderBy: {
      catalogNumber: "desc",
    },
  })

  // Extract numeric values from catalog numbers
  const catalogNumbers = songs
    .map((song) => song.catalogNumber)
    .filter((num): num is string => num !== null)
    .map((num) => {
      // Remove leading zeros and parse as integer
      const parsed = parseInt(num, 10)
      return isNaN(parsed) ? 0 : parsed
    })

  // Find the maximum catalog number
  const maxNumber = catalogNumbers.length > 0 ? Math.max(...catalogNumbers) : 0

  // Increment and format with leading zeros (5 digits)
  const nextNumber = maxNumber + 1
  return nextNumber.toString().padStart(5, "0")
}



