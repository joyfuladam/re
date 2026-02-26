import path from "path"
import fs from "fs"

/**
 * Base directory for uploaded files.
 * On Railway: set RAILWAY_VOLUME_MOUNT_PATH to the volume mount (e.g. /app/uploads).
 * Locally: uses ./uploads relative to project root.
 */
export function getUploadsBaseDir(): string {
  const envPath = process.env.RAILWAY_VOLUME_MOUNT_PATH
  if (envPath) {
    return envPath
  }
  // Local dev: store under project root
  return path.join(process.cwd(), "uploads")
}

/**
 * Resolve path for a song's media file. Creates parent dirs if needed.
 * Pattern: {base}/songs/{songId}/{category}/{filename}
 */
export function resolveSongMediaPath(
  songId: string,
  category: string,
  filename: string
): { absolutePath: string; storagePath: string } {
  const base = getUploadsBaseDir()
  const storagePath = `songs/${songId}/${category}/${filename}`
  const absolutePath = path.join(base, storagePath)
  const dir = path.dirname(absolutePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return { absolutePath, storagePath }
}

export {
  MEDIA_CATEGORIES,
  MAX_FILE_SIZE_BYTES,
  getMimeCategory,
  type MediaCategory,
} from "./media-types"
