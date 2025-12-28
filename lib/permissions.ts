import { Session } from "next-auth"
import { db } from "./db"
import { UserRole } from "@prisma/client"

export interface UserPermissions {
  isAdmin: boolean
  isCollaborator: boolean
  collaboratorId: string | null
}

/**
 * Get user permissions from session
 */
export async function getUserPermissions(session: Session | null): Promise<UserPermissions | null> {
  if (!session?.user?.id) {
    return null
  }

  const collaborator = await db.collaborator.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      id: true,
    },
  })

  if (!collaborator) {
    return null
  }

  return {
    isAdmin: collaborator.role === "admin",
    isCollaborator: collaborator.role === "collaborator",
    collaboratorId: collaborator.id,
  }
}

/**
 * Check if user is admin
 */
export async function isAdmin(session: Session | null): Promise<boolean> {
  const permissions = await getUserPermissions(session)
  return permissions?.isAdmin ?? false
}

/**
 * Check if user can access a collaborator record
 * Admins can access all, collaborators can only access their own
 */
export async function canAccessCollaborator(
  session: Session | null,
  collaboratorId: string
): Promise<boolean> {
  const permissions = await getUserPermissions(session)
  
  if (!permissions) {
    return false
  }

  // Admins can access all collaborators
  if (permissions.isAdmin) {
    return true
  }

  // Collaborators can only access their own record
  return permissions.collaboratorId === collaboratorId
}

/**
 * Check if user can access a song
 * Admins can access all, collaborators can only access songs they're on
 */
export async function canAccessSong(
  session: Session | null,
  songId: string
): Promise<boolean> {
  const permissions = await getUserPermissions(session)
  
  if (!permissions) {
    return false
  }

  // Admins can access all songs
  if (permissions.isAdmin) {
    return true
  }

  // Collaborators can only access songs they're a collaborator on
  if (!permissions.collaboratorId) {
    return false
  }

  const songCollaborator = await db.songCollaborator.findFirst({
    where: {
      songId: songId,
      collaboratorId: permissions.collaboratorId,
    },
  })

  return songCollaborator !== null
}

/**
 * Check if user can update a collaborator
 * Admins can update all, collaborators can only update their own
 */
export async function canUpdateCollaborator(
  session: Session | null,
  collaboratorId: string
): Promise<boolean> {
  return canAccessCollaborator(session, collaboratorId)
}

/**
 * Check if user can create/delete collaborators
 * Only admins can create/delete collaborators
 */
export async function canManageCollaborators(session: Session | null): Promise<boolean> {
  const permissions = await getUserPermissions(session)
  return permissions?.isAdmin ?? false
}

/**
 * Check if user can create/delete songs
 * Only admins can create/delete songs
 */
export async function canManageSongs(session: Session | null): Promise<boolean> {
  const permissions = await getUserPermissions(session)
  return permissions?.isAdmin ?? false
}

/**
 * Check if user can manage splits
 * Admins can manage all, collaborators can only view (not edit) splits on their songs
 */
export async function canManageSplits(session: Session | null): Promise<boolean> {
  const permissions = await getUserPermissions(session)
  return permissions?.isAdmin ?? false
}

