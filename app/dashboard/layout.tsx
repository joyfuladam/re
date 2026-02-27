"use client"

import Link from "next/link"
import Image from "next/image"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { RoleBadge } from "@/components/auth/RoleBadge"
import { NotificationBell } from "@/components/nav/NotificationBell"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
            <Link href="/dashboard" className="flex items-center">
              <Image
                src="/images/logo.png"
                alt="River & Ember"
                width={120}
                height={40}
                className="h-10 w-auto"
                priority
              />
            </Link>
            <div className="flex gap-4">
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              {isAdmin ? (
                <>
                  <Link href="/dashboard/collaborators" className="hover:underline">
                    Collaborators
                  </Link>
                  <Link href="/dashboard/songs" className="hover:underline">
                    Songs
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="hover:underline">
                        Communication
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/email">Send</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/email-templates">Templates</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/email-history">History</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/smart-link-signups">Email Signups</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/account-requests">Account Requests</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Link href="/dashboard/analytics/smart-links" className="hover:underline">
                    Analytics
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="hover:underline">
                        FAQ
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/faq">FAQ (View)</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/faq/submissions">Submissions</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Link href={`/dashboard/collaborators/${session?.user?.id}`} className="hover:underline">
                  My Profile
                </Link>
              )}
              {!isAdmin && (
                <Link href="/dashboard/faq" className="hover:underline">
                  FAQ
                </Link>
              )}
              {!isAdmin && (
                <Link href="/dashboard/songs" className="hover:underline">
                  My Songs
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
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

