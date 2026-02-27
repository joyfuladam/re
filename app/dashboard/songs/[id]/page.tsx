   "use client"

import { useEffect, useState } from "react"
import React from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PublishingSplitEditor } from "@/components/splits/PublishingSplitEditor"
import { MasterSplitEditor } from "@/components/splits/MasterSplitEditor"
import { SplitPieChart } from "@/components/charts/SplitPieChart"
import { MediaLibraryCard } from "@/components/songs/MediaLibraryCard"
import { SmartLinkEditorCard } from "@/components/songs/SmartLinkEditorCard"
import { ContractType } from "@prisma/client"
import { getRequiredContractTypes, getContractTypeLabel } from "@/lib/contract-types"
import { CollaboratorRole } from "@prisma/client"
import { isPublishingEligible, isMasterEligible } from "@/lib/roles"

interface Song {
  id: string
  title: string
  isrcCode: string | null
  iswcCode: string | null
  catalogNumber: string | null
  releaseDate: string | null
  proWorkRegistrationNumber: string | null
  publishingAdmin: string | null
  masterOwner: string | null
  genre: string | null
  subGenre: string | null
  duration: number | null
  recordingDate: string | null
  recordingLocation: string | null
  notes: string | null
  promoMaterialsFolderId: string | null
  status: string
  publishingLocked: boolean
  masterLocked: boolean
  labelMasterShare?: number | null
  songCollaborators: Array<{
    id: string
    collaborator: {
      id: string
      firstName?: string
      middleName?: string | null
      lastName?: string
      name?: string
      role?: string
      publishingEligible?: boolean
      masterEligible?: boolean
      capableRoles?: CollaboratorRole[]
    }
    publishingOwnership: number | null
    masterOwnership: number | null
    roleInSong: string
  }>
  songPublishingEntities?: Array<{
    id: string
    publishingEntity: {
      id: string
      name: string
      isInternal: boolean
    }
    ownershipPercentage: number | null
  }>
  media?: Array<{
    id: string
    songId: string
    category: string
    filename: string
    storagePath: string
    mimeType: string
    fileSize: number
    label: string | null
    createdAt: string
  }>
}

