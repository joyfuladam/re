/**
 * Lightweight template engine for contract generation
 * Supports simple placeholder replacement, conditionals, and loops
 */

/**
 * Render a template string with data
 */
export function renderTemplate(template: string, data: Record<string, any>): string {
  let result = template

  // Process loops first (before conditionals and placeholders)
  result = processLoops(result, data)

  // Process conditionals
  result = processConditionals(result, data)

  // Replace placeholders
  result = replacePlaceholders(result, data)

  return result
}

/**
 * Replace simple placeholders like {{variable}} or {{object.property}}
 */
export function replacePlaceholders(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{([\w.]+)\}\}/g, (match, key) => {
    // Handle dot notation (e.g., "song.title")
    const value = key.includes('.') 
      ? key.split('.').reduce((obj: any, prop: string) => (obj ? obj[prop] : undefined), data)
      : data[key]
    
    if (value === null || value === undefined) {
      return ""
    }
    return String(value)
  })
}

/**
 * Process conditional blocks: {% if condition %}...{% else %}...{% endif %}
 * Handles nested conditionals by processing iteratively until no more conditionals remain
 */
export function processConditionals(template: string, data: Record<string, any>): string {
  let result = template
  let previousResult = ""
  let iterations = 0
  const maxIterations = 50 // Prevent infinite loops

  // Process conditionals iteratively to handle nesting
  while (result !== previousResult && iterations < maxIterations) {
    previousResult = result
    
    // Find the innermost conditional (one that doesn't contain another {% if %}
    // This regex matches {% if %}...{% endif %} blocks
    const ifRegex = /\{%\s*if\s+(\w+)\s*%\}((?:(?!\{%\s*if).)*?)(?:\{%\s*else\s*%\}((?:(?!\{%\s*if).)*?))?\{%\s*endif\s*%\}/gs
    
    result = result.replace(ifRegex, (match, condition, ifBlock, elseBlock = "") => {
      const conditionValue = data[condition]
      const isTruthy = conditionValue !== null && conditionValue !== undefined && conditionValue !== false && conditionValue !== 0 && conditionValue !== ""

      if (isTruthy) {
        return ifBlock.trim()
      } else {
        return (elseBlock || "").trim()
      }
    })
    
    iterations++
  }

  // Clean up any remaining conditional tags as a safety measure
  result = result.replace(/\{%\s*if\s+[\w]+\s*%\}/g, "")
  result = result.replace(/\{%\s*else\s*%\}/g, "")
  result = result.replace(/\{%\s*endif\s*%\}/g, "")

  return result
}

/**
 * Process loops: {% for item in array %}...{% endfor %}
 */
export function processLoops(template: string, data: Record<string, any>): string {
  const loopRegex = /\{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%\}(.*?)\{%\s*endfor\s*%\}/gs

  return template.replace(loopRegex, (match, itemVar, arrayVar, loopBody) => {
    const array = data[arrayVar]
    if (!Array.isArray(array) || array.length === 0) {
      return ""
    }

    return array
      .map((item) => {
        // Create a new data context with the loop item
        const loopData = { ...data, [itemVar]: item }
        // Process nested loops, conditionals, and placeholders in the loop body
        let processed = processLoops(loopBody, loopData)
        processed = processConditionals(processed, loopData)
        // Replace placeholders - handle both top-level and nested (itemVar.property) placeholders
        processed = replacePlaceholders(processed, loopData)
        // Trim trailing newlines to avoid gaps in tables
        return processed.replace(/\n+$/, '')
      })
      .join("")
  })
}

/**
 * Convert markdown to HTML for contract display
 */
export function markdownToHTML(markdown: string): string {
  let html = markdown

  // Convert headers
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>")
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>")
  html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>")

  // Convert bold
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")

  // Convert italic
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>")

  // Process markdown tables BEFORE paragraph conversion
  // Identify table blocks (lines starting with |, including separator rows)
  const lines = html.split('\n')
  const processedLines: string[] = []
  let inTable = false
  let tableRows: string[] = []
  let tableHeader: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()
    const isTableRow = /^\|.+?\|/.test(trimmedLine)
    const isSeparatorRow = /^\|[\s\-:]+\|/.test(trimmedLine)

    if (isTableRow && !isSeparatorRow) {
      // Regular table row
      if (!inTable) {
        inTable = true
        tableRows = []
        tableHeader = null
      }
      tableRows.push(trimmedLine)
    } else if (isSeparatorRow) {
      // Separator row - the previous row (if any) becomes the header
      if (tableRows.length > 0 && !tableHeader) {
        tableHeader = tableRows.pop() || null
      } else if (!inTable) {
        // Separator row without a header - treat as starting a new table
        inTable = true
        tableRows = []
        tableHeader = null
      }
    } else {
      // Not a table row - process any accumulated table
      if (inTable) {
        const tableHTML = buildHTMLTable(tableHeader, tableRows)
        processedLines.push(tableHTML)
        inTable = false
        tableRows = []
        tableHeader = null
      }
      processedLines.push(line)
    }
  }

  // Process any remaining table
  if (inTable) {
    const tableHTML = buildHTMLTable(tableHeader, tableRows)
    processedLines.push(tableHTML)
  }

  html = processedLines.join('\n')

  // Convert line breaks to paragraphs (but skip lines that are already HTML tags)
  html = html.split("\n\n").map((para) => {
    const trimmed = para.trim()
    if (trimmed === "") return ""
    if (trimmed.startsWith("<h") || trimmed.startsWith("<p>") || trimmed.startsWith("<table")) {
      return trimmed
    }
    return `<p>${trimmed}</p>`
  }).join("\n\n")

  // SignWell text tags must remain in the PDF text layer for detection
  // Format: [sig|req|recipient_1] for signatures, [date|req|recipient_1] for dates
  // Make them very small and nearly invisible but keep them in text layer for SignWell detection
  html = html.replace(/\[(sig|date)\|req\|([^\]]+)\]/g, (match) => {
    // Keep text tags in text layer but make them invisible
    // Use tiny font and transparent color so they're detectable but not visible
    return `<span style="font-size: 0.1px; color: transparent; line-height: 0; display: inline;">${match}</span>`
  })

  return html
}

/**
 * Build HTML table from markdown table rows
 */
function buildHTMLTable(headerRow: string | null, bodyRows: string[]): string {
  if (bodyRows.length === 0 && !headerRow) {
    return ""
  }

  let tableHTML = '<table class="contract-table">'
  
  // Process header row if present
  if (headerRow) {
    const headerCells = headerRow.split('|').slice(1, -1).map((cell: string) => cell.trim())
    tableHTML += '<thead><tr>'
    tableHTML += headerCells.map((cell: string) => `<th>${cell}</th>`).join('')
    tableHTML += '</tr></thead>'
  }

  // Process body rows
  if (bodyRows.length > 0) {
    tableHTML += '<tbody>'
    bodyRows.forEach((row) => {
      const cells = row.split('|').slice(1, -1).map((cell: string) => cell.trim())
      tableHTML += '<tr>'
      tableHTML += cells.map((cell: string) => `<td>${cell}</td>`).join('')
      tableHTML += '</tr>'
    })
    tableHTML += '</tbody>'
  }

  tableHTML += '</table>'
  return tableHTML
}

