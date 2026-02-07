import { CollaboratorRole, Prisma } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { getRoleConfiguration, isPublishingEligible, isMasterEligible } from './roles'

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface SplitValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: string[]
}

export interface PublishingSplit {
  collaboratorId?: string // Optional when using songCollaboratorId
  songCollaboratorId?: string // Optional when using collaboratorId
  role: CollaboratorRole | null | undefined
  percentage: number
}

export interface PublishingEntitySplit {
  publishingEntityId: string
  percentage: number
}

export interface CombinedPublishingSplits {
  collaborators: PublishingSplit[]
  entities: PublishingEntitySplit[]
}

export interface PublishingEntitySplit {
  publishingEntityId: string
  percentage: number
}

export interface CombinedPublishingSplits {
  collaborators: PublishingSplit[]
  entities: PublishingEntitySplit[]
}

export interface MasterSplit {
  collaboratorId?: string // Optional when using songCollaboratorId
  songCollaboratorId?: string // Optional when using collaboratorId
  role: CollaboratorRole | null | undefined
  percentage: number
}

/**
 * Validates publishing splits
 */
export function validatePublishingSplits(
  splits: PublishingSplit[],
  allowPartial: boolean = false
): SplitValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  // Check total
  const total = splits.reduce((sum, split) => sum + split.percentage, 0)
  const expectedTotal = 100

  if (!allowPartial && Math.abs(total - expectedTotal) > 0.01) {
    errors.push({
      field: 'total',
      message: `Publishing splits must total exactly 100%. Current total: ${total.toFixed(2)}%`,
      code: 'INVALID_TOTAL',
    })
  }

  // Validate each split
  splits.forEach((split, index) => {
    // Skip validation if role is missing (this shouldn't happen, but handle gracefully)
    if (split.role == null) {
      errors.push({
        field: `splits[${index}].role`,
        message: `Role is missing for this split`,
        code: 'MISSING_ROLE',
      })
      return // Skip remaining validation for this split
    }

    // Check if role is eligible for publishing
    if (!isPublishingEligible(split.role)) {
      errors.push({
        field: `splits[${index}].publishingOwnership`,
        message: `Role "${split.role}" is not eligible for publishing ownership. Publishing percentage must be 0%.`,
        code: 'ROLE_NOT_ELIGIBLE',
      })
    }

    // Check for negative values
    if (split.percentage < 0) {
      errors.push({
        field: `splits[${index}].publishingOwnership`,
        message: 'Publishing percentage cannot be negative',
        code: 'NEGATIVE_VALUE',
      })
    }

    // Check for values over 100%
    if (split.percentage > 100) {
      errors.push({
        field: `splits[${index}].publishingOwnership`,
        message: 'Publishing percentage cannot exceed 100%',
        code: 'EXCEEDS_MAX',
      })
    }

    // Musician must have 0% publishing
    if (split.role === 'musician' && split.percentage > 0) {
      errors.push({
        field: `splits[${index}].publishingOwnership`,
        message: 'Musicians cannot receive publishing ownership. Must be 0%.',
        code: 'MUSICIAN_PUBLISHING_FORBIDDEN',
      })
    }

    // Vocalist must have 0% publishing
    if (split.role === 'vocalist' && split.percentage > 0) {
      errors.push({
        field: `splits[${index}].publishingOwnership`,
        message: 'Vocalists cannot receive publishing ownership. Must be 0%.',
        code: 'VOCALIST_PUBLISHING_FORBIDDEN',
      })
    }

    // Producer cannot have publishing unless also writer
    if (split.role === 'producer' && split.percentage > 0) {
      errors.push({
        field: `splits[${index}].publishingOwnership`,
        message: 'Producers cannot receive publishing ownership unless also credited as writer.',
        code: 'PRODUCER_PUBLISHING_FORBIDDEN',
      })
    }
  })

  // Check for duplicate songCollaboratorId values (each role-specific record should be unique)
  const songCollaboratorIds = splits.map(s => s.songCollaboratorId).filter(Boolean)
  if (songCollaboratorIds.length > 0) {
    // If using songCollaboratorId, check for duplicates of songCollaboratorId
    const duplicates = songCollaboratorIds.filter((id, index) => songCollaboratorIds.indexOf(id) !== index)
    if (duplicates.length > 0) {
      errors.push({
        field: 'collaborators',
        message: `Duplicate song collaborator entries found: ${[...new Set(duplicates)].join(', ')}`,
        code: 'DUPLICATE_SONG_COLLABORATORS',
      })
    }
  } else {
    // If not using songCollaboratorId, check for duplicate collaboratorId + role combinations
    const collaboratorRoleKeys = splits.map(s => `${s.collaboratorId}-${s.role}`).filter(Boolean)
    const duplicates = collaboratorRoleKeys.filter((key, index) => collaboratorRoleKeys.indexOf(key) !== index)
    if (duplicates.length > 0) {
      errors.push({
        field: 'collaborators',
        message: `Duplicate collaborator roles found: ${[...new Set(duplicates)].join(', ')}`,
        code: 'DUPLICATE_COLLABORATOR_ROLES',
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validates master splits
 */
export function validateMasterSplits(
  splits: MasterSplit[],
  allowPartial: boolean = false
): SplitValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  // Check total
  const total = splits.reduce((sum, split) => sum + split.percentage, 0)
  const expectedTotal = 100

  if (!allowPartial && Math.abs(total - expectedTotal) > 0.01) {
    errors.push({
      field: 'total',
      message: `Master splits must total exactly 100%. Current total: ${total.toFixed(2)}%`,
      code: 'INVALID_TOTAL',
    })
  }

  // Validate each split
  splits.forEach((split, index) => {
    // Check if role is eligible for master (skip if role is null/undefined)
    if (split.role != null && !isMasterEligible(split.role)) {
      errors.push({
        field: `splits[${index}].masterOwnership`,
        message: `Role "${split.role}" is not eligible for master ownership.`,
        code: 'ROLE_NOT_ELIGIBLE',
      })
    }

    // Check for negative values
    if (split.percentage < 0) {
      errors.push({
        field: `splits[${index}].masterOwnership`,
        message: 'Master percentage cannot be negative',
        code: 'NEGATIVE_VALUE',
      })
    }

    // Check for values over 100%
    if (split.percentage > 100) {
      errors.push({
        field: `splits[${index}].masterOwnership`,
        message: 'Master percentage cannot exceed 100%',
        code: 'EXCEEDS_MAX',
      })
    }
  })

  // Check for duplicate songCollaboratorIds (not collaboratorIds, since same collaborator can have multiple roles)
  // Only check if songCollaboratorId is provided - if not, check collaboratorId + role combination
  const songCollaboratorIds = splits.map(s => s.songCollaboratorId).filter(Boolean)
  if (songCollaboratorIds.length > 0) {
    // If using songCollaboratorId, check for duplicates
    const duplicates = songCollaboratorIds.filter((id, index) => songCollaboratorIds.indexOf(id) !== index)
    if (duplicates.length > 0) {
      errors.push({
        field: 'collaborators',
        message: `Duplicate song collaborator entries found: ${[...new Set(duplicates)].join(', ')}`,
        code: 'DUPLICATE_SONG_COLLABORATORS',
      })
    }
  } else {
    // If not using songCollaboratorId, check for duplicate collaboratorId + role combinations
    const collaboratorRoleKeys = splits.map(s => `${s.collaboratorId}-${s.role}`).filter(Boolean)
    const duplicates = collaboratorRoleKeys.filter((key, index) => collaboratorRoleKeys.indexOf(key) !== index)
    if (duplicates.length > 0) {
      errors.push({
        field: 'collaborators',
        message: `Duplicate collaborator roles found: ${[...new Set(duplicates)].join(', ')}`,
        code: 'DUPLICATE_COLLABORATOR_ROLES',
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validates that publishing is locked before master splits can be calculated
 */
export function validateSplitWorkflow(publishingLocked: boolean, masterLocked: boolean): ValidationError[] {
  const errors: ValidationError[] = []

  if (!publishingLocked && masterLocked) {
    errors.push({
      field: 'workflow',
      message: 'Master splits cannot be locked before publishing splits are locked',
      code: 'INVALID_WORKFLOW',
    })
  }

  return errors
}

/**
 * Validates ISRC code format
 */
export function validateISRC(isrc: string): ValidationError[] {
  const errors: ValidationError[] = []

  // ISRC format: CC-XXX-YY-NNNNN
  // CC = Country code (2 letters)
  // XXX = Registrant code (3 alphanumeric)
  // YY = Year (2 digits)
  // NNNNN = Designation code (5 digits)
  const isrcPattern = /^[A-Z]{2}-[A-Z0-9]{3}-\d{2}-\d{5}$/

  if (!isrcPattern.test(isrc)) {
    errors.push({
      field: 'isrcCode',
      message: 'ISRC code must be in format CC-XXX-YY-NNNNN (e.g., US-S1Z-99-00001)',
      code: 'INVALID_ISRC_FORMAT',
    })
  }

  return errors
}

/**
 * Validates PRO affiliation
 */
export function validatePROAffiliation(pro: string | null | undefined): ValidationError[] {
  const errors: ValidationError[] = []

  if (pro) {
    const validPROs = ['ASCAP', 'BMI', 'SESAC', 'GMR', 'SOCAN', 'PRS', 'PPL']
    if (!validPROs.includes(pro.toUpperCase())) {
      errors.push({
        field: 'proAffiliation',
        message: `PRO affiliation must be one of: ${validPROs.join(', ')}`,
        code: 'INVALID_PRO',
      })
    }
  }

  return errors
}

/**
 * Validates combined publishing splits (collaborators + entities)
 * Music industry standard: Writer's share = 50%, Publisher's share = 50%, Combined = 100%
 */
export function validateCombinedPublishingSplits(
  splits: CombinedPublishingSplits,
  allowPartial: boolean = false
): SplitValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  // Validate collaborator splits - filter out any with undefined/null roles before validation
  const validCollaboratorSplits = splits.collaborators.filter(split => split.role != null)
  if (validCollaboratorSplits.length !== splits.collaborators.length) {
    errors.push({
      field: 'collaborators',
      message: 'Some collaborators have invalid or missing roles',
      code: 'INVALID_ROLE',
    })
  }
  
  // Validate individual collaborator splits (role eligibility, negative values, etc.)
  // But don't check total - we'll check writer's share total separately
  const collaboratorValidation = validatePublishingSplits(validCollaboratorSplits, true)
  if (!collaboratorValidation.isValid) {
    // Filter out the "total must be 100%" error since we'll check writer's share total below
    const nonTotalErrors = collaboratorValidation.errors.filter(
      e => e.code !== 'INVALID_TOTAL'
    )
    errors.push(...nonTotalErrors)
  }
  warnings.push(...collaboratorValidation.warnings)

  // Validate entity splits
  const entityTotal = splits.entities.reduce((sum, split) => sum + split.percentage, 0)
  
  splits.entities.forEach((split, index) => {
    if (split.percentage < 0) {
      errors.push({
        field: `entities[${index}].percentage`,
        message: 'Publishing entity percentage cannot be negative',
        code: 'NEGATIVE_VALUE',
      })
    }

    if (split.percentage > 100) {
      errors.push({
        field: `entities[${index}].percentage`,
        message: 'Publishing entity percentage cannot exceed 100%',
        code: 'EXCEEDS_MAX',
      })
    }
  })

  // Check for duplicate entities
  const entityIds = splits.entities.map(e => e.publishingEntityId)
  const duplicateEntities = entityIds.filter((id, index) => entityIds.indexOf(id) !== index)
  if (duplicateEntities.length > 0) {
    errors.push({
      field: 'entities',
      message: `Duplicate publishing entities found: ${[...new Set(duplicateEntities)].join(', ')}`,
      code: 'DUPLICATE_ENTITIES',
    })
  }

  // Music industry standard: Writer's share = 50%, Publisher's share = 50%
  const writerTotal = splits.collaborators.reduce((sum, split) => sum + split.percentage, 0)
  const publisherTotal = entityTotal
  const expectedWriterShare = 50
  const expectedPublisherShare = 50

  if (!allowPartial) {
    // Check writer's share totals 50%
    if (Math.abs(writerTotal - expectedWriterShare) > 0.01) {
      errors.push({
        field: 'writers',
        message: `Writer's share must total exactly 50%. Current total: ${writerTotal.toFixed(2)}%`,
        code: 'INVALID_WRITER_SHARE',
      })
    }

    // Check publisher's share totals 50%
    if (Math.abs(publisherTotal - expectedPublisherShare) > 0.01) {
      errors.push({
        field: 'publishers',
        message: `Publisher's share must total exactly 50%. Current total: ${publisherTotal.toFixed(2)}%`,
        code: 'INVALID_PUBLISHER_SHARE',
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Converts Decimal to number for calculations
 */
export function decimalToNumber(value: Decimal | null | undefined): number {
  if (!value) return 0
  return parseFloat(value.toString())
}

/**
 * Converts number to Decimal for database storage
 */
export function numberToDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value)
}

