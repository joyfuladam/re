"use client"

import { useSession } from "next-auth/react"

export function RoleBadge() {
  const { data: session } = useSession()
  
  if (!session?.user?.role) {
    return null
  }

  const roleLabel = session.user.role === "admin" ? "Admin" : "Collaborator"
  const roleColor = session.user.role === "admin" 
    ? "bg-purple-100 text-purple-800" 
    : "bg-blue-100 text-blue-800"

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${roleColor}`}>
      {roleLabel}
    </span>
  )
}

