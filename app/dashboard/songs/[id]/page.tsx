"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PublishingSplitEditor } from "@/components/splits/PublishingSplitEditor"
import { MasterSplitEditor } from "@/components/splits/MasterSplitEditor"
import { SplitPieChart } from "@/components/charts/SplitPieChart"
import { ContractType } from "@prisma/client"
import { getRequiredContractTypes, getContractTypeLabel } from "@/lib/contract-types"
import { CollaboratorRole } from "@prisma/client"

interface Song {
  id: string
  title: string
  isrcCode: string | null
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
}

export default function SongDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const [song, setSong] = useState<Song | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [deletingCollaboratorId, setDeletingCollaboratorId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editFormData, setEditFormData] = useState({
    title: "",
    isrcCode: "",
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
  })
  const [viewingContract, setViewingContract] = useState<{
    html: string
    contractType: ContractType
    collaboratorName: string
  } | null>(null)
  const [generatingContractId, setGeneratingContractId] = useState<string | null>(null)
  const [contracts, setContracts] = useState<Array<{
    id: string
    songCollaboratorId: string
    templateType: ContractType
    esignatureStatus: string | null
    signedAt: string | null
  }>>([])

  const isAdmin = session?.user?.role === "admin"

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

  const handleSendContract = async (songCollaboratorId: string, contractType: ContractType, collaboratorName: string) => {
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
      
      // Then send via e-signature
      const sendResponse = await fetch("/api/esignature/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractId: generateData.contractId,
        }),
      })

      if (!sendResponse.ok) {
        const error = await sendResponse.json()
        alert(`Error sending contract: ${error.error || "Unknown error"}`)
        return
      }

      alert(`Contract sent to ${collaboratorName} for e-signature`)
      // Refresh contracts to show updated status
      if (song) {
        await fetchContracts(song.id)
      }
    } catch (error) {
      console.error("Error sending contract:", error)
      alert("An unexpected error occurred while sending the contract.")
    } finally {
      setGeneratingContractId(null)
    }
  }

  const handleDeleteCollaborator = async (songCollaboratorId: string, collaboratorName: string) => {
    if (!song) return
    
    const confirmed = window.confirm(
      `Are you sure you want to remove ${collaboratorName} from this song? This will remove all their shares and splits.`
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
    })
    setEditing(false)
  }

  const handleSave = async () => {
    if (!song) return

    setSaving(true)
    try {
      const response = await fetch(`/api/songs/${song.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editFormData.title,
          isrcCode: editFormData.isrcCode || null,
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
        }),
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

                <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="edit-catalogNumber">Catalog Number</Label>
                  <Input
                    id="edit-catalogNumber"
                    value={editFormData.catalogNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, catalogNumber: e.target.value })}
                  />
                </div>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-proWorkRegistrationNumber">PRO Work Registration Number</Label>
                  <Input
                    id="edit-proWorkRegistrationNumber"
                    value={editFormData.proWorkRegistrationNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, proWorkRegistrationNumber: e.target.value })}
                  />
                </div>

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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-genre">Genre</Label>
                  <Input
                    id="edit-genre"
                    value={editFormData.genre}
                    onChange={(e) => setEditFormData({ ...editFormData, genre: e.target.value })}
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
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="edit-recordingDate">Recording Date</Label>
                  <Input
                    id="edit-recordingDate"
                    type="date"
                    value={editFormData.recordingDate}
                    onChange={(e) => setEditFormData({ ...editFormData, recordingDate: e.target.value })}
                  />
                </div>
              </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-recordingLocation">Recording Location</Label>
                  <Input
                    id="edit-recordingLocation"
                    value={editFormData.recordingLocation}
                    onChange={(e) => setEditFormData({ ...editFormData, recordingLocation: e.target.value })}
                  />
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
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Title</div>
                  <div className="text-lg font-semibold">{song.title}</div>
                </div>
              
              {song.isrcCode && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">ISRC Code</div>
                  <div>{song.isrcCode}</div>
                </div>
              )}
              
              {song.catalogNumber && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Catalog Number</div>
                  <div>{song.catalogNumber}</div>
                </div>
              )}
              
              {song.releaseDate && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Release Date</div>
                  <div>
                    {(() => {
                      try {
                        // Handle both ISO date strings (YYYY-MM-DD) and Date objects
                        const date = typeof song.releaseDate === "string" 
                          ? (song.releaseDate.includes("T") ? new Date(song.releaseDate) : new Date(song.releaseDate + "T00:00:00"))
                          : new Date(song.releaseDate)
                        return date.toLocaleDateString()
                      } catch {
                        return song.releaseDate
                      }
                    })()}
                  </div>
                </div>
              )}
              
              {song.proWorkRegistrationNumber && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">PRO Work Registration Number</div>
                  <div>{song.proWorkRegistrationNumber}</div>
                </div>
              )}
              
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
              
              {song.genre && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Genre</div>
                  <div>{song.genre}</div>
                </div>
              )}
              
              {song.subGenre && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Sub-Genre</div>
                  <div>{song.subGenre}</div>
                </div>
              )}
              
              {song.duration && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Duration</div>
                  <div>{Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, "0")}</div>
                </div>
              )}
              
              {song.recordingDate && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Recording Date</div>
                  <div>
                    {(() => {
                      try {
                        // Handle both ISO date strings (YYYY-MM-DD) and Date objects
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Publishing Splits</CardTitle>
            <CardDescription>
              {song.publishingLocked
                ? "Publishing splits are locked"
                : "Set publishing ownership percentages (must total 100%)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PublishingSplitEditor
              songId={song.id}
              songCollaborators={song.songCollaborators.map(sc => ({
                ...sc,
                roleInSong: sc.roleInSong as CollaboratorRole
              })) as any}
              songPublishingEntities={song.songPublishingEntities}
              isLocked={song.publishingLocked}
              onUpdate={fetchSong}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Master Revenue Shares</CardTitle>
            <CardDescription>
              {!song.publishingLocked
                ? "Publishing splits must be locked first"
                : song.masterLocked
                ? "Master revenue shares are locked"
                : "Set master ownership percentages (must total 100%)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MasterSplitEditor
              songId={song.id}
              songCollaborators={song.songCollaborators.map(sc => ({
                ...sc,
                roleInSong: sc.roleInSong as CollaboratorRole
              })) as any}
              labelMasterShare={song.labelMasterShare}
              isLocked={song.masterLocked}
              publishingLocked={song.publishingLocked}
              onUpdate={fetchSong}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Collaborators</CardTitle>
            <CardDescription>Manage collaborators for this song</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Publishing Share Section */}
              {song.songCollaborators.some((sc) => {
                const publishing = sc.publishingOwnership ? parseFloat(sc.publishingOwnership.toString()) : 0
                return publishing > 0
              }) && (
                <div>
                  <div className="flex items-center justify-between mb-3 p-3">
                    <h3 className="text-lg font-semibold">Publishing Share</h3>
                    <div className="flex gap-2 ml-4 justify-center" style={{ minWidth: '140px' }}>
                      <h3 className="text-lg font-semibold">Contracts</h3>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {song.songCollaborators
                      .filter((sc) => {
                        const publishing = sc.publishingOwnership ? parseFloat(sc.publishingOwnership.toString()) : 0
                        return publishing > 0
                      })
                      .map((sc) => {
                        const publishing = sc.publishingOwnership ? parseFloat(sc.publishingOwnership.toString()) : 0
                        const collaboratorName = [sc.collaborator.firstName, sc.collaborator.middleName, sc.collaborator.lastName].filter(Boolean).join(" ")
                        const roleLabel = sc.roleInSong === "writer" ? "Writer" : 
                                         sc.roleInSong === "producer" ? "Producer" :
                                         sc.roleInSong === "musician" ? "Musician" :
                                         sc.roleInSong === "artist" ? "Artist" :
                                         sc.roleInSong === "label" ? "Label" : sc.roleInSong
                        const contractType: ContractType = "songwriter_publishing"
                        const isGenerating = generatingContractId === `${sc.id}-${contractType}`
                        const contractStatus = getContractStatus(sc.id, contractType)
                        const isSent = contractStatus.status === "sent" || contractStatus.status === "signed"
                        const isSigned = contractStatus.status === "signed"
                        const canResend = contractStatus.status === "sent" && !isSigned
                        
                        return (
                          <div
                            key={`publishing-${sc.id}`}
                            className="flex items-center justify-between p-3 border rounded"
                          >
                            <div className="flex-1">
                              <div className="font-medium">{collaboratorName}</div>
                              <div className="text-sm text-muted-foreground">
                                {roleLabel} • Publishing: {publishing.toFixed(2)}%
                                {contractStatus.status && (
                                  <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                                    isSigned 
                                      ? "bg-green-100 text-green-800" 
                                      : contractStatus.status === "sent"
                                      ? "bg-blue-100 text-blue-800"
                                      : contractStatus.status === "declined"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}>
                                    {isSigned ? "Signed" : contractStatus.status === "sent" ? "Sent" : contractStatus.status === "declined" ? "Declined" : contractStatus.status}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePreviewContract(sc.id, contractType, collaboratorName)}
                                disabled={!song.masterLocked || isGenerating}
                              >
                                Preview
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendContract(sc.id, contractType, collaboratorName)}
                                disabled={!song.masterLocked || isGenerating || isSigned}
                              >
                                {isSigned ? "Signed" : canResend ? "Re-Send" : "Send"}
                              </Button>
                              {isAdmin && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteCollaborator(sc.id, collaboratorName)}
                                  disabled={deletingCollaboratorId === sc.id}
                                >
                                  {deletingCollaboratorId === sc.id ? "Removing..." : "Remove"}
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* Master Revenue Share Section */}
              {song.songCollaborators.some((sc) => {
                const master = sc.masterOwnership ? parseFloat(sc.masterOwnership.toString()) : 0
                return master > 0
              }) && (
                <div>
                  <div className="flex items-center justify-between mb-3 p-3">
                    <h3 className="text-lg font-semibold">Master Revenue Share</h3>
                    <div className="flex gap-2 ml-4 justify-center" style={{ minWidth: '140px' }}>
                      <h3 className="text-lg font-semibold">Contracts</h3>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {song.songCollaborators
                      .filter((sc) => {
                        const master = sc.masterOwnership ? parseFloat(sc.masterOwnership.toString()) : 0
                        return master > 0
                      })
                      .map((sc) => {
                        const master = sc.masterOwnership ? parseFloat(sc.masterOwnership.toString()) : 0
                        const collaboratorName = [sc.collaborator.firstName, sc.collaborator.middleName, sc.collaborator.lastName].filter(Boolean).join(" ")
                        const roleLabel = sc.roleInSong === "writer" ? "Writer" : 
                                         sc.roleInSong === "producer" ? "Producer" :
                                         sc.roleInSong === "musician" ? "Musician" :
                                         sc.roleInSong === "artist" ? "Artist" :
                                         sc.roleInSong === "label" ? "Label" : sc.roleInSong
                        const contractType: ContractType = "digital_master_only"
                        const isGenerating = generatingContractId === `${sc.id}-${contractType}`
                        const contractStatus = getContractStatus(sc.id, contractType)
                        const isSent = contractStatus.status === "sent" || contractStatus.status === "signed"
                        const isSigned = contractStatus.status === "signed"
                        const canResend = contractStatus.status === "sent" && !isSigned
                        
                        return (
                          <div
                            key={`master-${sc.id}`}
                            className="flex items-center justify-between p-3 border rounded"
                          >
                            <div className="flex-1">
                              <div className="font-medium">{collaboratorName}</div>
                              <div className="text-sm text-muted-foreground">
                                {roleLabel} • Master Revenue: {master.toFixed(2)}%
                                {contractStatus.status && (
                                  <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                                    isSigned 
                                      ? "bg-green-100 text-green-800" 
                                      : contractStatus.status === "sent"
                                      ? "bg-blue-100 text-blue-800"
                                      : contractStatus.status === "declined"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}>
                                    {isSigned ? "Signed" : contractStatus.status === "sent" ? "Sent" : contractStatus.status === "declined" ? "Declined" : contractStatus.status}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePreviewContract(sc.id, contractType, collaboratorName)}
                                disabled={!song.masterLocked || isGenerating}
                              >
                                Preview
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendContract(sc.id, contractType, collaboratorName)}
                                disabled={!song.masterLocked || isGenerating || isSigned}
                              >
                                {isSigned ? "Signed" : canResend ? "Re-Send" : "Send"}
                              </Button>
                              {isAdmin && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteCollaborator(sc.id, collaboratorName)}
                                  disabled={deletingCollaboratorId === sc.id}
                                >
                                  {deletingCollaboratorId === sc.id ? "Removing..." : "Remove"}
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
            {isAdmin && (
              <div className="mt-4">
                <Link href={`/dashboard/songs/${song.id}/add-collaborator`}>
                  <Button variant="outline">Add Collaborator</Button>
                </Link>
              </div>
            )}
            {!song.masterLocked && (
              <p className="text-sm text-muted-foreground mt-4">
                Master revenue shares must be locked before contracts can be generated.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Split Visualization</CardTitle>
            <CardDescription>Visual representation of ownership splits</CardDescription>
          </CardHeader>
          <CardContent>
            <SplitPieChart
              songCollaborators={song.songCollaborators}
              songPublishingEntities={song.songPublishingEntities}
              labelMasterShare={song.labelMasterShare}
            />
          </CardContent>
        </Card>
      </div>

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

