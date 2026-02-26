"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function EmailSubNav() {
  const pathname = usePathname()
  const isSend = pathname === "/dashboard/email"
  const isTemplates = pathname === "/dashboard/email-templates"

  return (
    <nav className="flex gap-1 border-b mb-6" aria-label="Email section">
      <Link
        href="/dashboard/email"
        className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
          isSend
            ? "bg-muted border-b-2 border-b-primary -mb-px"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        }`}
      >
        Send
      </Link>
      <Link
        href="/dashboard/email-templates"
        className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
          isTemplates
            ? "bg-muted border-b-2 border-b-primary -mb-px"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        }`}
      >
        Templates
      </Link>
    </nav>
  )
}
