"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ContractListItem } from "./ContractListItem"
import { ContractType } from "@prisma/client"
import { getRequiredContractTypes, getContractTypeLabel } from "@/lib/contract-types"

interface SongCollaborator {
  id: string
  roleInSong: string
  publishingOwnership: number | null
  masterOwnership: number | null
  collaborator: {
    id: string
    firstName: string | null
    middleName: string | null
    lastName: string | null | undefined
    email: string | null
  }
}

interface Contract {
  id: string
  contractType: ContractType
  esignatureStatus: string | null
  signedAt: string | null
  collaboratorId: string
  songCollaboratorId: string
}

interface ContractGeneratorProps {
  songId: string
  songCollaborators: SongCollaborator[]
  masterLocked: boolean
  isAdmin: boolean
}

export function ContractGenerator({
  songId,
  songCollaborators,
  masterLocked,
  isAdmin,
}: ContractGeneratorProps) {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(false)
  const [generatingContractId, setGeneratingContractId] = useState<string | null>(null)
  const [viewingContract, setViewingContract] = useState<{
    html: string
    contractType: ContractType
    collaboratorName: string
  } | null>(null)

  // Fetch existing contracts for this song
  useEffect(() => {
    if (masterLocked) {
      fetchContracts()
    }
  }, [songId, masterLocked])

  const fetchContracts = async () => {
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

  const handleGenerateContract = async (collaboratorId: string, contractType: ContractType) => {
    setGeneratingContractId(`${collaboratorId}-${contractType}`)
    setLoading(true)

    try {
      const response = await fetch("/api/contracts/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          songId,
          collaboratorId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`Error generating contract: ${error.error || "Unknown error"}`)
        return
      }

      const data = await response.json()
      
      // Refresh contracts list
      await fetchContracts()
      
      // Show the generated contract
      const collaborator = songCollaborators.find((sc) => sc.collaborator.id === collaboratorId)
      const collaboratorName = collaborator
        ? [
            collaborator.collaborator.firstName,
            collaborator.collaborator.middleName,
            collaborator.collaborator.lastName,
          ]
            .filter(Boolean)
            .join(" ")
        : "Unknown"

      setViewingContract({
        html: data.html,
        contractType: data.contractType,
        collaboratorName,
      })
    } catch (error) {
      console.error("Error generating contract:", error)
      alert("Failed to generate contract")
    } finally {
      setLoading(false)
      setGeneratingContractId(null)
    }
  }

  const handleViewContract = async (contractId: string) => {
    try {
      const contract = contracts.find((c) => c.id === contractId)
      if (!contract) {
        alert("Contract not found")
        return
      }

      // Find the collaborator for this contract
      const songCollaborator = songCollaborators.find(
        (sc) => sc.collaborator.id === contract.collaboratorId
      )
      if (!songCollaborator) {
        alert("Collaborator not found")
        return
      }

      // Regenerate the contract HTML
      const response = await fetch("/api/contracts/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          songId,
          collaboratorId: contract.collaboratorId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`Error loading contract: ${error.error || "Unknown error"}`)
        return
      }

      const data = await response.json()
      const collaboratorName = [
        songCollaborator.collaborator.firstName,
        songCollaborator.collaborator.middleName,
        songCollaborator.collaborator.lastName,
      ]
        .filter(Boolean)
        .join(" ")

      setViewingContract({
        html: data.html,
        contractType: data.contractType,
        collaboratorName,
      })
    } catch (error) {
      console.error("Error loading contract:", error)
      alert("Failed to load contract")
    }
  }

  const getContractStatus = (
    collaboratorId: string,
    contractType: ContractType
  ): "not_generated" | "generated" | "pending" | "signed" => {
    const contract = contracts.find(
      (c) => c.collaboratorId === collaboratorId && c.contractType === contractType
    )

    if (!contract) return "not_generated"

    if (contract.signedAt) return "signed"
    if (contract.esignatureStatus === "pending") return "pending"
    return "generated"
  }

  // Build list of contracts that can be generated
  const contractList = songCollaborators.flatMap((songCollaborator) => {
    const contractTypes = getRequiredContractTypes(songCollaborator as any)
    return contractTypes.map((contractType) => ({
      songCollaborator,
      contractType,
    }))
  })

  if (!masterLocked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contracts</CardTitle>
          <CardDescription>Generate contracts for collaborators</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Master splits must be locked before generating contracts.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (contractList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contracts</CardTitle>
          <CardDescription>Generate contracts for collaborators</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No contracts can be generated. Collaborators must have publishing or master shares.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Contracts</CardTitle>
          <CardDescription>Generate contracts for collaborators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {contractList.map(({ songCollaborator, contractType }) => {
              const collaboratorName = [
                songCollaborator.collaborator.firstName,
                songCollaborator.collaborator.middleName,
                songCollaborator.collaborator.lastName,
              ]
                .filter(Boolean)
                .join(" ")

              const roleLabel =
                songCollaborator.roleInSong === "writer"
                  ? "Writer"
                  : songCollaborator.roleInSong === "producer"
                  ? "Producer"
                  : songCollaborator.roleInSong === "musician"
                  ? "Musician"
                  : songCollaborator.roleInSong === "artist"
                  ? "Artist"
                  : songCollaborator.roleInSong === "label"
                  ? "Label"
                  : songCollaborator.roleInSong

              const status = getContractStatus(
                songCollaborator.collaborator.id,
                contractType
              )
              const contract = contracts.find(
                (c) =>
                  c.collaboratorId === songCollaborator.collaborator.id &&
                  c.contractType === contractType
              )

              const isGenerating =
                generatingContractId ===
                `${songCollaborator.collaborator.id}-${contractType}`

              return (
                <ContractListItem
                  key={`${songCollaborator.id}-${contractType}`}
                  collaboratorName={collaboratorName}
                  collaboratorRole={roleLabel}
                  contractType={contractType}
                  status={status}
                  contractId={contract?.id}
                  onGenerate={() =>
                    handleGenerateContract(songCollaborator.collaborator.id, contractType)
                  }
                  onView={() => contract && handleViewContract(contract.id)}
                />
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Contract View Modal */}
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
    </>
  )
}

