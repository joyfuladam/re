import { ContractType } from "@prisma/client"
import { readFileSync } from "fs"
import { join } from "path"
import { renderTemplate, markdownToHTML } from "./template-engine"

/**
 * Template registry mapping contract types to template files
 */
const TEMPLATE_PATHS: Record<ContractType, string> = {
  songwriter_publishing: "templates/contracts/publishing-assignment.md",
  digital_master_only: "templates/contracts/master-revenue-share.md",
  producer_agreement: "", // Keep using existing HTML generation for now
  label_record: "", // Keep using existing HTML generation for now
}

/**
 * Load a template file from disk
 */
function loadTemplate(templatePath: string): string {
  if (!templatePath) {
    throw new Error(`Template path is empty`)
  }
  
  const fullPath = join(process.cwd(), templatePath)
  try {
    return readFileSync(fullPath, "utf-8")
  } catch (error) {
    throw new Error(`Failed to load template from ${fullPath}: ${error}`)
  }
}

/**
 * Check if a contract type has a template file
 */
export function hasTemplate(contractType: ContractType): boolean {
  const templatePath = TEMPLATE_PATHS[contractType]
  return !!templatePath && templatePath.trim() !== ""
}

/**
 * Get the template path for a contract type
 */
export function getTemplatePath(contractType: ContractType): string | null {
  const templatePath = TEMPLATE_PATHS[contractType]
  return templatePath && templatePath.trim() !== "" ? templatePath : null
}

/**
 * Render a contract template with data
 */
export function renderContractTemplate(
  contractType: ContractType,
  data: Record<string, any>
): string {
  const templatePath = TEMPLATE_PATHS[contractType]
  
  if (!templatePath || templatePath.trim() === "") {
    throw new Error(`No template available for contract type: ${contractType}`)
  }

  const template = loadTemplate(templatePath)
  const rendered = renderTemplate(template, data)
  let html = markdownToHTML(rendered)
  
  // Hide HelloSign text tags after markdown conversion
  // Match HelloSign text tags: [field|req|signerN] or [field|req|signerN|label|id]
  const textTagRegex = /\[([a-z_]+)\|([a-z]+)\|([a-z0-9]+)(?:\|([^\]]+))?\]/gi
  html = html.replace(textTagRegex, (match) => {
    // Wrap the text tag in a span with white color to make it invisible
    return `<span style="color: white; background: white;">${match}</span>`
  })

  return html
}

/**
 * Get template content for a contract type (for preview/editing)
 */
export function getTemplateContent(contractType: ContractType): string | null {
  const templatePath = TEMPLATE_PATHS[contractType]
  if (!templatePath || templatePath.trim() === "") {
    return null
  }

  try {
    return loadTemplate(templatePath)
  } catch {
    return null
  }
}

