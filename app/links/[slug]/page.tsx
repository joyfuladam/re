"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

interface Destination {
  id: string
  serviceKey: string
  label: string
}

interface SmartLinkResponse {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  slug: string
  destinations: Destination[]
}

export default function SmartLinkLandingPage({
  params,
}: {
  params: { slug: string }
}) {
  const [smartLink, setSmartLink] = useState<SmartLinkResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [signupMessage, setSignupMessage] = useState<string | null>(null)
  const [signupError, setSignupError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/public/smart-links/${params.slug}${window.location.search}`, {
          cache: "no-store",
        })
        if (!res.ok) {
          setError("This link is not available.")
          setLoading(false)
          return
        }
        const data = await res.json()
        setSmartLink(data)
      } catch (err) {
        console.error("Error loading smart link:", err)
        setError("Something went wrong loading this link.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.slug, searchParams])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (error || !smartLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full px-6 py-8 text-center space-y-4">
          <h1 className="text-xl font-semibold">Link unavailable</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground">
            If you believe this is an error, please contact the label.
          </p>
        </div>
      </div>
    )
  }

  const query = typeof window !== "undefined" ? window.location.search : ""

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black px-4 py-8 flex items-center justify-center">
      <div className="w-full max-w-lg mx-auto">
        <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-sm shadow-2xl px-6 py-8 sm:px-10 sm:py-10 space-y-8">
          {smartLink.imageUrl && (
            <div className="flex justify-center">
              <div className="w-40 h-40 sm:w-56 sm:h-56 rounded-2xl overflow-hidden border border-white/10 bg-neutral-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={smartLink.imageUrl}
                  alt={smartLink.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
              {smartLink.title}
            </h1>
            {smartLink.description ? (
              <p className="text-sm text-slate-300">{smartLink.description}</p>
            ) : (
              <p className="text-sm text-slate-400">Choose a music service</p>
            )}
          </div>

          <div className="space-y-3">
            {smartLink.destinations.length === 0 ? (
              <p className="text-sm text-slate-300 text-center">
                No streaming services have been configured for this link yet.
              </p>
            ) : (
              smartLink.destinations.map((dest) => (
                <Link
                  key={dest.id}
                  href={`/r/${smartLink.id}/${encodeURIComponent(dest.serviceKey)}${query}`}
                  className="block w-full"
                  prefetch={false}
                >
                  <button className="w-full h-12 rounded-full bg-white text-slate-900 text-sm font-medium flex items-center justify-center hover:bg-slate-100 transition-colors">
                    {dest.label}
                  </button>
                </Link>
              ))
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-4">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-white">Stay updated</h2>
              <p className="text-xs text-slate-300">
                Share your email to receive updates from River &amp; Ember about this and future releases.
              </p>
            </div>
            <form
              className="space-y-2"
              onSubmit={async (e) => {
                e.preventDefault()
                if (!email.trim()) {
                  setSignupError("Please enter a valid email.")
                  setSignupMessage(null)
                  return
                }
                setSubmitting(true)
                setSignupError(null)
                setSignupMessage(null)
                try {
                  const res = await fetch(`/api/public/smart-links/${params.slug}/signup`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      name: name.trim() || undefined,
                      email: email.trim(),
                    }),
                  })
                  const data = await res.json().catch(() => ({}))
                  if (!res.ok) {
                    console.error("Smart link signup error:", data)
                    setSignupError(data.error || "Something went wrong. Please try again.")
                    return
                  }
                  setSignupMessage("Thanks! You're on the list.")
                  setName("")
                  setEmail("")
                } catch (err) {
                  console.error("Smart link signup error:", err)
                  setSignupError("Something went wrong. Please try again.")
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  name="name"
                  placeholder="Name (optional)"
                  className="flex-1 rounded-full border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/40"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email address"
                  className="flex-1 rounded-full border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/40"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="mt-1 inline-flex h-9 w-full items-center justify-center rounded-full bg-white text-slate-900 text-xs font-medium hover:bg-slate-100 transition-colors disabled:opacity-70"
              >
                {submitting ? "Submitting…" : "Get updates"}
              </button>
              {signupError && (
                <p className="text-[11px] text-red-300 mt-1">{signupError}</p>
              )}
              {signupMessage && !signupError && (
                <p className="text-[11px] text-emerald-300 mt-1">{signupMessage}</p>
              )}
            </form>
          </div>

          <div className="pt-2 text-center">
            <p className="text-[11px] text-slate-400">
              Powered by River &amp; Ember
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

