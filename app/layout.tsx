import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "react-quill/dist/quill.snow.css"
import { Providers } from "@/components/providers/SessionProvider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "River & Ember - Record Label Management",
  description: "Manage collaborators, songs, splits, and contracts for River & Ember releases",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

