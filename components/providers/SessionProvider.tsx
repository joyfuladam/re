"use client"

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"

export function Providers({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
}

// Keep SessionProvider for backwards compatibility if used elsewhere
export const SessionProvider = Providers
