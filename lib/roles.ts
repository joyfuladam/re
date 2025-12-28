import { CollaboratorRole } from '@prisma/client'
import { MasterRevenueScope } from '@/types'

export interface RoleConfiguration {
  role: CollaboratorRole
  publishingEligible: boolean
  masterEligible: boolean
  masterRevenueScope: MasterRevenueScope | null
  contractType: 'digital_master_only' | 'songwriter_publishing' | 'producer_agreement' | 'label_record'
}

export const ROLE_CONFIGURATIONS: Record<CollaboratorRole, RoleConfiguration> = {
  musician: {
    role: 'musician',
    publishingEligible: false,
    masterEligible: true,
    masterRevenueScope: 'digital_only',
    contractType: 'digital_master_only',
  },
  writer: {
    role: 'writer',
    publishingEligible: true,
    masterEligible: false, // Conditional - only if also credited as artist
    masterRevenueScope: null,
    contractType: 'songwriter_publishing',
  },
  producer: {
    role: 'producer',
    publishingEligible: false, // Unless also credited as writer
    masterEligible: true,
    masterRevenueScope: 'full',
    contractType: 'producer_agreement',
  },
  artist: {
    role: 'artist',
    publishingEligible: true, // Artists often write their own songs
    masterEligible: true,
    masterRevenueScope: 'full',
    contractType: 'digital_master_only', // Could be artist_agreement if we add it
  },
  label: {
    role: 'label',
    publishingEligible: true,
    masterEligible: true,
    masterRevenueScope: 'full',
    contractType: 'label_record',
  },
}

export interface RevenueStream {
  id: string
  name: string
  description: string
}

export const REVENUE_STREAMS: RevenueStream[] = [
  { id: 'digital_streaming', name: 'Digital Streaming', description: 'Spotify, Apple Music, etc.' },
  { id: 'digital_downloads', name: 'Digital Downloads', description: 'iTunes, Amazon, etc.' },
  { id: 'physical_sales', name: 'Physical Sales', description: 'CDs, vinyl, merch bundles' },
  { id: 'sync_licensing', name: 'Sync Licensing', description: 'Film, TV, advertising' },
  { id: 'publishing_income', name: 'Publishing Income', description: 'PRO royalties, mechanicals' },
  { id: 'catalog_sales', name: 'Catalog Sales', description: 'Catalog exploitation and acquisitions' },
  { id: 'platform_ad_revenue', name: 'Platform Ad Revenue', description: 'YouTube, etc.' },
]

export interface RevenueEligibility {
  [revenueStreamId: string]: boolean
}

export const REVENUE_ELIGIBILITY: Record<CollaboratorRole, RevenueEligibility> = {
  musician: {
    digital_streaming: true,
    digital_downloads: true,
    platform_ad_revenue: true,
    physical_sales: false,
    sync_licensing: false,
    publishing_income: false,
    catalog_sales: false,
  },
  writer: {
    digital_streaming: false, // Only if also artist
    digital_downloads: false, // Only if also artist
    physical_sales: false, // Only if also artist
    sync_licensing: true, // Publishing share
    publishing_income: true,
    catalog_sales: false,
    platform_ad_revenue: false, // Only if also artist
  },
  producer: {
    digital_streaming: true,
    digital_downloads: true,
    physical_sales: true,
    sync_licensing: true, // Master share
    publishing_income: false,
    catalog_sales: true,
    platform_ad_revenue: true,
  },
  artist: {
    digital_streaming: true,
    digital_downloads: true,
    physical_sales: true,
    sync_licensing: true, // Both master and publishing if they wrote
    publishing_income: true, // If they wrote
    catalog_sales: true,
    platform_ad_revenue: true,
  },
  label: {
    digital_streaming: true,
    digital_downloads: true,
    physical_sales: true,
    sync_licensing: true,
    publishing_income: true,
    catalog_sales: true,
    platform_ad_revenue: true,
  },
}

export function getRoleConfiguration(role: CollaboratorRole): RoleConfiguration {
  return ROLE_CONFIGURATIONS[role]
}

export function isPublishingEligible(role: CollaboratorRole | null | undefined): boolean {
  if (!role || !(role in ROLE_CONFIGURATIONS)) {
    return false
  }
  return ROLE_CONFIGURATIONS[role].publishingEligible
}

export function isMasterEligible(role: CollaboratorRole | null | undefined): boolean {
  if (!role || !(role in ROLE_CONFIGURATIONS)) {
    return false
  }
  return ROLE_CONFIGURATIONS[role].masterEligible
}

export function getMasterRevenueScope(role: CollaboratorRole): MasterRevenueScope | null {
  return ROLE_CONFIGURATIONS[role].masterRevenueScope
}

export function getContractType(role: CollaboratorRole): RoleConfiguration['contractType'] {
  return ROLE_CONFIGURATIONS[role].contractType
}

export function isRevenueEligible(role: CollaboratorRole, revenueStreamId: string): boolean {
  return REVENUE_ELIGIBILITY[role]?.[revenueStreamId] ?? false
}

export function getAllowedRevenueStreams(role: CollaboratorRole): RevenueStream[] {
  return REVENUE_STREAMS.filter(stream => isRevenueEligible(role, stream.id))
}

export function getDisallowedRevenueStreams(role: CollaboratorRole): RevenueStream[] {
  return REVENUE_STREAMS.filter(stream => !isRevenueEligible(role, stream.id))
}

