/**
 * Configuration for contract generation
 * Contains publisher information and default contract values
 */

export interface ContractConfig {
  publisher: {
    name: string
    state: string
    address: string
    managerName: string
    managerTitle: string
  }
  defaults: {
    governingState: string
    reversionCondition?: string
    publishingAdministrator?: string
  }
  inKindServices?: {
    studioValue: number
    adminValue: number
    marketingValue: number
    alternativeVersionsValue: number
  }
}

export const contractConfig: ContractConfig = {
  publisher: {
    name: "River and Ember, LLC",
    state: "Pennsylvania",
    address: "134 Glade Run Rd. Mars PA 16046",
    managerName: "Adam Farrell",
    managerTitle: "Owner/CEO",
  },
  defaults: {
    governingState: "Pennsylvania",
    reversionCondition: "mutual agreement or material breach",
    publishingAdministrator: "Sentric Music",
  },
  inKindServices: {
    studioValue: 0, // Default values - can be overridden per contract
    adminValue: 0,
    marketingValue: 0,
    alternativeVersionsValue: 0,
  },
}

/**
 * Calculate total value of in-kind services
 */
export function calculateInKindTotal(services?: {
  studioValue?: number
  adminValue?: number
  marketingValue?: number
  alternativeVersionsValue?: number
}): number {
  const studio = services?.studioValue ?? contractConfig.inKindServices?.studioValue ?? 0
  const admin = services?.adminValue ?? contractConfig.inKindServices?.adminValue ?? 0
  const marketing = services?.marketingValue ?? contractConfig.inKindServices?.marketingValue ?? 0
  const altVersions = services?.alternativeVersionsValue ?? contractConfig.inKindServices?.alternativeVersionsValue ?? 0

  return studio + admin + marketing + altVersions
}

