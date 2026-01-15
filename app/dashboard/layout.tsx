"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { RoleBadge } from "@/components/auth/RoleBadge"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (status === "unauthenticated") {
    router.push("/login")
    return null
  }

  const isAdmin = session?.user?.role === "admin"

  return (
    <div className="min-h-screen">
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-xl font-bold">
              River & Ember
            </Link>
            <div className="flex gap-4">
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              {isAdmin ? (
                <Link href="/dashboard/collaborators" className="hover:underline">
                  Collaborators
                </Link>
              ) : (
                <Link href={`/dashboard/collaborators/${session?.user?.id}`} className="hover:underline">
                  My Profile
                </Link>
              )}
              {isAdmin && (
                <>
                  <Link href="/dashboard/songs" className="hover:underline">
                    Songs
                  </Link>
                  <Link href="/dashboard/contracts" className="hover:underline">
                    Contracts
                  </Link>
                </>
              )}
              <Link href="/dashboard/faq" className="hover:underline">
                FAQ
              </Link>
              {!isAdmin && (
                <Link href="/dashboard/songs" className="hover:underline">
                  My Songs
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <RoleBadge />
            <span className="text-sm">{session?.user?.email}</span>
            <Button
              variant="outline"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}

