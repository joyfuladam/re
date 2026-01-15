import { CollaboratorRole, ContractType } from "@prisma/client"
import { getContractType, getAllowedRevenueStreams, getDisallowedRevenueStreams } from "./roles"

export interface ContractData {
  // Song-specific (single song)
  songTitle: string
  isrcCode: string | null
  catalogNumber: string | null
  releaseDate: string | null

  // Collaborator-specific
  collaboratorName: string
  collaboratorFullName: string // First, Middle, Last
  collaboratorEmail: string | null
  collaboratorAddress: string | null
  collaboratorPhone: string | null
  role: CollaboratorRole
  publishingOwnership: number | null
  masterOwnership: number | null
  proAffiliation: string | null
  ipiNumber: string | null

  // Publisher info
  publisherName: string
  publisherState: string
  publisherAddress: string
  publisherManagerName: string
  publisherManagerTitle: string

  // For publishing assignment template (single song)
  composition?: {
    title: string
    writers: string // Formatted writer list with shares for THIS song
    isrc: string | null
    notes: string | null
  }
  compositions?: Array<{
    title: string
    writers: string
    isrc: string | null
    notes: string | null
  }>

  // Configuration
  effectiveDate: string
  governingState: string
  reversionCondition?: string
  advanceAmount?: number

  // In-kind services (Exhibit B)
  inKindServices?: {
    studioValue: number
    adminValue: number
    marketingValue: number
    alternativeVersionsValue: number
    totalValue: number
  }
  // Legacy fields for template compatibility
  studio_value?: number
  admin_value?: number
  marketing_value?: number
  alternative_versions_value?: number
  total_value?: number
  writer_full_name?: string
  writer_address?: string
  effective_date?: string
  publisher_state?: string
  publisher_address?: string
  publisher_manager_name?: string
  publisher_manager_title?: string
  reversion_condition?: string
  advance_amount?: number
  governing_state?: string
  // Master revenue share template fields
  artist_full_name?: string
  // Role-specific fields for template conditionals
  collaborator_role?: string
  is_musician?: boolean
  is_artist?: boolean
  is_producer?: boolean
  is_writer?: boolean
  artist_address?: string | null
  label_state?: string
  label_address?: string
  song_title?: string
  song_isrc?: string | null
  artist_share_percentage?: string
  artist_role_description?: string
  estimated_label_investment?: number
  additional_notes?: string | null
}

