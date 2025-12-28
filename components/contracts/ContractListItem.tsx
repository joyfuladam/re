"use client"

import { Button } from "@/components/ui/button"
import { ContractType } from "@prisma/client"
import { getContractTypeLabel } from "@/lib/contract-types"

interface ContractListItemProps {
  collaboratorName: string
  collaboratorRole: string
  contractType: ContractType
  status?: "not_generated" | "generated" | "pending" | "signed"
  contractId?: string
  onGenerate?: () => void
  onView?: () => void
}

export function ContractListItem({
  collaboratorName,
  collaboratorRole,
  contractType,
  status = "not_generated",
  contractId,
  onGenerate,
  onView,
}: ContractListItemProps) {
  const contractTypeLabel = getContractTypeLabel(contractType)

  const getStatusBadge = () => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full"
    switch (status) {
      case "signed":
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`}>
            Signed
          </span>
        )
      case "pending":
        return (
          <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>
            Pending
          </span>
        )
      case "generated":
        return (
          <span className={`${baseClasses} bg-blue-100 text-blue-800`}>
            Generated
          </span>
        )
      default:
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
            Not Generated
          </span>
        )
    }
  }

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <div>
            <div className="font-medium">{collaboratorName}</div>
            <div className="text-sm text-muted-foreground">
              {collaboratorRole} • {contractTypeLabel}
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {status === "not_generated" && (
          <Button onClick={onGenerate} size="sm">
            Generate
          </Button>
        )}
        {(status === "generated" || status === "pending" || status === "signed") && (
          <Button onClick={onView} variant="outline" size="sm">
            View
          </Button>
        )}
      </div>
    </div>
  )
}

