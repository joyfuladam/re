"use client"

import { useEffect } from "react"

declare global {
  interface Window {
    fbq?: (
      action: string,
      eventName: string,
      params?: Record<string, unknown>
    ) => void
  }
}

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID

/**
 * Loads the Meta (Facebook) Pixel on the smart link landing page so we can fire
 * conversion events when users click through to a streaming service. Use
 * "Smart Link Click" (or the custom event name below) as your conversion event
 * in Meta Ads Manager for best optimization.
 */
export function MetaPixel() {
  useEffect(() => {
    if (!PIXEL_ID || typeof document === "undefined") return

    const script = document.createElement("script")
    script.innerHTML = `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID.replace(/'/g, "\\'")}');
fbq('track','PageView');
`
    script.nonce = "meta-pixel"
    document.head.appendChild(script)

    return () => {
      script.remove()
      if (window.fbq) {
        try {
          window.fbq = undefined
        } catch (_) {}
      }
    }
  }, [])

  return null
}

export const META_SMART_LINK_CONVERSION_EVENT = "SmartLinkClick"

/**
 * Call when user clicks a streaming service button. Use this event name in
 * Meta Events Manager / Ads as your conversion for optimization.
 */
export function trackSmartLinkClick(params: {
  contentName: string
  service: string
  smartLinkId?: string
}) {
  if (typeof window === "undefined" || !window.fbq) return
  window.fbq(
    "trackCustom",
    META_SMART_LINK_CONVERSION_EVENT,
    {
      content_name: params.contentName,
      content_category: params.service,
      content_ids: params.smartLinkId ? [params.smartLinkId] : undefined,
    }
  )
}
