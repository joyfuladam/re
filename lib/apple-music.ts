/**
 * Minimal Apple Music catalog client for server-side use.
 *
 * For simplicity, this expects a pre-generated developer token to be provided via
 * the APPLE_MUSIC_DEVELOPER_TOKEN environment variable. Generating the JWT from
 * team ID / key ID / private key can be added later if needed.
 */

const DEFAULT_STOREFRONT = process.env.APPLE_MUSIC_STOREFRONT || "us"

function getDeveloperToken(): string {
  const token = process.env.APPLE_MUSIC_DEVELOPER_TOKEN
  if (!token) {
    throw new Error(
      "Missing APPLE_MUSIC_DEVELOPER_TOKEN environment variable required for Apple Music API."
    )
  }
  return token
}

export interface AppleMusicSongMatch {
  id: string
  url: string
  name: string
  artistName: string
}

/**
 * Search Apple Music catalog for a song by ISRC.
 */
export async function searchSongByIsrc(
  isrc: string,
  storefront: string = DEFAULT_STOREFRONT
): Promise<AppleMusicSongMatch | null> {
  const trimmed = (isrc || "").trim()
  if (!trimmed) {
    return null
  }

  const devToken = getDeveloperToken()
  const encodedIsrc = encodeURIComponent(trimmed)
  const url = `https://api.music.apple.com/v1/catalog/${encodeURIComponent(
    storefront
  )}/songs?filter[isrc]=${encodedIsrc}&limit=5`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${devToken}`,
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    console.error(
      `Apple Music searchSongByIsrc error for ISRC ${trimmed}:`,
      response.status,
      text
    )
    return null
  }

  const data = (await response.json()) as any
  const items: any[] = data?.data ?? []
  if (!items.length) {
    return null
  }

  const song = items[0]
  const id: string | undefined = song.id
  const attributes: any = song.attributes || {}
  const urlFromApi: string | undefined = attributes.url

  if (!id || !urlFromApi) {
    return null
  }

  return {
    id,
    url: urlFromApi,
    name: attributes.name ?? "",
    artistName: attributes.artistName ?? "",
  }
}

