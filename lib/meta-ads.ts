const META_API_VERSION = "v18.0"
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var ${name} for Meta Ads integration`)
  }
  return value
}

function buildAbsoluteUrl(relativeOrAbsolute: string, baseUrl: string): string {
  if (/^https?:\/\//i.test(relativeOrAbsolute)) {
    return relativeOrAbsolute
  }
  return `${baseUrl.replace(/\/$/, "")}${relativeOrAbsolute.startsWith("/") ? "" : "/"}${relativeOrAbsolute.replace(/^\/+/, "")}`
}

export interface MetaAdCreateResult {
  creativeId: string
  adId: string
}

export interface MetaAdInput {
  name: string
  headline: string
  primaryText: string
  destinationUrl: string
  imageUrl: string
  callToActionLabel?: string | null
}

/**
 * Create a paused image ad in Meta Ads from an ad draft.
 *
 * This implementation assumes:
 * - You already created a campaign and ad set in Meta.
 * - You configured:
 *   - META_AD_ACCOUNT_ID (without the act_ prefix)
 *   - META_ACCESS_TOKEN (marketing API access token)
 *   - META_PAGE_ID (Facebook Page ID to run ads from)
 *   - META_DEFAULT_ADSET_ID (ad set ID to attach ads to)
 *   - META_APP_BASE_URL (public base URL for this app, e.g. https://portal.riverandember.com)
 */
export async function createMetaImageAdFromDraft(input: MetaAdInput): Promise<MetaAdCreateResult> {
  const accessToken = requireEnv("META_ACCESS_TOKEN")
  const adAccountId = requireEnv("META_AD_ACCOUNT_ID")
  const pageId = requireEnv("META_PAGE_ID")
  const adSetId = requireEnv("META_DEFAULT_ADSET_ID")
  const appBaseUrl = requireEnv("META_APP_BASE_URL")

  const imageUrl = buildAbsoluteUrl(input.imageUrl, appBaseUrl)
  const destinationUrl = buildAbsoluteUrl(input.destinationUrl, appBaseUrl)

  // 1) Create ad creative with link_data
  const creativeRes = await fetch(
    `${META_API_BASE}/act_${adAccountId}/adcreatives?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: input.name,
        object_story_spec: {
          page_id: pageId,
          link_data: {
            message: input.primaryText,
            link: destinationUrl,
            name: input.headline,
            image_url: imageUrl,
            call_to_action: {
              // Use a conservative default CTA type; text is mainly driven by creative.
              type: "LEARN_MORE",
              value: {
                link: destinationUrl,
              },
            },
          },
        },
      }),
    }
  )

  const creativeJson = (await creativeRes.json()) as any
  if (!creativeRes.ok) {
    throw new Error(
      `Meta creative creation failed: ${creativeJson.error?.message || JSON.stringify(creativeJson)}`
    )
  }

  const creativeId: string | undefined = creativeJson.id
  if (!creativeId) {
    throw new Error("Meta creative creation response missing id")
  }

  // 2) Create ad attached to the provided ad set, in PAUSED state so it can be reviewed.
  const adRes = await fetch(
    `${META_API_BASE}/act_${adAccountId}/ads?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: input.name,
        adset_id: adSetId,
        creative: {
          creative_id: creativeId,
        },
        status: "PAUSED",
      }),
    }
  )

  const adJson = (await adRes.json()) as any
  if (!adRes.ok) {
    throw new Error(`Meta ad creation failed: ${adJson.error?.message || JSON.stringify(adJson)}`)
  }

  const adId: string | undefined = adJson.id
  if (!adId) {
    throw new Error("Meta ad creation response missing id")
  }

  return {
    creativeId,
    adId,
  }
}

