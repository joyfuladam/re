import type { ReactNode } from "react"

/**
 * Full-bleed chat shell: parent dashboard main removes container padding for this route.
 */
export default function MessagesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4.75rem)] flex-1 flex-col bg-muted/30">{children}</div>
  )
}