export function generateContractHTML(data: ContractData): string {
  const contractType = getContractType(data.role)
  const allowedRevenue = getAllowedRevenueStreams(data.role)
  const disallowedRevenue = getDisallowedRevenueStreams(data.role)

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Times New Roman', serif;
          line-height: 1.6;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
        }
        h1 {
          text-align: center;
          margin-bottom: 30px;
        }
        h2 {
          margin-top: 30px;
          margin-bottom: 15px;
        }
        .section {
          margin-bottom: 20px;
        }
        .signature-line {
          margin-top: 60px;
          border-top: 1px solid #000;
          width: 300px;
        }
      </style>
    </head>
    <body>
  `

  if (contractType === "digital_master_only") {
    html += generateDigitalMasterOnlyContract(data, allowedRevenue, disallowedRevenue)
  } else if (contractType === "songwriter_publishing") {
    html += generateSongwriterPublishingContract(data, allowedRevenue, disallowedRevenue)
  } else if (contractType === "producer_agreement") {
    html += generateProducerAgreement(data, allowedRevenue, disallowedRevenue)
  } else if (contractType === "label_record") {
    html += generateLabelRecord(data)
  }

  html += `
    </body>
    </html>
  `

  return html
}

function generateDigitalMasterOnlyContract(
  data: ContractData,
  allowed: any[],
  disallowed: any[]
): string {
  return `
    <h1>Digital-Only Master Participation Agreement</h1>
    
    <div class="section">
      <p><strong>Song:</strong> ${data.songTitle}</p>
      <p><strong>ISRC Code:</strong> ${data.isrcCode || "TBD"}</p>
      <p><strong>Catalog Number:</strong> ${data.catalogNumber || "TBD"}</p>
      <p><strong>Release Date:</strong> ${data.releaseDate || "TBD"}</p>
    </div>

    <div class="section">
      <h2>Parties</h2>
      <p><strong>Collaborator:</strong> ${data.collaboratorName}</p>
      <p><strong>Email:</strong> ${data.collaboratorEmail || "N/A"}</p>
      <p><strong>Label:</strong> River and Ember, LLC</p>
    </div>

    <div class="section">
      <h2>Master Ownership</h2>
      <p>The Collaborator shall receive <strong>${((data.masterOwnership || 0) * 100).toFixed(2)}%</strong> of master ownership in the sound recording.</p>
    </div>

    <div class="section">
      <h2>Revenue Eligibility</h2>
      <p>The Collaborator is entitled to receive revenue from the following sources:</p>
      <ul>
        ${allowed.map(r => `<li>${r.name}: ${r.description}</li>`).join("")}
      </ul>
    </div>

    <div class="section">
      <h2>Excluded Revenue</h2>
      <p>The Collaborator is <strong>NOT</strong> entitled to receive revenue from:</p>
      <ul>
        ${disallowed.map(r => `<li>${r.name}: ${r.description}</li>`).join("")}
      </ul>
    </div>

    <div class="section">
      <h2>Publishing Rights</h2>
      <p>The Collaborator acknowledges that they have <strong>NO</strong> publishing ownership or rights in the underlying composition.</p>
    </div>

    <div class="section">
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <div class="signature-line"></div>
      <p>Collaborator Signature</p>
    </div>
  `
}

function generateSongwriterPublishingContract(
  data: ContractData,
  allowed: any[],
  disallowed: any[]
): string {
  return `
    <h1>Songwriter / Publishing Agreement</h1>
    
    <div class="section">
      <p><strong>Song:</strong> ${data.songTitle}</p>
      <p><strong>ISRC Code:</strong> ${data.isrcCode || "TBD"}</p>
      <p><strong>Catalog Number:</strong> ${data.catalogNumber || "TBD"}</p>
      <p><strong>Release Date:</strong> ${data.releaseDate || "TBD"}</p>
    </div>

    <div class="section">
      <h2>Parties</h2>
      <p><strong>Songwriter:</strong> ${data.collaboratorName}</p>
      <p><strong>Email:</strong> ${data.collaboratorEmail || "N/A"}</p>
      <p><strong>PRO Affiliation:</strong> ${data.proAffiliation || "N/A"}</p>
      <p><strong>IPI Number:</strong> ${data.ipiNumber || "N/A"}</p>
      <p><strong>Publisher:</strong> River and Ember, LLC</p>
    </div>

    <div class="section">
      <h2>Publishing Ownership</h2>
      <p>The Songwriter shall receive <strong>${((data.publishingOwnership || 0) * 100).toFixed(2)}%</strong> of publishing ownership in the composition.</p>
    </div>

    ${data.masterOwnership ? `
    <div class="section">
      <h2>Master Ownership</h2>
      <p>The Songwriter shall also receive <strong>${(data.masterOwnership * 100).toFixed(2)}%</strong> of master ownership in the sound recording.</p>
    </div>
    ` : ""}

    <div class="section">
      <h2>Revenue Eligibility</h2>
      <p>The Songwriter is entitled to receive revenue from:</p>
      <ul>
        ${allowed.map(r => `<li>${r.name}: ${r.description}</li>`).join("")}
      </ul>
    </div>

    <div class="section">
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <div class="signature-line"></div>
      <p>Songwriter Signature</p>
    </div>
  `
}

function generateProducerAgreement(
  data: ContractData,
  allowed: any[],
  disallowed: any[]
): string {
  return `
    <h1>Producer Agreement</h1>
    
    <div class="section">
      <p><strong>Song:</strong> ${data.songTitle}</p>
      <p><strong>ISRC Code:</strong> ${data.isrcCode || "TBD"}</p>
      <p><strong>Catalog Number:</strong> ${data.catalogNumber || "TBD"}</p>
      <p><strong>Release Date:</strong> ${data.releaseDate || "TBD"}</p>
    </div>

    <div class="section">
      <h2>Parties</h2>
      <p><strong>Producer:</strong> ${data.collaboratorName}</p>
      <p><strong>Email:</strong> ${data.collaboratorEmail || "N/A"}</p>
      <p><strong>Label:</strong> River and Ember, LLC</p>
    </div>

    <div class="section">
      <h2>Master Ownership</h2>
      <p>The Producer shall receive <strong>${((data.masterOwnership || 0) * 100).toFixed(2)}%</strong> of master ownership in the sound recording.</p>
    </div>

    <div class="section">
      <h2>Revenue Eligibility</h2>
      <p>The Producer is entitled to receive revenue from:</p>
      <ul>
        ${allowed.map(r => `<li>${r.name}: ${r.description}</li>`).join("")}
      </ul>
    </div>

    <div class="section">
      <h2>Excluded Revenue</h2>
      <p>The Producer is <strong>NOT</strong> entitled to receive revenue from:</p>
      <ul>
        ${disallowed.map(r => `<li>${r.name}: ${r.description}</li>`).join("")}
      </ul>
    </div>

    <div class="section">
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <div class="signature-line"></div>
      <p>Producer Signature</p>
    </div>
  `
}

function generateLabelRecord(data: ContractData): string {
  return `
    <h1>Internal Ownership Record</h1>
    
    <div class="section">
      <p><strong>Song:</strong> ${data.songTitle}</p>
      <p><strong>ISRC Code:</strong> ${data.isrcCode || "TBD"}</p>
      <p><strong>Catalog Number:</strong> ${data.catalogNumber || "TBD"}</p>
      <p><strong>Release Date:</strong> ${data.releaseDate || "TBD"}</p>
    </div>

    <div class="section">
      <h2>River & Ember Ownership</h2>
      <p><strong>Publishing Ownership:</strong> ${((data.publishingOwnership || 0) * 100).toFixed(2)}%</p>
      <p><strong>Master Ownership:</strong> ${((data.masterOwnership || 0) * 100).toFixed(2)}%</p>
    </div>

    <div class="section">
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p><em>Internal document - River & Ember</em></p>
    </div>
  `
}