export default function SongDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const [song, setSong] = useState<Song | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [deletingCollaboratorId, setDeletingCollaboratorId] = useState<string | null>(null)
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null)
  const [editingPublishingShare, setEditingPublishingShare] = useState<string | null>(null)
  const [editingMasterShare, setEditingMasterShare] = useState<string | null>(null)
  const [publishingShareValue, setPublishingShareValue] = useState<string>("")
  const [masterShareValue, setMasterShareValue] = useState<string>("")
  const [editingRiverEmberPublishing, setEditingRiverEmberPublishing] = useState(false)
  const [editingRiverEmberMaster, setEditingRiverEmberMaster] = useState(false)
  const [riverEmberPublishingValue, setRiverEmberPublishingValue] = useState<string>("")
  const [riverEmberMasterValue, setRiverEmberMasterValue] = useState<string>("")
  const [availablePublishingEntities, setAvailablePublishingEntities] = useState<Array<{id: string, name: string}>>([])
  const [updatingSplits, setUpdatingSplits] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editFormData, setEditFormData] = useState({
    title: "",
    isrcCode: "",
    iswcCode: "",
    catalogNumber: "",
    releaseDate: "",
    proWorkRegistrationNumber: "",
    publishingAdmin: "",
    masterOwner: "",
    genre: "",
    subGenre: "",
    duration: "",
    recordingDate: "",
    recordingLocation: "",
    notes: "",
    promoMaterialsFolderId: "",
    status: "draft",
  })
  const [viewingContract, setViewingContract] = useState<{
    html: string
    contractType: ContractType
    collaboratorName: string
  } | null>(null)
  const [generatingContractId, setGeneratingContractId] = useState<string | null>(null)
  const [refreshingStatusId, setRefreshingStatusId] = useState<string | null>(null)
  const [contracts, setContracts] = useState<Array<{
    id: string
    songCollaboratorId: string
    templateType: ContractType
    esignatureStatus: string | null
    signedAt: string | null
  }>>([])

  const isAdmin = session?.user?.role === "admin"
  
  // Find the current user's role on this song
  const currentUserSongCollaborator = song 
    ? song.songCollaborators.find(sc => sc.collaborator.id === session?.user?.id)
    : null
  
  // Check if current user is a writer or artist on this song
  const isWriterOrArtist = currentUserSongCollaborator 
    ? (currentUserSongCollaborator.roleInSong === "writer" || currentUserSongCollaborator.roleInSong === "artist")
    : false
  
  // Non-writer/artist collaborators can only see their own share
  const canSeeAllShares = isAdmin || isWriterOrArtist

  // For non-admin: only show sections where the current user has an allocation
  const currentUserHasPublishing = currentUserSongCollaborator
    ? (currentUserSongCollaborator.roleInSong === "writer" || currentUserSongCollaborator.roleInSong === "label") &&
      (parseFloat((currentUserSongCollaborator.publishingOwnership ?? 0).toString()) > 0)
    : false
  const currentUserHasMaster = currentUserSongCollaborator
    ? isMasterEligible(currentUserSongCollaborator.roleInSong as CollaboratorRole) &&
      currentUserSongCollaborator.roleInSong !== "label" &&
      (parseFloat((currentUserSongCollaborator.masterOwnership ?? 0).toString()) > 0)
    : false

  const handlePreviewContract = async (songCollaboratorId: string, contractType: ContractType, collaboratorName: string) => {
    if (!song) return
    
    setGeneratingContractId(`${songCollaboratorId}-${contractType}`)
    try {
      // Find the songCollaborator
      const songCollaborator = song.songCollaborators.find(sc => sc.id === songCollaboratorId)
      if (!songCollaborator) {
        alert("Collaborator not found")
        return
      }

      const response = await fetch("/api/contracts/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          songId: song.id,
          songCollaboratorId: songCollaboratorId,
          contractType,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`Error generating contract: ${error.error || "Unknown error"}`)
        return
      }

      const data = await response.json()
      setViewingContract({
        html: data.html,
        contractType: data.contractType,
        collaboratorName,
      })
    } catch (error) {
      console.error("Error generating contract:", error)
      alert("An unexpected error occurred while generating the contract.")
    } finally {
      setGeneratingContractId(null)
    }
  }

  const fetchContracts = async (songId: string) => {
    try {
      const response = await fetch(`/api/contracts?songId=${songId}`)
      if (response.ok) {
        const data = await response.json()
        setContracts(data.contracts || [])
      }
    } catch (error) {
      console.error("Error fetching contracts:", error)
    }
  }

  const getContractStatus = (songCollaboratorId: string, contractType: ContractType): {
    status: string | null
    signedAt: string | null
    contractId: string | null
  } => {
    const contract = contracts.find(
      (c) => c.songCollaboratorId === songCollaboratorId && c.templateType === contractType
    )
    return {
      status: contract?.esignatureStatus || null,
      signedAt: contract?.signedAt || null,
      contractId: contract?.id || null,
    }
  }

  const handleRefreshStatus = async (contractId: string) => {
    if (!contractId) return
    
    setRefreshingStatusId(contractId)
    try {
      const response = await fetch(`/api/esignature/status?contractId=${contractId}`)
      if (response.ok) {
        const data = await response.json()
        // Update the contract in state
        setContracts((prev) =>
          prev.map((c) =>
            c.id === contractId
              ? {
                  ...c,
                  esignatureStatus: data.status,
                  signedAt: data.signedAt,
                }
              : c
          )
        )
      } else {
        const error = await response.json()
        console.error("Error refreshing status:", error)
        alert(`Error refreshing status: ${error.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error refreshing status:", error)
      alert("An unexpected error occurred while refreshing status.")
    } finally {
      setRefreshingStatusId(null)
    }
  }

  const handleDownloadContract = async (songCollaboratorId: string, contractType: ContractType) => {
    if (!song) return
    
    setGeneratingContractId(`${songCollaboratorId}-${contractType}`)
    try {
      // First generate the contract to get the contract ID
      const generateResponse = await fetch("/api/contracts/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          songId: song.id,
          songCollaboratorId: songCollaboratorId,
          contractType,
        }),
      })

      if (!generateResponse.ok) {
        const error = await generateResponse.json()
        alert(`Error generating contract: ${error.error || "Unknown error"}`)
        return
      }

      const generateData = await generateResponse.json()
      
      // Download the PDF
      const downloadResponse = await fetch(`/api/contracts/${generateData.contractId}/download`)
      
      if (!downloadResponse.ok) {
        const error = await downloadResponse.json().catch(() => ({ error: "Unknown error" }))
        alert(`Error downloading contract: ${error.error || "Unknown error"}`)
        return
      }

      // Get the PDF blob and trigger download
      const blob = await downloadResponse.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = downloadResponse.headers.get("Content-Disposition")
      let filename = `contract_${Date.now()}.pdf`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error downloading contract:", error)
      alert("An unexpected error occurred while downloading the contract.")
    } finally {
      setGeneratingContractId(null)
    }
  }

  const handleSendContract = async (songCollaboratorId: string, contractType: ContractType, collaboratorName: string, draft: boolean = false) => {
    if (!song) return
    
    setGeneratingContractId(`${songCollaboratorId}-${contractType}`)
    try {
      // Find the songCollaborator
      const songCollaborator = song.songCollaborators.find(sc => sc.id === songCollaboratorId)
      if (!songCollaborator) {
        alert("Collaborator not found")
        return
      }

      // First generate the contract
      const generateResponse = await fetch("/api/contracts/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          songId: song.id,
          songCollaboratorId: songCollaboratorId,
          contractType,
        }),
      })

      if (!generateResponse.ok) {
        const error = await generateResponse.json()
        alert(`Error generating contract: ${error.error || "Unknown error"}`)
        return
      }

      const generateData = await generateResponse.json()
      
      // Then send via e-signature (or create draft)
      const sendResponse = await fetch("/api/esignature/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractId: generateData.contractId,
          draft,
        }),
      })

      if (!sendResponse.ok) {
        const error = await sendResponse.json()
        alert(`Error ${draft ? 'creating draft' : 'sending contract'}: ${error.error || "Unknown error"}`)
        return
      }

      const sendData = await sendResponse.json()
      if (draft) {
        alert(`Draft document created! Log into SignWell to review and send manually.`)
      } else {
        alert(`Contract sent to ${collaboratorName} for e-signature`)
      }
      // Refresh contracts to show updated status
      if (song) {
        await fetchContracts(song.id)
      }
    } catch (error) {
      console.error(`Error ${draft ? 'creating draft' : 'sending contract'}:`, error)
      alert(`An unexpected error occurred while ${draft ? 'creating the draft' : 'sending the contract'}.`)
    } finally {
      setGeneratingContractId(null)
    }
  }

  const handleUpdateRole = async (songCollaboratorId: string, newRole: CollaboratorRole) => {
    if (!song) return

    setUpdatingRoleId(songCollaboratorId)
    try {
      const response = await fetch(
        `/api/songs/${song.id}/collaborators?songCollaboratorId=${songCollaboratorId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roleInSong: newRole,
          }),
        }
      )

      if (response.ok) {
        setEditingRoleId(null)
        await fetchSong()
        await fetchContracts(song.id)
      } else {
        const errorData = await response.json()
        alert(`Error: ${errorData.error || "Failed to update role"}`)
      }
    } catch (error) {
      console.error("Error updating role:", error)
      alert("Failed to update role")
    } finally {
      setUpdatingRoleId(null)
    }
  }

  const handleUpdatePublishingShare = async (songCollaboratorId: string, newPercentage: number) => {
    if (!song) return
    if (song.publishingLocked) {
      alert("Publishing splits are locked and cannot be modified")
      return
    }

    setUpdatingSplits(true)
    try {
      // Get all publishing-eligible collaborators and their current splits
      const eligibleCollaborators = song.songCollaborators.filter((sc) => 
        isPublishingEligible(sc.roleInSong as CollaboratorRole)
      )
      
      // Build splits array, updating the one being edited
      const splits = eligibleCollaborators.map((sc) => {
        let percentage = sc.id === songCollaboratorId 
          ? newPercentage 
          : (sc.publishingOwnership ? parseFloat(sc.publishingOwnership.toString()) : 0) // Already in percentage format from fetchSong
        // Clamp percentage to valid range (0-100) to prevent validation errors
        percentage = Math.max(0, Math.min(100, percentage))
        return {
          songCollaboratorId: sc.id,
          percentage,
        }
      })
      
      const response = await fetch("/api/splits/publishing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songId: song.id,
          splits,
        }),
      })
      if (response.ok) {
        await fetchSong()
        setEditingPublishingShare(null)
      } else {
        const errorData = await response.json()
        const errorMessage = typeof errorData.error === 'string' 
          ? errorData.error 
          : typeof errorData.details === 'string'
          ? errorData.details
          : "Failed to update publishing share"
        alert(errorMessage)
      }
    } catch (error) {
      console.error("Error updating publishing share:", error)
      alert("Failed to update publishing share")
    } finally {
      setUpdatingSplits(false)
    }
  }

  const handleUpdateMasterShare = async (songCollaboratorId: string, newPercentage: number) => {
    if (!song) return
    if (!song.publishingLocked) {
      alert("Publishing splits must be locked before master splits can be set")
      return
    }
    if (song.masterLocked) {
      alert("Master splits are locked and cannot be modified")
      return
    }

    setUpdatingSplits(true)
    try {
      // Get all master-eligible collaborators (excluding label)
      const eligibleCollaborators = song.songCollaborators.filter((sc) => {
        const role = sc.roleInSong as CollaboratorRole
        return isMasterEligible(role) && role !== "label"
      })
      
      // Build splits array, updating the one being edited
      const splits = eligibleCollaborators.map((sc) => {
        let percentage: number
        if (sc.id === songCollaboratorId) {
          // Use the new percentage directly (already in 0-100 range)
          percentage = newPercentage
        } else {
          // masterOwnership is already in percentage format (0-100) from fetchSong
          percentage = sc.masterOwnership ? parseFloat(sc.masterOwnership.toString()) : 0
        }
        // Clamp percentage to valid range (0-100)
        percentage = Math.max(0, Math.min(100, percentage))
        return {
          songCollaboratorId: sc.id,
          percentage,
        }
      })
      
      // Clamp labelMasterShare to valid range
      // labelMasterShare is already in percentage format (0-100) from fetchSong
      let labelMasterShare = 0
      if (song.labelMasterShare) {
        labelMasterShare = parseFloat(song.labelMasterShare.toString())
        labelMasterShare = Math.max(0, Math.min(100, labelMasterShare))
      }
      
      const response = await fetch("/api/splits/master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songId: song.id,
          splits,
          labelMasterShare,
        }),
      })
      if (response.ok) {
        await fetchSong()
        setEditingMasterShare(null)
      } else {
        const errorData = await response.json()
        let errorMessage = "Failed to update master share"
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error
          if (typeof errorData.details === 'string' && errorData.details) {
            errorMessage += `: ${errorData.details}`
          }
        } else if (typeof errorData.details === 'string') {
          errorMessage = errorData.details
        }
        alert(errorMessage)
      }
    } catch (error) {
      console.error("Error updating master share:", error)
      alert("Failed to update master share")
    } finally {
      setUpdatingSplits(false)
    }
  }

  const handleLockPublishing = async () => {
    if (!song) return
    setUpdatingSplits(true)
    try {
      const response = await fetch("/api/splits/publishing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: song.id, action: "lock" }),
      })
      if (response.ok) {
        await fetchSong()
      } else {
        const errorData = await response.json()
        const errorMessage = typeof errorData.error === 'string' 
          ? errorData.error 
          : typeof errorData.details === 'string'
          ? errorData.details
          : "Failed to lock publishing splits"
        alert(errorMessage)
      }
    } catch (error) {
      console.error("Error locking publishing splits:", error)
      alert("Failed to lock publishing splits")
    } finally {
      setUpdatingSplits(false)
    }
  }

  const handleUnlockPublishing = async () => {
    if (!song) return
    setUpdatingSplits(true)
    try {
      const response = await fetch("/api/splits/publishing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: song.id, action: "unlock" }),
      })
      if (response.ok) {
        await fetchSong()
      } else {
        const errorData = await response.json()
        const errorMessage = typeof errorData.error === 'string' 
          ? errorData.error 
          : typeof errorData.details === 'string'
          ? errorData.details
          : "Failed to unlock publishing splits"
        alert(errorMessage)
      }
    } catch (error) {
      console.error("Error unlocking publishing splits:", error)
      alert("Failed to unlock publishing splits")
    } finally {
      setUpdatingSplits(false)
    }
  }

  const handleLockMaster = async () => {
    if (!song) return
    setUpdatingSplits(true)
    try {
      const response = await fetch("/api/splits/master", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: song.id, action: "lock" }),
      })
      if (response.ok) {
        await fetchSong()
      } else {
        const errorData = await response.json()
        const errorMessage = typeof errorData.error === 'string' 
          ? errorData.error 
          : typeof errorData.details === 'string'
          ? errorData.details
          : "Failed to lock master splits"
        alert(errorMessage)
      }
    } catch (error) {
      console.error("Error locking master splits:", error)
      alert("Failed to lock master splits")
    } finally {
      setUpdatingSplits(false)
    }
  }

  const handleUnlockMaster = async () => {
    if (!song) return
    setUpdatingSplits(true)
    try {
      const response = await fetch("/api/splits/master", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: song.id, action: "unlock" }),
      })
      if (response.ok) {
        await fetchSong()
      } else {
        const errorData = await response.json()
        const errorMessage = typeof errorData.error === 'string' 
          ? errorData.error 
          : typeof errorData.details === 'string'
          ? errorData.details
          : "Failed to unlock master splits"
        alert(errorMessage)
      }
    } catch (error) {
      console.error("Error unlocking master splits:", error)
      alert("Failed to unlock master splits")
    } finally {
      setUpdatingSplits(false)
    }
  }

  const handleUpdateRiverEmberPublishing = async (newPercentage: number) => {
    if (!song) return
    if (song.publishingLocked) {
      alert("Publishing splits are locked and cannot be modified")
      return
    }

    setUpdatingSplits(true)
    try {
      // Get the River & Ember publishing entity (should be internal)
      const riverEmberEntity = availablePublishingEntities.find(e => e.name === "River & Ember Publishing" || e.name.includes("River") && e.name.includes("Ember"))
      if (!riverEmberEntity) {
        alert("River & Ember Publishing entity not found. Please create it first.")
        setUpdatingSplits(false)
        return
      }

      // Get all publishing entities for this song
      const currentEntities = song.songPublishingEntities || []
      const riverEmberEntityExists = currentEntities.find(spe => spe.publishingEntity.id === riverEmberEntity.id)

      // Build entities array - if River & Ember exists, update it; otherwise add it
      const entities = currentEntities
        .filter(spe => spe.publishingEntity.id !== riverEmberEntity.id)
        .map(spe => ({
          publishingEntityId: spe.publishingEntity.id,
          ownershipPercentage: spe.ownershipPercentage ? parseFloat(spe.ownershipPercentage.toString()) : 0,
        }))

      // Add or update River & Ember
      entities.push({
        publishingEntityId: riverEmberEntity.id,
        ownershipPercentage: newPercentage,
      })

      const response = await fetch(`/api/songs/${song.id}/publishing-entities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entities }),
      })
      if (response.ok) {
        await fetchSong()
        setEditingRiverEmberPublishing(false)
      } else {
        const errorData = await response.json()
        const errorMessage = typeof errorData.error === 'string' 
          ? errorData.error 
          : typeof errorData.details === 'string'
          ? errorData.details
          : "Failed to update River & Ember publishing share"
        alert(errorMessage)
      }
    } catch (error) {
      console.error("Error updating River & Ember publishing share:", error)
      alert("Failed to update River & Ember publishing share")
    } finally {
      setUpdatingSplits(false)
    }
  }

  const handleUpdateRiverEmberMaster = async (newPercentage: number) => {
    if (!song) return
    if (!song.publishingLocked) {
      alert("Publishing splits must be locked before master splits can be set")
      return
    }
    if (song.masterLocked) {
      alert("Master splits are locked and cannot be modified")
      return
    }

    setUpdatingSplits(true)
    try {
      const response = await fetch(`/api/songs/${song.id}/label-share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labelMasterShare: newPercentage,
        }),
      })
      if (response.ok) {
        await fetchSong()
        setEditingRiverEmberMaster(false)
      } else {
        const errorData = await response.json()
        const errorMessage = typeof errorData.error === 'string' 
          ? errorData.error 
          : typeof errorData.details === 'string'
          ? errorData.details
          : "Failed to update River & Ember master share"
        alert(errorMessage)
      }
    } catch (error) {
      console.error("Error updating River & Ember master share:", error)
      alert("Failed to update River & Ember master share")
    } finally {
      setUpdatingSplits(false)
    }
  }

  const handleDeleteCollaborator = async (songCollaboratorId: string, collaboratorName: string, roleInSong?: string) => {
    if (!song) return
    
    // Find the specific collaborator record to get the role
    const songCollaborator = song.songCollaborators.find(sc => sc.id === songCollaboratorId)
    const role = songCollaborator?.roleInSong || roleInSong || "this role"
    const roleLabel = role === "writer" ? "Writer" : role === "producer" ? "Producer" : role === "artist" ? "Artist" : role === "musician" ? "Musician" : role === "vocalist" ? "Vocalist" : role
    
    const confirmed = window.confirm(
      `Are you sure you want to remove ${collaboratorName} as a ${roleLabel} from this song? This will only remove their ${roleLabel} role and associated shares for this role.`
    )
    
    if (!confirmed) return

    setDeletingCollaboratorId(songCollaboratorId)
    try {
      const response = await fetch(
        `/api/songs/${song.id}/collaborators?songCollaboratorId=${songCollaboratorId}`,
        {
          method: "DELETE",
        }
      )

      if (response.ok) {
        // Refresh song data to reflect the deletion
        await fetchSong()
        // Also refresh contracts
        await fetchContracts(song.id)
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || "Failed to remove collaborator"}`)
      }
    } catch (error) {
      console.error("Error deleting collaborator:", error)
      alert("Failed to remove collaborator")
    } finally {
      setDeletingCollaboratorId(null)
    }
  }

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/4c8d8774-18d6-406e-b702-2dc324f31e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/dashboard/songs/[id]/page.tsx:57',message:'useEffect triggered',data:{paramsId:params?.id,paramsKeys:params?Object.keys(params):null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (params?.id) {
      fetchSong()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id])

  // Fetch available publishing entities
  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const response = await fetch("/api/publishing-entities")
        if (response.ok) {
          const data = await response.json()
          setAvailablePublishingEntities(data)
        }
      } catch (error) {
        console.error("Error fetching publishing entities:", error)
      }
    }
    if (isAdmin) {
      fetchEntities()
    }
  }, [isAdmin])

  const fetchSong = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/4c8d8774-18d6-406e-b702-2dc324f31e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/dashboard/songs/[id]/page.tsx:64',message:'fetchSong entry',data:{paramsId:params?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (!params?.id) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/4c8d8774-18d6-406e-b702-2dc324f31e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/dashboard/songs/[id]/page.tsx:66',message:'No params.id found',data:{params:params},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.error("No song ID in params:", params)
      setLoading(false)
      return
    }
    try {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/4c8d8774-18d6-406e-b702-2dc324f31e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/dashboard/songs/[id]/page.tsx:71',message:'Before API call',data:{songId:params.id,url:`/api/songs/${params.id}`},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.log("Fetching song with ID:", params.id)
      const response = await fetch(`/api/songs/${params.id}`)
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/4c8d8774-18d6-406e-b702-2dc324f31e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/dashboard/songs/[id]/page.tsx:73',message:'API response received',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.log("Response status:", response.status)
      if (response.ok) {
        const data = await response.json()
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/4c8d8774-18d6-406e-b702-2dc324f31e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/dashboard/songs/[id]/page.tsx:75',message:'Song data received',data:{songId:data?.id,songTitle:data?.title,hasCollaborators:!!data?.songCollaborators,hasPublishingEntities:!!data?.songPublishingEntities},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        console.log("Song data received:", data)
        // Convert Decimal to number
        // Format dates for input fields (YYYY-MM-DD)
        const formatDateForInput = (date: string | Date | null) => {
          if (!date) return ""
          try {
            const d = typeof date === "string" ? new Date(date) : date
            return d.toISOString().split("T")[0]
          } catch {
            return ""
          }
        }

        const processedData = {
          ...data,
          releaseDate: data.releaseDate ? formatDateForInput(data.releaseDate) : null,
          recordingDate: data.recordingDate ? formatDateForInput(data.recordingDate) : null,
          labelMasterShare: data.labelMasterShare
            ? parseFloat(data.labelMasterShare.toString()) * 100 // Convert to percentage (0-100) for MasterSplitEditor
            : null,
          songCollaborators: data.songCollaborators.map((sc: any) => ({
            ...sc,
            publishingOwnership: sc.publishingOwnership
              ? parseFloat(sc.publishingOwnership.toString()) * 100
              : null,
            masterOwnership: sc.masterOwnership
              ? parseFloat(sc.masterOwnership.toString()) * 100
              : null,
          })),
          songPublishingEntities: data.songPublishingEntities?.map((spe: any) => ({
            ...spe,
            ownershipPercentage: spe.ownershipPercentage
              ? parseFloat(spe.ownershipPercentage.toString()) * 100 // Convert to percentage
              : null,
          })) || [],
        }
        setSong(processedData)
        
        // Fetch contracts for this song
        await fetchContracts(typeof params.id === 'string' ? params.id : params.id[0])
        
        // Initialize edit form data
        setEditFormData({
          title: processedData.title || "",
          isrcCode: processedData.isrcCode || "",
          iswcCode: processedData.iswcCode || "",
          catalogNumber: processedData.catalogNumber || "",
          releaseDate: processedData.releaseDate || "",
          proWorkRegistrationNumber: processedData.proWorkRegistrationNumber || "",
          publishingAdmin: processedData.publishingAdmin || "",
          masterOwner: processedData.masterOwner || "",
          genre: processedData.genre || "",
          subGenre: processedData.subGenre || "",
          duration: processedData.duration?.toString() || "",
          recordingDate: processedData.recordingDate || "",
          recordingLocation: processedData.recordingLocation || "",
          notes: processedData.notes || "",
          promoMaterialsFolderId: processedData.promoMaterialsFolderId || "",
          status: processedData.status || "draft",
        })
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/4c8d8774-18d6-406e-b702-2dc324f31e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/dashboard/songs/[id]/page.tsx:96',message:'Song set in state',data:{songId:processedData?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/4c8d8774-18d6-406e-b702-2dc324f31e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/dashboard/songs/[id]/page.tsx:99',message:'API error response',data:{status:response.status,errorData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        console.error("Error fetching song:", response.status, errorData)
        // Set song to null to show error message
        setSong(null)
      }
    } catch (error) {
      console.error("Error fetching song:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!song) return

    const confirmed = window.confirm(
      `Are you sure you want to delete "${song.title}"? This action cannot be undone.`
    )

    if (!confirmed) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/songs/${song.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        router.push("/dashboard/songs")
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || "Failed to delete song"}`)
        setDeleting(false)
      }
    } catch (error) {
      console.error("Error deleting song:", error)
      alert("Failed to delete song")
      setDeleting(false)
    }
  }

  const handleEdit = () => {
    if (!song) return
    setEditing(true)
  }

  const handleCancelEdit = () => {
    if (!song) return
    // Reset form data to original song values
    setEditFormData({
      title: song.title || "",
      isrcCode: song.isrcCode || "",
      iswcCode: song.iswcCode || "",
      catalogNumber: song.catalogNumber || "",
      releaseDate: song.releaseDate || "",
      proWorkRegistrationNumber: song.proWorkRegistrationNumber || "",
      publishingAdmin: song.publishingAdmin || "",
      masterOwner: song.masterOwner || "",
      genre: song.genre || "",
      subGenre: song.subGenre || "",
      duration: song.duration?.toString() || "",
      recordingDate: song.recordingDate || "",
      recordingLocation: song.recordingLocation || "",
      notes: song.notes || "",
      promoMaterialsFolderId: song.promoMaterialsFolderId || "",
      status: song.status || "draft",
    })
    setEditing(false)
  }

  const handleSave = async () => {
    if (!song) return

    setSaving(true)
    try {
      const payload = {
        title: editFormData.title,
        isrcCode: editFormData.isrcCode || null,
        iswcCode: editFormData.iswcCode || null,
        catalogNumber: editFormData.catalogNumber || null,
        releaseDate: editFormData.releaseDate || null,
        proWorkRegistrationNumber: editFormData.proWorkRegistrationNumber || null,
        publishingAdmin: editFormData.publishingAdmin || null,
        masterOwner: editFormData.masterOwner || null,
        genre: editFormData.genre || null,
        subGenre: editFormData.subGenre || null,
        duration: editFormData.duration ? parseInt(editFormData.duration) : null,
        recordingDate: editFormData.recordingDate || null,
        recordingLocation: editFormData.recordingLocation || null,
        notes: editFormData.notes || null,
        promoMaterialsFolderId: editFormData.promoMaterialsFolderId || null,
        status: editFormData.status,
      }
      
      console.log("Saving song with payload:", payload)
      
      const response = await fetch(`/api/songs/${song.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setEditing(false)
        fetchSong() // Refresh song data
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || "Failed to update song"}`)
      }
    } catch (error) {
      console.error("Error updating song:", error)
      alert("Failed to update song")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!song && !loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Song Not Found</h1>
          <p className="text-muted-foreground">
            The song you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
          </p>
        </div>
        <Link href="/dashboard/songs">
          <Button>Back to Songs</Button>
        </Link>
      </div>
    )
  }

  // TypeScript assertion: song is guaranteed to be non-null here due to early return above
  if (!song) {
    return null // This should never happen due to early return, but satisfies TypeScript
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{song.title}</h1>
          <p className="text-muted-foreground">
            {song.isrcCode && `ISRC: ${song.isrcCode}`}
            {song.catalogNumber && ` • Catalog: ${song.catalogNumber}`}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && !editing && (
            <>
              <Button
                variant="outline"
                onClick={handleEdit}
              >
                Edit Song
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Song"}
              </Button>
            </>
          )}
          {isAdmin && editing && (
            <>
              <Button
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={saving}
              >
                Cancel
              </Button>
            </>
          )}
          <Link href="/dashboard/songs">
            <Button variant="outline">Back to Songs</Button>
          </Link>
        </div>
      </div>

      {/* Song Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Song Details</CardTitle>
          <CardDescription>
            {editing ? "Edit song information" : "Song information and metadata"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title *</Label>
                  <Input
                    id="edit-title"
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-catalogNumber">Catalog Number</Label>
                  <Input
                    id="edit-catalogNumber"
                    value={editFormData.catalogNumber}
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">Catalog number is permanent and cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-isrcCode">ISRC Code</Label>
                  <Input
                    id="edit-isrcCode"
                    value={editFormData.isrcCode}
                    onChange={(e) => setEditFormData({ ...editFormData, isrcCode: e.target.value })}
                    placeholder="US-S1Z-99-00001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-iswcCode">ISWC</Label>
                  <Input
                    id="edit-iswcCode"
                    value={editFormData.iswcCode}
                    onChange={(e) => setEditFormData({ ...editFormData, iswcCode: e.target.value })}
                    placeholder="T-123456789-0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-proWorkRegistrationNumber">ASCAP Work ID (optional)</Label>
                  <Input
                    id="edit-proWorkRegistrationNumber"
                    value={editFormData.proWorkRegistrationNumber}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, proWorkRegistrationNumber: e.target.value })
                    }
                    placeholder="e.g. 123456789"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-duration">Duration (seconds)</Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    value={editFormData.duration}
                    onChange={(e) => setEditFormData({ ...editFormData, duration: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-genre">Genre</Label>
                  <Input
                    id="edit-genre"
                    value={editFormData.genre}
                    onChange={(e) => setEditFormData({ ...editFormData, genre: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-releaseDate">Release Date</Label>
                  <Input
                    id="edit-releaseDate"
                    type="date"
                    value={editFormData.releaseDate}
                    onChange={(e) => setEditFormData({ ...editFormData, releaseDate: e.target.value })}
                  />
                </div>

                {/* Additional fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-publishingAdmin">Publishing Administrator</Label>
                    <Input
                      id="edit-publishingAdmin"
                      value={editFormData.publishingAdmin}
                      onChange={(e) => setEditFormData({ ...editFormData, publishingAdmin: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-masterOwner">Master Owner</Label>
                  <Input
                    id="edit-masterOwner"
                    value={editFormData.masterOwner}
                    onChange={(e) => setEditFormData({ ...editFormData, masterOwner: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-subGenre">Sub-Genre</Label>
                  <Input
                    id="edit-subGenre"
                    value={editFormData.subGenre}
                    onChange={(e) => setEditFormData({ ...editFormData, subGenre: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-recordingDate">Recording Date</Label>
                  <Input
                    id="edit-recordingDate"
                    type="date"
                    value={editFormData.recordingDate}
                    onChange={(e) => setEditFormData({ ...editFormData, recordingDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-recordingLocation">Recording Location</Label>
                  <Input
                    id="edit-recordingLocation"
                    value={editFormData.recordingLocation}
                    onChange={(e) => setEditFormData({ ...editFormData, recordingLocation: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-promoMaterialsFolderId">
                    Promo Materials Folder ID
                  </Label>
                  <Input
                    id="edit-promoMaterialsFolderId"
                    value={editFormData.promoMaterialsFolderId}
                    onChange={(e) => setEditFormData({ ...editFormData, promoMaterialsFolderId: e.target.value })}
                    placeholder="Get from Google Drive folder URL"
                  />
                  <p className="text-xs text-muted-foreground">
                    Copy the folder ID from your Google Drive URL: drive.google.com/drive/folders/<strong>FOLDER_ID</strong>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <select
                    id="edit-status"
                    className="w-full border rounded-md p-2"
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Draft songs are in progress. Active songs are released and visible. Archived songs are no longer active.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Lyrics</Label>
                <textarea
                  id="edit-notes"
                  className="w-full min-h-[400px] p-2 border rounded-md resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  placeholder="Enter song lyrics..."
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              <div className="grid gap-4">
                {/* Always visible fields */}
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Title</div>
                  <div className="text-lg font-semibold">{song.title}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Catalog Number</div>
                  <div>{song.catalogNumber || "—"}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground">ISRC Code</div>
                  <div>{song.isrcCode || "—"}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground">ISWC</div>
                  <div>{song.iswcCode || "—"}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground">ASCAP Work ID</div>
                  <div>{song.proWorkRegistrationNumber || "—"}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Duration</div>
                  <div>{song.duration ? `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, "0")}` : "—"}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Genre</div>
                  <div>{song.genre || "—"}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Release Date</div>
                  <div>
                    {song.releaseDate ? (() => {
                      try {
                        const date = typeof song.releaseDate === "string" 
                          ? (song.releaseDate.includes("T") ? new Date(song.releaseDate) : new Date(song.releaseDate + "T00:00:00"))
                          : new Date(song.releaseDate)
                        return date.toLocaleDateString()
                      } catch {
                        return song.releaseDate
                      }
                    })() : "—"}
                  </div>
                </div>
                
                {song.publishingAdmin && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Publishing Administrator</div>
                    <div>{song.publishingAdmin}</div>
                  </div>
                )}
                
                {song.masterOwner && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Master Owner</div>
                    <div>{song.masterOwner}</div>
                  </div>
                )}
                
                {song.subGenre && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Sub-Genre</div>
                    <div>{song.subGenre}</div>
                  </div>
                )}
                
                {song.recordingDate && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Recording Date</div>
                    <div>
                      {(() => {
                        try {
                          const date = typeof song.recordingDate === "string" 
                            ? (song.recordingDate.includes("T") ? new Date(song.recordingDate) : new Date(song.recordingDate + "T00:00:00"))
                            : new Date(song.recordingDate)
                          return date.toLocaleDateString()
                        } catch {
                          return song.recordingDate
                        }
                      })()}
                    </div>
                  </div>
                )}
                
                {song.recordingLocation && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Recording Location</div>
                    <div>{song.recordingLocation}</div>
                  </div>
                )}
                
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Status</div>
                  <div className="capitalize">{song.status}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Lyrics</div>
                {song.notes ? (
                  <div className="whitespace-pre-wrap p-4 border rounded-md bg-muted/50 min-h-[400px]">{song.notes}</div>
                ) : (
                  <div className="whitespace-pre-wrap p-4 border rounded-md bg-muted/50 min-h-[400px] text-muted-foreground italic">No lyrics entered</div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Collaborators</CardTitle>
            <CardDescription>Manage collaborators for this song</CardDescription>
          </div>
          {isAdmin && song && (
            <Link href={`/dashboard/email?songId=${song.id}&scope=song_collaborators`}>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                Email collaborators
              </Button>
            </Link>
          )}
        </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Publishing Share Section: admins see if any have publishing; non-admins only if they have publishing allocation */}
              {((isAdmin && song.songCollaborators.some((sc) => {
                const role = sc.roleInSong as CollaboratorRole
                const publishing = sc.publishingOwnership ? parseFloat(sc.publishingOwnership.toString()) : 0
                return (role === "writer" || role === "label") && publishing > 0
              })) || (!isAdmin && currentUserHasPublishing)) && (
                <div className="grid grid-cols-[2fr_1fr] gap-4">
                  <Card>
                    <CardHeader className="p-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Publishing Share</CardTitle>
                      {isAdmin && (
                        song.publishingLocked ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleUnlockPublishing}
                            disabled={updatingSplits}
                            className="h-7 text-xs"
                          >
                            Unlock Splits
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleLockPublishing}
                            disabled={updatingSplits}
                            className="h-7 text-xs"
                          >
                            Lock Splits
                          </Button>
                        )
                      )}
                      {isAdmin && !song.publishingLocked && (() => {
                        // Calculate publishing totals - use editing value if currently editing
                        const eligibleCollaborators = song.songCollaborators.filter((sc) => 
                          isPublishingEligible(sc.roleInSong as CollaboratorRole)
                        )
                        const collaboratorTotal = eligibleCollaborators.reduce((sum, sc) => {
                          // If this collaborator is being edited, use the editing value
                          if (editingPublishingShare === sc.id && publishingShareValue !== "") {
                            const editingValue = parseFloat(publishingShareValue) || 0
                            return sum + editingValue
                          }
                          const publishing = sc.publishingOwnership ? parseFloat(sc.publishingOwnership.toString()) : 0
                          return sum + publishing
                        }, 0)
                        const entityTotal = (() => {
                          // If editing River & Ember publishing share, use editing value
                          if (editingRiverEmberPublishing && riverEmberPublishingValue !== "") {
                            const editingValue = parseFloat(riverEmberPublishingValue) || 0
                            // Get other entities (non-River & Ember)
                            const otherEntities = (song.songPublishingEntities || []).filter(spe => 
                              spe.publishingEntity.name !== "River & Ember Publishing" && 
                              !(spe.publishingEntity.name.includes("River") && spe.publishingEntity.name.includes("Ember"))
                            )
                            const otherTotal = otherEntities.reduce((sum, spe) => {
                              const percentage = spe.ownershipPercentage ? parseFloat(spe.ownershipPercentage.toString()) : 0
                              return sum + percentage
                            }, 0)
                            return otherTotal + editingValue
                          }
                          // Otherwise use saved values
                          return (song.songPublishingEntities || []).reduce((sum, spe) => {
                            const percentage = spe.ownershipPercentage ? parseFloat(spe.ownershipPercentage.toString()) : 0
                            return sum + percentage
                          }, 0)
                        })()
                        const total = collaboratorTotal + entityTotal
                        const isValid = Math.abs(collaboratorTotal - 50) < 0.01 && Math.abs(entityTotal - 50) < 0.01
                        return (
                          <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded text-xs">
                            <span className="text-muted-foreground">Total:</span>
                            <span className={`font-bold ${isValid ? "text-green-600" : "text-red-600"}`}>
                              {total.toFixed(2)}%
                            </span>
                            <span className="text-muted-foreground">
                              (Writer: {collaboratorTotal.toFixed(2)}% • River & Ember: {entityTotal.toFixed(2)}%)
                            </span>
                          </div>
                        )
                      })()}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      {isAdmin && !song.publishingLocked && (
                        <div className="mb-3">
                          <Link href={`/dashboard/songs/${song.id}/add-collaborator?section=publishing`}>
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                              Add Collaborator
                            </Button>
                          </Link>
                        </div>
                      )}
                      <div className="space-y-2">
                        {/* Wrapper div to ensure all rows share same grid template */}
                        <div className="grid grid-cols-[auto_auto_auto_1fr] gap-3">
                        {/* Header row - using same grid as data rows */}
                        <div className="contents">
                          <div className="font-medium text-sm pb-2 border-b">Name</div>
                          <div className="font-medium text-sm pb-2 border-b">Role</div>
                          <div className="font-medium text-sm pb-2 border-b">Share</div>
                          <div className="font-medium text-sm text-right pb-2 border-b">Contracts</div>
                        </div>
                    {song.songCollaborators
                      .filter((sc) => {
                        const role = sc.roleInSong as CollaboratorRole
                        const publishing = sc.publishingOwnership ? parseFloat(sc.publishingOwnership.toString()) : 0
                        // Only show Writers and Label in Publishing section, and only if they have publishing shares
                        return (role === "writer" || role === "label") && publishing > 0
                      })
                      .filter((sc) => {
                        // If user can't see all shares, only show their own
                        if (!canSeeAllShares) {
                          return sc.collaborator.id === session?.user?.id
                        }
                        return true
                      })
                      .map((sc) => {
                        const publishing = sc.publishingOwnership ? parseFloat(sc.publishingOwnership.toString()) : 0
                        const isCurrentUser = sc.collaborator.id === session?.user?.id
                        const collaboratorName = [sc.collaborator.firstName, sc.collaborator.middleName, sc.collaborator.lastName].filter(Boolean).join(" ")
                        const roleLabels: Record<CollaboratorRole, string> = {
                          writer: "Writer",
                          producer: "Producer",
                          musician: "Musician",
                          artist: "Artist",
                          vocalist: "Vocalist",
                          label: "Label",
                        }
                        const roleLabel = roleLabels[sc.roleInSong as CollaboratorRole] || sc.roleInSong
                        const availableRoles = sc.collaborator.capableRoles || []
                        const isEditingRole = editingRoleId === sc.id
                        const isUpdatingRole = updatingRoleId === sc.id
                        const contractType: ContractType = "songwriter_publishing"
                        const isGenerating = generatingContractId === `${sc.id}-${contractType}`
                        const contractStatus = getContractStatus(sc.id, contractType)
                        const isSent = contractStatus.status === "sent" || contractStatus.status === "signed"
                        const isSigned = contractStatus.status === "signed"
                        const canResend = contractStatus.status === "sent" && !isSigned
                        
                        return (
                          <div
                            key={`publishing-${sc.id}`}
                            className="contents"
                          >
                            {/* Column 1: Name and Remove */}
                            <div className="flex flex-col p-3 border rounded">
                                <span className="font-medium whitespace-nowrap">{collaboratorName}</span>
                                {isAdmin && (
                                  <button
                                    onClick={() => handleDeleteCollaborator(sc.id, collaboratorName, sc.roleInSong as string)}
                                    disabled={deletingCollaboratorId === sc.id}
                                    className="text-xs text-red-600 hover:text-red-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed text-left mt-1"
                                  >
                                    {deletingCollaboratorId === sc.id ? "Removing..." : "Remove"}
                                  </button>
                                )}
                              </div>

                            {/* Column 2: Role with Edit button below — show role for current user even when canSeeAllShares is false */}
                            <div className="flex flex-col p-3 border rounded">
                              {(canSeeAllShares || isCurrentUser) && (
                                <>
                                  {isAdmin && isEditingRole ? (
                                    <>
                                      <Select
                                        value={sc.roleInSong}
                                        onValueChange={(value) => handleUpdateRole(sc.id, value as CollaboratorRole)}
                                        disabled={isUpdatingRole}
                                      >
                                        <SelectTrigger className="h-7 w-full text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {[...availableRoles, "label"].map((role) => (
                                            <SelectItem key={role} value={role}>
                                              {roleLabels[role as CollaboratorRole] || role}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs mt-1 self-start"
                                        onClick={() => setEditingRoleId(null)}
                                        disabled={isUpdatingRole}
                                      >
                                        Cancel
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-sm text-muted-foreground whitespace-nowrap">{roleLabel}</span>
                                      {isAdmin && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-xs mt-1 self-start"
                                          onClick={() => setEditingRoleId(sc.id)}
                                          disabled={isUpdatingRole}
                                        >
                                          Edit
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Column 3: Share Percentage with Edit button below */}
                            <div className="flex flex-col p-3 border rounded">
                              {isAdmin && !song.publishingLocked && !editingPublishingShare ? (
                                <>
                                  <div className="text-sm text-muted-foreground">
                                    <span className="whitespace-nowrap">{publishing.toFixed(2)}%</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-1 text-xs mt-1 self-start"
                                    onClick={() => {
                                      setEditingPublishingShare(sc.id)
                                      setPublishingShareValue(publishing.toFixed(2))
                                    }}
                                    disabled={updatingSplits}
                                  >
                                    Edit
                                  </Button>
                                </>
                              ) : isAdmin && !song.publishingLocked && editingPublishingShare === sc.id ? (
                                <>
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max="100"
                                      value={publishingShareValue}
                                      onChange={(e) => setPublishingShareValue(e.target.value)}
                                      className="h-6 w-14 text-xs"
                                      autoFocus
                                    />
                                    <span className="text-sm text-muted-foreground">%</span>
                                  </div>
                                  <div className="flex gap-1 mt-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-1 text-xs"
                                      onClick={() => {
                                        const value = parseFloat(publishingShareValue)
                                        if (!isNaN(value) && value >= 0 && value <= 100) {
                                          handleUpdatePublishingShare(sc.id, value)
                                        } else {
                                          alert("Please enter a valid percentage between 0 and 100")
                                        }
                                      }}
                                      disabled={updatingSplits}
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-1 text-xs"
                                      onClick={() => setEditingPublishingShare(null)}
                                      disabled={updatingSplits}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                <div className="text-sm text-muted-foreground">
                                  <span className="whitespace-nowrap">{publishing.toFixed(2)}%</span>
                                </div>
                              )}
                            </div>

                            {/* Column 4: Contract Status and Buttons */}
                            <div className="flex gap-2 items-center justify-evenly flex-wrap p-3 border rounded min-w-0">
                                    {contractStatus.status && (
                                <span className={`px-2 py-0.5 rounded text-xs whitespace-nowrap ${
                                  isSigned 
                                    ? "bg-green-100 text-green-800" 
                                    : contractStatus.status === "sent"
                                    ? "bg-blue-100 text-blue-800"
                                    : contractStatus.status === "draft"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : contractStatus.status === "declined"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}>
                                  {isSigned ? "Signed" : contractStatus.status === "sent" ? "Sent" : contractStatus.status === "draft" ? "Draft" : contractStatus.status === "declined" ? "Declined" : contractStatus.status}
                                </span>
                              )}
                              {isAdmin && contractStatus.contractId && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRefreshStatus(contractStatus.contractId!)}
                                  disabled={refreshingStatusId === contractStatus.contractId}
                                  title="Refresh status from SignWell"
                                  className="h-7 w-7 p-0"
                                >
                                  {refreshingStatusId === contractStatus.contractId ? "⟳" : "↻"}
                                </Button>
                              )}
                              {(isCurrentUser || isAdmin) && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePreviewContract(sc.id, contractType, collaboratorName)}
                                    disabled={!song.masterLocked || isGenerating}
                                    className="h-7 text-xs px-2"
                                  >
                                    Preview
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDownloadContract(sc.id, contractType)}
                                    disabled={!song.masterLocked || isGenerating}
                                    title="Download contract as PDF"
                                    className="h-7 text-xs px-2"
                                  >
                                    Download
                                  </Button>
                                </>
                              )}
                              {isAdmin && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSendContract(sc.id, contractType, collaboratorName, true)}
                                    disabled={!song.masterLocked || isGenerating || isSigned}
                                    title="Create draft in SignWell (no emails sent)"
                                    className="h-7 text-xs px-2"
                                  >
                                    Draft
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSendContract(sc.id, contractType, collaboratorName, false)}
                                    disabled={!song.masterLocked || isGenerating || isSigned}
                                    className="h-7 text-xs px-2"
                                  >
                                    {isSigned ? "Signed" : canResend ? "Re-Send" : "Send"}
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                        </div>
                      </div>
                  
                  {/* River & Ember Publishing Share */}
                  {isAdmin && !song.publishingLocked && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between p-3 border rounded">
                        <div className="flex-1">
                          <div className="font-medium">River & Ember Share</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            {!editingRiverEmberPublishing ? (
                              <>
                                <span>{(() => {
                                  const riverEmberEntity = song.songPublishingEntities?.find(spe => 
                                    spe.publishingEntity.name === "River & Ember Publishing" || 
                                    spe.publishingEntity.name.includes("River") && spe.publishingEntity.name.includes("Ember")
                                  )
                                  return riverEmberEntity?.ownershipPercentage 
                                    ? parseFloat(riverEmberEntity.ownershipPercentage.toString()).toFixed(2)
                                    : "0.00"
                                })()}%</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => {
                                    setEditingRiverEmberPublishing(true)
                                    const riverEmberEntity = song.songPublishingEntities?.find(spe => 
                                      spe.publishingEntity.name === "River & Ember Publishing" || 
                                      spe.publishingEntity.name.includes("River") && spe.publishingEntity.name.includes("Ember")
                                    )
                                    setRiverEmberPublishingValue(
                                      riverEmberEntity?.ownershipPercentage 
                                        ? parseFloat(riverEmberEntity.ownershipPercentage.toString()).toFixed(2)
                                        : "50.00"
                                    )
                                  }}
                                  disabled={updatingSplits}
                                >
                                  Edit
                                </Button>
                              </>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  value={riverEmberPublishingValue}
                                  onChange={(e) => setRiverEmberPublishingValue(e.target.value)}
                                  className="h-6 w-16 text-xs"
                                  autoFocus
                                />
                                <span>%</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-1 text-xs"
                                  onClick={() => {
                                    const value = parseFloat(riverEmberPublishingValue)
                                    if (!isNaN(value) && value >= 0 && value <= 100) {
                                      handleUpdateRiverEmberPublishing(value)
                                    } else {
                                      alert("Please enter a valid percentage between 0 and 100")
                                    }
                                  }}
                                  disabled={updatingSplits}
                                >
                                  Save
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-1 text-xs"
                                  onClick={() => setEditingRiverEmberPublishing(false)}
                                  disabled={updatingSplits}
                                >
                                  Cancel
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                    </CardContent>
                  </Card>
                  
                  {/* Publishing Split Visualization */}
                  {canSeeAllShares && (
                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-lg">Publishing Splits</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <SplitPieChart
                          songCollaborators={song.songCollaborators}
                          songPublishingEntities={song.songPublishingEntities}
                          labelMasterShare={null}
                          showPublishingOnly={true}
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Master Revenue Share Section: admins see if any have master; non-admins only if they have master allocation */}
              {((isAdmin && song.songCollaborators.some((sc) => {
                const role = sc.roleInSong as CollaboratorRole
                return isMasterEligible(role) && role !== "label"
              })) || (!isAdmin && currentUserHasMaster)) && (
                <div className="grid grid-cols-[2fr_1fr] gap-4">
                  <Card>
                    <CardHeader className="p-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Master Revenue Share</CardTitle>
                      {isAdmin && song.publishingLocked && (
                        song.masterLocked ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleUnlockMaster}
                            disabled={updatingSplits}
                            className="h-7 text-xs"
                          >
                            Unlock Splits
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleLockMaster}
                            disabled={updatingSplits}
                            className="h-7 text-xs"
                          >
                            Lock Splits
                          </Button>
                        )
                      )}
                      {isAdmin && song.publishingLocked && !song.masterLocked && (() => {
                        // Calculate master totals - use editing value if currently editing
                        const eligibleCollaborators = song.songCollaborators.filter((sc) => {
                          const role = sc.roleInSong as CollaboratorRole
                          return isMasterEligible(role) && role !== "label"
                        })
                          const collaboratorTotal = eligibleCollaborators.reduce((sum, sc) => {
                            // If this collaborator is being edited, use the editing value
                            if (editingMasterShare === sc.id && masterShareValue !== "") {
                              const editingValue = parseFloat(masterShareValue) || 0
                              return sum + editingValue
                            }
                            // masterOwnership is already in percentage format (0-100) from fetchSong
                            const master = sc.masterOwnership ? parseFloat(sc.masterOwnership.toString()) : 0
                            return sum + master
                          }, 0)
                        const labelShare = (() => {
                          // If editing River & Ember master share, use editing value
                          if (editingRiverEmberMaster && riverEmberMasterValue !== "") {
                            return parseFloat(riverEmberMasterValue) || 0
                          }
                          // labelMasterShare is already in percentage format (0-100) from fetchSong
                          return song.labelMasterShare ? parseFloat(song.labelMasterShare.toString()) : 0
                        })()
                        const total = collaboratorTotal + labelShare
                        const isValid = Math.abs(total - 100) < 0.01
                        return (
                          <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded text-xs">
                            <span className="text-muted-foreground">Total:</span>
                            <span className={`font-bold ${isValid ? "text-green-600" : "text-red-600"}`}>
                              {total.toFixed(2)}%
                            </span>
                            <span className="text-muted-foreground">
                              (Collaborators: {collaboratorTotal.toFixed(2)}% • River & Ember: {labelShare.toFixed(2)}%)
                            </span>
                          </div>
                        )
                      })()}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      {isAdmin && song.publishingLocked && !song.masterLocked && (
                        <div className="mb-3">
                          <Link href={`/dashboard/songs/${song.id}/add-collaborator?section=master`}>
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                              Add Collaborator
                            </Button>
                          </Link>
                        </div>
                      )}
                      <div className="space-y-4">
                        {/* Wrapper div to ensure all rows share same grid template */}
                        <div className="grid grid-cols-[auto_auto_auto_1fr] gap-3">
                        {/* Header row - using same grid as data rows */}
                        <div className="contents">
                          <div className="font-medium text-sm pb-2 border-b">Name</div>
                          <div className="font-medium text-sm pb-2 border-b">Role</div>
                          <div className="font-medium text-sm pb-2 border-b">Share</div>
                          <div className="font-medium text-sm text-right pb-2 border-b">Contracts</div>
                        </div>
                    {(() => {
                      // Group collaborators by role type
                      const masterCollaborators = song.songCollaborators
                        .filter((sc) => {
                          const role = sc.roleInSong as CollaboratorRole
                          // Show all master-eligible collaborators (excluding label)
                          return isMasterEligible(role) && role !== "label"
                        })
                        .filter((sc) => {
                          // If user can't see all shares, only show their own
                          if (!canSeeAllShares) {
                            return sc.collaborator.id === session?.user?.id
                          }
                          return true
                        })

                      // Group by role
                      const groupedByRole: Record<string, typeof masterCollaborators> = {}
                      masterCollaborators.forEach((sc) => {
                        const role = sc.roleInSong as CollaboratorRole
                        if (!groupedByRole[role]) {
                          groupedByRole[role] = []
                        }
                        groupedByRole[role].push(sc)
                      })

                      // Define role order and labels
                      const roleOrder: CollaboratorRole[] = ["producer", "artist", "musician", "vocalist"] as CollaboratorRole[]
                      const roleLabels: Record<CollaboratorRole, string> = {
                        writer: "Writer",
                        producer: "Producer",
                        musician: "Musician",
                        artist: "Artist",
                        vocalist: "Vocalist",
                        label: "Label",
                      }

                      return roleOrder.map((role) => {
                        const collaborators = groupedByRole[role] || []
                        if (collaborators.length === 0) return null

                        return (
                          <div key={role} className="contents">
                            <div className="col-span-4 mb-2">
                              <h4 className="text-sm font-semibold text-muted-foreground ml-2">
                                {roleLabels[role]}
                              </h4>
                            </div>
                            {collaborators.map((sc) => {
                              // masterOwnership is already in percentage format (0-100) from fetchSong
                              const master = sc.masterOwnership ? parseFloat(sc.masterOwnership.toString()) : 0
                              const isCurrentUser = sc.collaborator.id === session?.user?.id
                              const collaboratorName = [sc.collaborator.firstName, sc.collaborator.middleName, sc.collaborator.lastName].filter(Boolean).join(" ")
                              // Use unique key combining role and songCollaborator id to prevent duplicates
                              const roleLabel = roleLabels[sc.roleInSong as CollaboratorRole] || sc.roleInSong
                              const availableRoles = sc.collaborator.capableRoles || []
                              const isEditingRole = editingRoleId === sc.id
                              const isUpdatingRole = updatingRoleId === sc.id
                              const contractType: ContractType = "digital_master_only"
                              const isGenerating = generatingContractId === `${sc.id}-${contractType}`
                              const contractStatus = getContractStatus(sc.id, contractType)
                              const isSent = contractStatus.status === "sent" || contractStatus.status === "signed"
                              const isSigned = contractStatus.status === "signed"
                              const canResend = contractStatus.status === "sent" && !isSigned
                              
                              return (
                                <div
                                  key={`master-${sc.id}`}
                                  className="contents"
                                >
                                  {/* Column 1: Name and Remove */}
                                  <div className="flex flex-col p-3 border rounded">
                                    <span className="font-medium whitespace-nowrap">{collaboratorName}</span>
                                    {isAdmin && (
                                      <button
                                        onClick={() => handleDeleteCollaborator(sc.id, collaboratorName, sc.roleInSong as string)}
                                        disabled={deletingCollaboratorId === sc.id}
                                        className="text-xs text-red-600 hover:text-red-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed text-left mt-1"
                                      >
                                        {deletingCollaboratorId === sc.id ? "Removing..." : "Remove"}
                                      </button>
                                    )}
                                  </div>

                                  {/* Column 2: Role with Edit button below — show role for current user even when canSeeAllShares is false */}
                                  <div className="flex flex-col p-3 border rounded">
                                        {(canSeeAllShares || isCurrentUser) && (
                                        <>
                                        {isAdmin && isEditingRole ? (
                                          <>
                                            <Select
                                              value={sc.roleInSong}
                                              onValueChange={(value) => handleUpdateRole(sc.id, value as CollaboratorRole)}
                                              disabled={isUpdatingRole}
                                            >
                                              <SelectTrigger className="h-7 w-full text-xs">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {[...availableRoles, "label"].map((role) => (
                                                  <SelectItem key={role} value={role}>
                                                    {roleLabels[role as CollaboratorRole] || role}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 px-2 text-xs mt-1 self-start"
                                              onClick={() => setEditingRoleId(null)}
                                              disabled={isUpdatingRole}
                                            >
                                              Cancel
                                            </Button>
                                          </>
                                        ) : (
                                          <>
                                            <span className="text-sm text-muted-foreground whitespace-nowrap">{roleLabel}</span>
                                            {isAdmin && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-xs mt-1 self-start"
                                                onClick={() => setEditingRoleId(sc.id)}
                                                disabled={isUpdatingRole}
                                              >
                                                Edit
                                              </Button>
                                            )}
                                          </>
                                        )}
                                      </>
                                    )}
                                  </div>

                                  {/* Column 3: Share Percentage with Edit button below */}
                                  <div className="flex flex-col p-3 border rounded">
                                    {isAdmin && song.publishingLocked && !song.masterLocked && !editingMasterShare ? (
                                      <>
                                        <div className="text-sm text-muted-foreground">
                                          <span className="whitespace-nowrap">{master.toFixed(2)}%</span>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-1 text-xs mt-1 self-start"
                                          onClick={() => {
                                            setEditingMasterShare(sc.id)
                                            setMasterShareValue(master.toFixed(2))
                                          }}
                                          disabled={updatingSplits}
                                        >
                                          Edit
                                        </Button>
                                      </>
                                    ) : isAdmin && song.publishingLocked && !song.masterLocked && editingMasterShare === sc.id ? (
                                      <>
                                        <div className="flex items-center gap-1">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={masterShareValue}
                                            onChange={(e) => setMasterShareValue(e.target.value)}
                                            className="h-6 w-14 text-xs"
                                            autoFocus
                                          />
                                          <span className="text-sm text-muted-foreground">%</span>
                                        </div>
                                        <div className="flex gap-1 mt-1">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-1 text-xs"
                                            onClick={() => {
                                              const value = parseFloat(masterShareValue)
                                              if (!isNaN(value) && value >= 0 && value <= 100) {
                                                handleUpdateMasterShare(sc.id, value)
                                              } else {
                                                alert("Please enter a valid percentage between 0 and 100")
                                              }
                                            }}
                                            disabled={updatingSplits}
                                          >
                                            Save
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-1 text-xs"
                                            onClick={() => setEditingMasterShare(null)}
                                            disabled={updatingSplits}
                                          >
                                            Cancel
                                          </Button>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="text-sm text-muted-foreground">
                                        <span className="whitespace-nowrap">{master.toFixed(2)}%</span>
                                      </div>
                                    )}
                                  </div>

                            {/* Column 4: Contract Status and Buttons */}
                            <div className="flex gap-2 items-center justify-evenly flex-wrap p-3 border rounded min-w-0">
                                    {contractStatus.status && (
                                      <span className={`px-2 py-0.5 rounded text-xs whitespace-nowrap ${
                                        isSigned 
                                          ? "bg-green-100 text-green-800" 
                                          : contractStatus.status === "sent"
                                          ? "bg-blue-100 text-blue-800"
                                          : contractStatus.status === "draft"
                                          ? "bg-yellow-100 text-yellow-800"
                                          : contractStatus.status === "declined"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-gray-100 text-gray-800"
                                      }`}>
                                        {isSigned ? "Signed" : contractStatus.status === "sent" ? "Sent" : contractStatus.status === "draft" ? "Draft" : contractStatus.status === "declined" ? "Declined" : contractStatus.status}
                                      </span>
                                    )}
                                    {isAdmin && contractStatus.contractId && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRefreshStatus(contractStatus.contractId!)}
                                        disabled={refreshingStatusId === contractStatus.contractId}
                                        title="Refresh status from SignWell"
                                        className="h-7 w-7 p-0"
                                      >
                                        {refreshingStatusId === contractStatus.contractId ? "⟳" : "↻"}
                                      </Button>
                                    )}
                                    {(isCurrentUser || isAdmin) && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handlePreviewContract(sc.id, contractType, collaboratorName)}
                                          disabled={!song.masterLocked || isGenerating}
                                          className="h-7 text-xs px-2"
                                        >
                                          Preview
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleDownloadContract(sc.id, contractType)}
                                          disabled={!song.masterLocked || isGenerating}
                                          title="Download contract as PDF"
                                          className="h-7 text-xs px-2"
                                        >
                                          Download
                                        </Button>
                                      </>
                                    )}
                                    {isAdmin && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleSendContract(sc.id, contractType, collaboratorName, true)}
                                          disabled={!song.masterLocked || isGenerating || isSigned}
                                          title="Create draft in SignWell (no emails sent)"
                                          className="h-7 text-xs px-2"
                                        >
                                          Draft
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleSendContract(sc.id, contractType, collaboratorName, false)}
                                          disabled={!song.masterLocked || isGenerating || isSigned}
                                          className="h-7 text-xs px-2"
                                        >
                                          {isSigned ? "Signed" : canResend ? "Re-Send" : "Send"}
                                        </Button>
                                    </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                          </div>
                        )
                      }).filter(Boolean)}
                    )()}
                        </div>
                      </div>
                  
                  {/* River & Ember Master Share */}
                  {isAdmin && song.publishingLocked && !song.masterLocked && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between p-3 border rounded">
                        <div className="flex-1">
                          <div className="font-medium">River & Ember Share</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            {!editingRiverEmberMaster ? (
                              <>
                                <span>{song.labelMasterShare ? parseFloat(song.labelMasterShare.toString()).toFixed(2) : "0.00"}%</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => {
                                    setEditingRiverEmberMaster(true)
                                    setRiverEmberMasterValue(
                                      song.labelMasterShare 
                                        ? parseFloat(song.labelMasterShare.toString()).toFixed(2)
                                        : "0.00"
                                    )
                                  }}
                                  disabled={updatingSplits}
                                >
                                  Edit
                                </Button>
                              </>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  value={riverEmberMasterValue}
                                  onChange={(e) => setRiverEmberMasterValue(e.target.value)}
                                  className="h-6 w-16 text-xs"
                                  autoFocus
                                />
                                <span>%</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-1 text-xs"
                                  onClick={() => {
                                    const value = parseFloat(riverEmberMasterValue)
                                    if (!isNaN(value) && value >= 0 && value <= 100) {
                                      handleUpdateRiverEmberMaster(value)
                                    } else {
                                      alert("Please enter a valid percentage between 0 and 100")
                                    }
                                  }}
                                  disabled={updatingSplits}
                                >
                                  Save
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-1 text-xs"
                                  onClick={() => setEditingRiverEmberMaster(false)}
                                  disabled={updatingSplits}
                                >
                                  Cancel
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                    </CardContent>
                  </Card>
                  
                  {/* Master Revenue Share Split Visualization */}
                  {canSeeAllShares && (
                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-lg">Master Splits</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <SplitPieChart
                          songCollaborators={song.songCollaborators}
                          songPublishingEntities={song.songPublishingEntities}
                          labelMasterShare={song.labelMasterShare}
                          showMasterOnly={true}
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
            {!song.masterLocked && (
              <p className="text-sm text-muted-foreground mt-4">
                Master revenue shares must be locked before contracts can be generated.
              </p>
            )}
          </CardContent>
        </Card>

      {/* Publishing Splits and Master Revenue Shares cards - Hidden but kept for potential future use */}
      {false && isAdmin && song && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Publishing Splits</CardTitle>
              <CardDescription>
                {song?.publishingLocked
                  ? "Publishing splits are locked"
                  : "Set publishing ownership percentages (must total 100%)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {song && (
                <PublishingSplitEditor
                  songId={song!.id}
                  songCollaborators={song!.songCollaborators.map(sc => ({
                    ...sc,
                    roleInSong: sc.roleInSong as CollaboratorRole
                  })) as any}
                  songPublishingEntities={song!.songPublishingEntities}
                  isLocked={song!.publishingLocked}
                  onUpdate={fetchSong}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Master Revenue Shares</CardTitle>
              <CardDescription>
                {!song?.publishingLocked
                  ? "Publishing splits must be locked first"
                  : song?.masterLocked
                  ? "Master revenue shares are locked"
                  : "Set master ownership percentages (must total 100%)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {song && (
                <MasterSplitEditor
                  songId={song!.id}
                  songCollaborators={song!.songCollaborators.map(sc => ({
                    ...sc,
                    roleInSong: sc.roleInSong as CollaboratorRole
                  })) as any}
                  labelMasterShare={song!.labelMasterShare}
                  isLocked={song!.masterLocked}
                  publishingLocked={song!.publishingLocked}
                  onUpdate={fetchSong}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Smart Link - admin only */}
      {song && session?.user?.role === "admin" && (
        <SmartLinkEditorCard songId={song.id} songTitle={song.title} />
      )}

      {/* Media Library - admin only */}
      {song && session?.user?.role === "admin" && (
        <MediaLibraryCard
          songId={song.id}
          media={song.media || []}
          onUpdate={fetchSong}
        />
      )}

      {/* Promo Materials Section - Visible to all users - Always at bottom */}
      {song.promoMaterialsFolderId && (
        <Card>
          <CardHeader>
            <CardTitle>Promo Materials</CardTitle>
            <CardDescription>
              Browse and download promotional assets for this song
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="w-full h-[500px] border rounded-lg overflow-hidden bg-muted/20">
                <iframe
                  src={`https://drive.google.com/embeddedfolderview?id=${song.promoMaterialsFolderId}#grid`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allow="autoplay"
                  title="Promo Materials"
                  onError={(e) => {
                    console.error("Google Drive iframe error:", e)
                  }}
                />
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <a
                  href={`https://drive.google.com/drive/folders/${song.promoMaterialsFolderId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Open in Google Drive
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>
                <span className="text-xs">•</span>
                <span className="text-xs">If the preview doesn&apos;t load, click the link above</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contract Preview Modal */}
      {viewingContract && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setViewingContract(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  {getContractTypeLabel(viewingContract.contractType)}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {viewingContract.collaboratorName}
                </p>
              </div>
              <Button variant="outline" onClick={() => setViewingContract(null)}>
                Close
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div
                dangerouslySetInnerHTML={{ __html: viewingContract.html }}
                className="prose max-w-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

