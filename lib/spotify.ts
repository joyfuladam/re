/**
 * Minimal Spotify Web API client for server-side use.
 *
 * Uses the Client Credentials flow to obtain an app-only access token and
 * exposes a helper to search for a track by ISRC and return its canonical URL.
 */

let cachedToken: {
  accessToken: string
  expiresAt: number
} | null = null

function getSpotifyCredentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET environment variables."
    )
  }

  return { clientId, clientSecret }
}

async function getClientCredentialsToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.accessToken
  }

  const { clientId, clientSecret } = getSpotifyCredentials()
  const body = new URLSearchParams()
  body.set("grant_type", "client_credentials")

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`Failed to obtain Spotify access token: ${response.status} ${text}`)
  }

  const data = (await response.json()) as {
    access_token: string
    token_type: string
    expires_in: number
  }

  const expiresAt = Date.now() + (data.expires_in || 3600) * 1000
  cachedToken = {
    accessToken: data.access_token,
    expiresAt,
  }

  return data.access_token
}

export interface SpotifyTrackMatch {
  id: string
  url: string
  name: string
  artists: string[]
  imageUrl?: string
}

/**
 * Search Spotify for a track by ISRC and return the best match, or null if none.
 */
export async function searchTrackByIsrc(isrc: string): Promise<SpotifyTrackMatch | null> {
  const trimmed = (isrc || "").trim()
  if (!trimmed) {
    return null
  }

  const token = await getClientCredentialsToken()
  const query = `isrc:${encodeURIComponent(trimmed)}`
  const url = `https://api.spotify.com/v1/search?type=track&limit=5&q=${query}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    console.error(
      `Spotify searchTrackByIsrc error for ISRC ${trimmed}:`,
      response.status,
      text
    )
    return null
  }

  const data = (await response.json()) as any
  const items: any[] = data?.tracks?.items ?? []
  if (!items.length) {
    return null
  }

  const best = items[0]
  const id: string | undefined = best.id
  if (!id) {
    return null
  }

  const artists: string[] = Array.isArray(best.artists)
    ? best.artists.map((a: any) => a?.name).filter(Boolean)
    : []

  const images: any[] = best.album?.images ?? []
  const imageUrl: string | undefined = images[0]?.url

  return {
    id,
    url: `https://open.spotify.com/track/${id}`,
    name: best.name ?? "",
    artists,
    imageUrl,
  }
}

