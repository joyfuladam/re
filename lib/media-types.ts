/** Allowed MIME types and limits by category (client-safe, no Node deps) */

export const MEDIA_CATEGORIES = {
  audio: [
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/flac",
    "audio/x-flac",
  ],
  images: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  videos: ["video/mp4", "video/webm", "video/quicktime"],
} as const

export type MediaCategory = keyof typeof MEDIA_CATEGORIES

export const MAX_FILE_SIZE_BYTES = {
  audio: 200 * 1024 * 1024, // 200MB
  images: 20 * 1024 * 1024, // 20MB
  videos: 500 * 1024 * 1024, // 500MB
} as const

export function getMimeCategory(mimeType: string): MediaCategory | null {
  for (const [cat, mimes] of Object.entries(MEDIA_CATEGORIES)) {
    if ((mimes as readonly string[]).includes(mimeType)) return cat as MediaCategory
  }
  return null
}
